#include "Filter.h"
#include "../logging.h"

extern "C"
{
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersrc.h>
#include <libavfilter/buffersink.h>
#include <libavutil/opt.h>
#include <libavutil/pixdesc.h>
#include <libavutil/channel_layout.h>
}

namespace playback
{
  // Frame deleter function for unique_ptr
  static void frameDeleter(AVFrame *frame)
  {
    if (frame)
    {
      av_frame_free(&frame);
    }
  }

  Filter::Filter(const FilterOptions &options)
      : options_(options)
  {
  }

  Filter::~Filter()
  {
    dispose();
  }

  bool Filter::initialize()
  {
    if (disposed_)
    {
      log_error("Cannot initialize disposed Filter");
      return false;
    }

    if (options_.mediaType == AVMEDIA_TYPE_UNKNOWN)
    {
      log_error("Media type must be specified");
      return false;
    }

    if (options_.filterDescription.empty())
    {
      log_error("Filter description must be provided");
      return false;
    }

    log_trace("Initializing Filter for " + std::string(options_.mediaType == AVMEDIA_TYPE_VIDEO ? "video" : "audio"));
    log_trace("Filter description: " + options_.filterDescription);

    // Create filter graph
    if (!createFilterGraph())
    {
      cleanup();
      return false;
    }

    // Allocate temporary frame
    tempFrame_ = av_frame_alloc();
    if (!tempFrame_)
    {
      log_error("Failed to allocate temporary frame");
      cleanup();
      return false;
    }

    // IMPLEMENTATION GUIDELINES: Initialize audio frame buffer for AAC compatibility
    if (options_.mediaType == AVMEDIA_TYPE_AUDIO && options_.enableAudioFrameBuffering)
    {
      audioFrameBuffer_ = std::make_unique<AudioFrameBuffer>(
        options_.targetAudioFrameSize,
        options_.outputChannels > 0 ? options_.outputChannels : options_.inputChannels,
        options_.outputSampleFormat != AV_SAMPLE_FMT_NONE ? options_.outputSampleFormat : options_.inputSampleFormat,
        options_.outputSampleRate > 0 ? options_.outputSampleRate : options_.inputSampleRate
      );
      log_trace("Audio frame buffering enabled with target frame size: " + std::to_string(options_.targetAudioFrameSize));
    }

    log_trace("Filter initialized successfully");
    return true;
  }

  bool Filter::createFilterGraph()
  {
    filterGraph_ = avfilter_graph_alloc();
    if (!filterGraph_)
    {
      log_error("Failed to allocate filter graph");
      return false;
    }

    if (options_.mediaType == AVMEDIA_TYPE_VIDEO)
    {
      return createVideoFilterGraph();
    }
    else if (options_.mediaType == AVMEDIA_TYPE_AUDIO)
    {
      return createAudioFilterGraph();
    }
    else
    {
      log_error("Unsupported media type");
      return false;
    }
  }

  bool Filter::createVideoFilterGraph()
  {
    const AVFilter *bufferSrc = avfilter_get_by_name("buffer");
    const AVFilter *bufferSink = avfilter_get_by_name("buffersink");

    if (!setupFilterComponents(bufferSrc, bufferSink))
    {
      return false;
    }

    // Create buffer source with video parameters
    char args[512];
    snprintf(args, sizeof(args),
             "video_size=%dx%d:pix_fmt=%d:time_base=%d/%d:pixel_aspect=1/1",
             options_.inputWidth, options_.inputHeight, options_.inputPixelFormat,
             options_.inputTimeBase.num, options_.inputTimeBase.den);

    if (!createBufferSource(bufferSrc, args))
    {
      return false;
    }

    if (!createBufferSink(bufferSink))
    {
      return false;
    }

    // Set output pixel format if specified
    if (options_.outputPixelFormat != AV_PIX_FMT_NONE)
    {
      AVPixelFormat pix_fmts[] = {options_.outputPixelFormat, AV_PIX_FMT_NONE};
      int ret = av_opt_set_int_list(bufferSinkContext_, "pix_fmts", pix_fmts,
                                    AV_PIX_FMT_NONE, AV_OPT_SEARCH_CHILDREN);
      if (ret < 0)
      {
        log_warn("Failed to set output pixel format");
      }
    }

    if (!parseAndConfigureGraph())
    {
      return false;
    }

    log_trace("Video filter graph created successfully");
    return true;
  }

  bool Filter::createAudioFilterGraph()
  {
    const AVFilter *bufferSrc = avfilter_get_by_name("abuffer");
    const AVFilter *bufferSink = avfilter_get_by_name("abuffersink");

    if (!setupFilterComponents(bufferSrc, bufferSink))
    {
      return false;
    }

    // Create buffer source with audio parameters
    char args[512];
    snprintf(args, sizeof(args),
             "time_base=%d/%d:sample_rate=%d:sample_fmt=%s:channel_layout=0x%" PRIx64,
             options_.inputTimeBase.num, options_.inputTimeBase.den,
             options_.inputSampleRate,
             av_get_sample_fmt_name(options_.inputSampleFormat),
             (options_.inputChannels == 1) ? AV_CH_LAYOUT_MONO :
             (options_.inputChannels == 2) ? AV_CH_LAYOUT_STEREO :
             (options_.inputChannels == 6) ? AV_CH_LAYOUT_5POINT1 :
             (options_.inputChannels == 8) ? AV_CH_LAYOUT_7POINT1 :
             AV_CH_LAYOUT_STEREO);

    if (!createBufferSource(bufferSrc, args))
    {
      return false;
    }

    if (!createBufferSink(bufferSink))
    {
      return false;
    }

    // Set output audio parameters if specified
    if (!configureAudioOutputParameters())
    {
      return false;
    }

    if (!parseAndConfigureGraph())
    {
      return false;
    }

    log_trace("Audio filter graph created successfully");
    return true;
  }

  bool Filter::setupFilterComponents(const AVFilter *bufferSrc, const AVFilter *bufferSink)
  {
    outputs_ = avfilter_inout_alloc();
    inputs_ = avfilter_inout_alloc();

    if (!bufferSrc || !bufferSink || !outputs_ || !inputs_)
    {
      log_error("Failed to get filter components");
      cleanupFilterInOuts();
      return false;
    }

    return true;
  }

  bool Filter::createBufferSource(const AVFilter *bufferSrc, const char *args)
  {
    int ret = avfilter_graph_create_filter(&bufferSrcContext_, bufferSrc, "in",
                                           args, nullptr, filterGraph_);
    if (ret < 0)
    {
      log_error("Failed to create buffer source: " + av_error_to_string(ret));
      cleanupFilterInOuts();
      return false;
    }

    return true;
  }

  bool Filter::createBufferSink(const AVFilter *bufferSink)
  {
    int ret = avfilter_graph_create_filter(&bufferSinkContext_, bufferSink, "out",
                                           nullptr, nullptr, filterGraph_);
    if (ret < 0)
    {
      log_error("Failed to create buffer sink: " + av_error_to_string(ret));
      cleanupFilterInOuts();
      return false;
    }

    return true;
  }

  bool Filter::configureAudioOutputParameters()
  {
    // Set output sample format if specified
    if (options_.outputSampleFormat != AV_SAMPLE_FMT_NONE)
    {
      AVSampleFormat sample_fmts[] = {options_.outputSampleFormat, AV_SAMPLE_FMT_NONE};
      int ret = av_opt_set_int_list(bufferSinkContext_, "sample_fmts", sample_fmts,
                                    AV_SAMPLE_FMT_NONE, AV_OPT_SEARCH_CHILDREN);
      if (ret < 0)
      {
        log_warn("Failed to set output sample format");
      }
    }

    // Set output sample rate if specified
    if (options_.outputSampleRate > 0)
    {
      int sample_rates[] = {options_.outputSampleRate, -1};
      int ret = av_opt_set_int_list(bufferSinkContext_, "sample_rates", sample_rates,
                                    -1, AV_OPT_SEARCH_CHILDREN);
      if (ret < 0)
      {
        log_warn("Failed to set output sample rate");
      }
    }

    // Set output channel layout using modern API
    if (options_.outputChannels > 0)
    {
      AVChannelLayout layout;
      if (options_.outputChannels == 1) {
        av_channel_layout_from_mask(&layout, AV_CH_LAYOUT_MONO);
      } else if (options_.outputChannels == 2) {
        av_channel_layout_from_mask(&layout, AV_CH_LAYOUT_STEREO);
      } else if (options_.outputChannels == 6) {
        av_channel_layout_from_mask(&layout, AV_CH_LAYOUT_5POINT1);
      } else if (options_.outputChannels == 8) {
        av_channel_layout_from_mask(&layout, AV_CH_LAYOUT_7POINT1);
      } else {
        av_channel_layout_default(&layout, options_.outputChannels);
      }

      // Convert to string representation for the filter
      char layout_str[64];
      int ret = av_channel_layout_describe(&layout, layout_str, sizeof(layout_str));
      if (ret > 0) {
        ret = av_opt_set(bufferSinkContext_, "ch_layouts", layout_str, AV_OPT_SEARCH_CHILDREN);
        if (ret < 0) {
          log_warn("Failed to set output channel layout: " + av_error_to_string(ret));
        }
      } else {
        log_warn("Failed to describe channel layout");
      }

      av_channel_layout_uninit(&layout);
    }

    return true;
  }

  bool Filter::parseAndConfigureGraph()
  {
    // Set up input/output connections
    outputs_->name = av_strdup("in");
    outputs_->filter_ctx = bufferSrcContext_;
    outputs_->pad_idx = 0;
    outputs_->next = nullptr;

    inputs_->name = av_strdup("out");
    inputs_->filter_ctx = bufferSinkContext_;
    inputs_->pad_idx = 0;
    inputs_->next = nullptr;

    // Parse and configure the filter graph
    int ret = avfilter_graph_parse_ptr(filterGraph_, options_.filterDescription.c_str(),
                                       &inputs_, &outputs_, nullptr);
    if (ret < 0)
    {
      log_error("Failed to parse filter graph: " + av_error_to_string(ret));
      cleanupFilterInOuts();
      return false;
    }

    // Configure the filter graph
    ret = avfilter_graph_config(filterGraph_, nullptr);
    if (ret < 0)
    {
      log_error("Failed to configure filter graph: " + av_error_to_string(ret));
      cleanupFilterInOuts();
      return false;
    }

    cleanupFilterInOuts();
    return true;
  }

  void Filter::cleanupFilterInOuts()
  {
    if (inputs_)
    {
      avfilter_inout_free(&inputs_);
      inputs_ = nullptr;
    }
    if (outputs_)
    {
      avfilter_inout_free(&outputs_);
      outputs_ = nullptr;
    }
  }

  bool Filter::filter(const AVFrame *inputFrame, std::vector<FilteredFrameInfo> &outputFrames)
  {
    if (disposed_ || !filterGraph_)
    {
      log_error("Cannot filter with disposed or uninitialized Filter");
      return false;
    }

    outputFrames.clear();

    if (!inputFrame)
    {
      log_warn("Input frame is null");
      return false;
    }

    // Send frame to filter and receive filtered frames
    return sendFrameAndReceiveResults(inputFrame, outputFrames);
  }

  bool Filter::filterFrame(uintptr_t inputFramePtr, std::vector<FilteredFrameInfo> &outputFrames)
  {
    if (disposed_ || !filterGraph_)
    {
      log_error("Cannot filter with disposed or uninitialized Filter");
      return false;
    }

    outputFrames.clear();

    if (inputFramePtr == 0)
    {
      log_warn("Invalid input frame pointer");
      return false;
    }

    // Get frame from pointer
    AVFrame *inputFrame = reinterpret_cast<AVFrame *>(inputFramePtr);
    if (!inputFrame)
    {
      log_error("Failed to get frame from pointer: " + std::to_string(inputFramePtr));
      return false;
    }

    log_trace("Filtering frame pointer " + std::to_string(inputFramePtr) +
             " (" + std::to_string(inputFrame->width) + "x" + std::to_string(inputFrame->height) + ")" +
             " with PTS: " + std::to_string(inputFrame->pts));

    // Send frame to filter and receive filtered frames
    bool success = sendFrameAndReceiveResults(inputFrame, outputFrames);

    if (success)
    {
      log_trace("Filter produced " + std::to_string(outputFrames.size()) + " output frames");
    }

    return success;
  }

  bool Filter::sendFrameAndReceiveResults(const AVFrame *inputFrame, std::vector<FilteredFrameInfo> &outputFrames)
  {
    // Send frame to filter
    int ret = av_buffersrc_add_frame_flags(bufferSrcContext_, const_cast<AVFrame *>(inputFrame), AV_BUFFERSRC_FLAG_KEEP_REF);
    if (ret < 0)
    {
      log_error("Failed to send frame to filter: " + av_error_to_string(ret));
      return false;
    }

    // Receive filtered frames
    return receiveFilteredFrames(outputFrames);
  }

  bool Filter::receiveFilteredFrames(std::vector<FilteredFrameInfo> &outputFrames)
  {
    while (true)
    {
      int ret = av_buffersink_get_frame(bufferSinkContext_, tempFrame_);
      if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF)
      {
        // No more frames available
        break;
      }
      else if (ret < 0)
      {
        log_error("Failed to get filtered frame: " + av_error_to_string(ret));
        break;
      }

      // IMPLEMENTATION GUIDELINES: Use audio frame buffering for AAC compatibility
      if (options_.mediaType == AVMEDIA_TYPE_AUDIO && audioFrameBuffer_)
      {
        if (!processAudioFrameWithBuffering(tempFrame_, outputFrames))
        {
          log_error("Failed to process audio frame with buffering");
          av_frame_unref(tempFrame_);
          return false;
        }
      }
      else
      {
        // Direct processing for video or non-buffered audio
        FilteredFrameInfo frameInfo;
        extractFilteredFrameInfo(tempFrame_, frameInfo);
        outputFrames.push_back(frameInfo);
      }

      // Unref the frame for reuse
      av_frame_unref(tempFrame_);
    }

    return true;
  }

  bool Filter::flush(std::vector<FilteredFrameInfo> &outputFrames)
  {
    if (disposed_ || !filterGraph_)
    {
      log_error("Cannot flush disposed or uninitialized Filter");
      return false;
    }

    log_trace("Flushing filter");

    // Send null frame to signal end of stream
    bool success = filter(nullptr, outputFrames);

    // IMPLEMENTATION GUIDELINES: Flush audio frame buffer for any remaining samples
    if (success && options_.mediaType == AVMEDIA_TYPE_AUDIO && audioFrameBuffer_)
    {
      success = flushAudioFrameBuffer(outputFrames);
    }

    return success;
  }

  void Filter::extractFilteredFrameInfo(const AVFrame *frame, FilteredFrameInfo &frameInfo)
  {
    frameInfo.pts = frame->pts;
    frameInfo.dts = frame->pkt_dts;
    frameInfo.format = frame->format;
    frameInfo.mediaType = options_.mediaType;

    // Create a copy of the frame and store it in this filter's frame map
    frameInfo.framePtr = createAndStoreFrameCopy(frame);
    frameInfo.sourceFrame = getFrame(frameInfo.framePtr);

    if (options_.mediaType == AVMEDIA_TYPE_VIDEO)
    {
      frameInfo.width = frame->width;
      frameInfo.height = frame->height;
      frameInfo.pixelFormat = static_cast<AVPixelFormat>(frame->format);

      // Copy plane data pointers and line sizes
      for (int i = 0; i < AV_NUM_DATA_POINTERS && frame->data[i]; ++i)
      {
        frameInfo.data.push_back(frame->data[i]);
        frameInfo.linesize.push_back(frame->linesize[i]);
      }

      log_trace("Filtered video frame: " + std::to_string(frameInfo.width) + "x" + std::to_string(frameInfo.height) +
                ", format=" + std::to_string(frameInfo.format) + ", pts=" + std::to_string(frameInfo.pts) +
                ", framePtr=" + std::to_string(frameInfo.framePtr));
    }
    else if (options_.mediaType == AVMEDIA_TYPE_AUDIO)
    {
      frameInfo.channels = frame->ch_layout.nb_channels;
      frameInfo.sampleRate = frame->sample_rate;
      frameInfo.samplesPerChannel = frame->nb_samples;
      frameInfo.sampleFormat = static_cast<AVSampleFormat>(frame->format);

      // Copy plane data pointers and line sizes
      for (int i = 0; i < AV_NUM_DATA_POINTERS && frame->data[i]; ++i)
      {
        frameInfo.data.push_back(frame->data[i]);
        frameInfo.linesize.push_back(frame->linesize[i]);
      }

      log_trace("Filtered audio frame: " + std::to_string(frameInfo.channels) + " channels, " +
                std::to_string(frameInfo.sampleRate) + " Hz, " + std::to_string(frameInfo.samplesPerChannel) + " samples, " +
                "format=" + std::to_string(frameInfo.format) + ", pts=" + std::to_string(frameInfo.pts) +
                ", framePtr=" + std::to_string(frameInfo.framePtr));
    }
  }

  void Filter::dispose()
  {
    if (disposed_)
    {
      return;
    }

    log_trace("Disposing Filter");
    cleanup();
    disposed_ = true;
  }

  uintptr_t Filter::createAndStoreFrameCopy(const AVFrame *frame)
  {
    AVFrame *frameCopy = av_frame_alloc();
    if (!frameCopy || av_frame_ref(frameCopy, frame) != 0)
    {
      log_error("Failed to create frame copy");
      if (frameCopy)
      {
        av_frame_free(&frameCopy);
      }
      return 0;
    }

    // Store frame with automatic cleanup
    uintptr_t framePtr = reinterpret_cast<uintptr_t>(frameCopy);
    frames_.emplace(framePtr, std::unique_ptr<AVFrame, FrameDeleter>(frameCopy, frameDeleter));

    log_trace("Stored filtered frame in pool with pointer: " + std::to_string(framePtr));
    return framePtr;
  }

  AVFrame *Filter::getFrame(uintptr_t framePtr)
  {
    auto it = frames_.find(framePtr);
    if (it != frames_.end())
    {
      return it->second.get();
    }
    return nullptr;
  }

  void Filter::cleanup()
  {
    if (filterGraph_)
    {
      avfilter_graph_free(&filterGraph_);
      filterGraph_ = nullptr;
    }

    // Context pointers are freed by avfilter_graph_free
    bufferSrcContext_ = nullptr;
    bufferSinkContext_ = nullptr;

    if (tempFrame_)
    {
      av_frame_free(&tempFrame_);
      tempFrame_ = nullptr;
    }

    // Clear all stored frames
    frames_.clear();
  }

  // IMPLEMENTATION GUIDELINES: AudioFrameBuffer implementation for AAC compatibility
  AudioFrameBuffer::AudioFrameBuffer(int targetSamples, int channels, AVSampleFormat format, int sampleRate)
    : targetSamples_(targetSamples), channels_(channels), format_(format), sampleRate_(sampleRate),
      bufferedSamples_(0), nextOutputPts_(0), ptsInitialized_(false)
  {
    bytesPerSample_ = getBytesPerSample(format);
    // Pre-allocate buffer for efficiency - enough for several target frames
    sampleBuffer_.reserve(targetSamples_ * channels_ * bytesPerSample_ * 4);
  }

  AudioFrameBuffer::~AudioFrameBuffer() = default;

  int AudioFrameBuffer::getBytesPerSample(AVSampleFormat format) const
  {
    switch (format) {
      case AV_SAMPLE_FMT_U8:
      case AV_SAMPLE_FMT_U8P:
        return 1;
      case AV_SAMPLE_FMT_S16:
      case AV_SAMPLE_FMT_S16P:
        return 2;
      case AV_SAMPLE_FMT_S32:
      case AV_SAMPLE_FMT_S32P:
      case AV_SAMPLE_FMT_FLT:
      case AV_SAMPLE_FMT_FLTP:
        return 4;
      case AV_SAMPLE_FMT_DBL:
      case AV_SAMPLE_FMT_DBLP:
        return 8;
      default:
        return 4; // Default to 4 bytes (float)
    }
  }

  bool AudioFrameBuffer::addFrame(const AVFrame* inputFrame, std::vector<AVFrame*>& outputFrames)
  {
    if (!inputFrame || inputFrame->nb_samples <= 0) {
      return false;
    }

    // Initialize PTS tracking on first frame
    if (!ptsInitialized_) {
      nextOutputPts_ = inputFrame->pts;
      ptsInitialized_ = true;
    }

    // Calculate input data size
    int inputSamples = inputFrame->nb_samples;
    int inputDataSize = inputSamples * channels_ * bytesPerSample_;

    // Ensure buffer has enough space
    sampleBuffer_.resize(sampleBuffer_.size() + inputDataSize);

    // Copy input data to buffer
    if (av_sample_fmt_is_planar(format_)) {
      // Planar format: interleave the data
      for (int sample = 0; sample < inputSamples; sample++) {
        for (int ch = 0; ch < channels_; ch++) {
          uint8_t* src = inputFrame->data[ch] + sample * bytesPerSample_;
          uint8_t* dst = sampleBuffer_.data() + (bufferedSamples_ + sample) * channels_ * bytesPerSample_ + ch * bytesPerSample_;
          std::memcpy(dst, src, bytesPerSample_);
        }
      }
    } else {
      // Packed format: direct copy
      uint8_t* dst = sampleBuffer_.data() + bufferedSamples_ * channels_ * bytesPerSample_;
      std::memcpy(dst, inputFrame->data[0], inputDataSize);
    }

    bufferedSamples_ += inputSamples;

    // Generate output frames while we have enough samples
    while (bufferedSamples_ >= targetSamples_) {
      AVFrame* outputFrame = createOutputFrame(targetSamples_, nextOutputPts_);
      if (!outputFrame) {
        return false;
      }

      copyAndAdvanceBuffer(outputFrame, targetSamples_);
      outputFrames.push_back(outputFrame);

      // Update PTS for next frame (PTS increment = samples / sample_rate * timebase)
      // For audio, timebase is typically 1/sample_rate
      nextOutputPts_ += targetSamples_;
    }

    return true;
  }

  bool AudioFrameBuffer::flush(std::vector<AVFrame*>& outputFrames)
  {
    if (bufferedSamples_ > 0) {
      // Create final frame with remaining samples
      AVFrame* outputFrame = createOutputFrame(bufferedSamples_, nextOutputPts_);
      if (!outputFrame) {
        return false;
      }

      copyAndAdvanceBuffer(outputFrame, bufferedSamples_);
      outputFrames.push_back(outputFrame);
    }

    return true;
  }

  AVFrame* AudioFrameBuffer::createOutputFrame(int numSamples, int64_t pts) const
  {
    AVFrame* frame = av_frame_alloc();
    if (!frame) {
      return nullptr;
    }

    frame->nb_samples = numSamples;
    frame->format = format_;
    frame->sample_rate = sampleRate_;
    frame->pts = pts;

    // Set channel layout
    if (channels_ == 1) {
      av_channel_layout_from_mask(&frame->ch_layout, AV_CH_LAYOUT_MONO);
    } else if (channels_ == 2) {
      av_channel_layout_from_mask(&frame->ch_layout, AV_CH_LAYOUT_STEREO);
    } else {
      av_channel_layout_default(&frame->ch_layout, channels_);
    }

    // Allocate frame data
    if (av_frame_get_buffer(frame, 0) < 0) {
      av_frame_free(&frame);
      return nullptr;
    }

    return frame;
  }

  void AudioFrameBuffer::copyAndAdvanceBuffer(AVFrame* outputFrame, int samplesToCopy)
  {
    int dataSize = samplesToCopy * channels_ * bytesPerSample_;

    if (av_sample_fmt_is_planar(format_)) {
      // Planar format: de-interleave the data
      for (int sample = 0; sample < samplesToCopy; sample++) {
        for (int ch = 0; ch < channels_; ch++) {
          uint8_t* src = sampleBuffer_.data() + sample * channels_ * bytesPerSample_ + ch * bytesPerSample_;
          uint8_t* dst = outputFrame->data[ch] + sample * bytesPerSample_;
          std::memcpy(dst, src, bytesPerSample_);
        }
      }
    } else {
      // Packed format: direct copy
      std::memcpy(outputFrame->data[0], sampleBuffer_.data(), dataSize);
    }

    // Remove copied data from buffer
    bufferedSamples_ -= samplesToCopy;
    if (bufferedSamples_ > 0) {
      std::memmove(sampleBuffer_.data(), sampleBuffer_.data() + dataSize, 
                   bufferedSamples_ * channels_ * bytesPerSample_);
    }
    sampleBuffer_.resize(bufferedSamples_ * channels_ * bytesPerSample_);
  }

  // IMPLEMENTATION GUIDELINES: Audio buffering helper methods for AAC compatibility
  bool Filter::processAudioFrameWithBuffering(const AVFrame *frame, std::vector<FilteredFrameInfo> &outputFrames)
  {
    if (!audioFrameBuffer_) {
      return false;
    }

    std::vector<AVFrame*> bufferedFrames;
    if (!audioFrameBuffer_->addFrame(frame, bufferedFrames)) {
      return false;
    }

    // Convert buffered frames to FilteredFrameInfo
    for (AVFrame* bufferedFrame : bufferedFrames) {
      FilteredFrameInfo frameInfo;
      extractFilteredFrameInfo(bufferedFrame, frameInfo);
      outputFrames.push_back(frameInfo);
      
      // The frame is now owned by the frames_ map via extractFilteredFrameInfo
      // Don't free it here
    }

    return true;
  }

  bool Filter::flushAudioFrameBuffer(std::vector<FilteredFrameInfo> &outputFrames)
  {
    if (!audioFrameBuffer_) {
      return true; // No buffering enabled, nothing to flush
    }

    std::vector<AVFrame*> bufferedFrames;
    if (!audioFrameBuffer_->flush(bufferedFrames)) {
      return false;
    }

    // Convert buffered frames to FilteredFrameInfo
    for (AVFrame* bufferedFrame : bufferedFrames) {
      FilteredFrameInfo frameInfo;
      extractFilteredFrameInfo(bufferedFrame, frameInfo);
      outputFrames.push_back(frameInfo);
      
      // The frame is now owned by the frames_ map via extractFilteredFrameInfo
      // Don't free it here
    }

    return true;
  }
} // namespace playback