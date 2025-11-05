#include "Decoder.h"
#include "../logging.h"

extern "C"
{
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
#include <libavutil/error.h>
#include <libavutil/channel_layout.h>
}

namespace playback
{
  // Frame deleter function for unique_ptr
  static void frameDeleter(AVFrame *frame)
  {
    av_frame_free(&frame);
  }

  Decoder::Decoder(const DecoderOptions &options)
      : options_(options)
  {
  }

  Decoder::~Decoder()
  {
    dispose();
  }

  bool Decoder::initialize()
  {
    if (disposed_)
    {
      log_error("Cannot initialize disposed Decoder");
      return false;
    }

    if (options_.codecId == AV_CODEC_ID_NONE)
    {
      log_error("No codec ID specified");
      return false;
    }

    log_trace("Initializing Decoder for codec: " + std::to_string(static_cast<int>(options_.codecId)));

    // Find and open the codec
    if (!findAndOpenCodec())
    {
      cleanup();
      return false;
    }

    // Allocate reusable frame
    frame_ = av_frame_alloc();
    if (!frame_)
    {
      log_error("Failed to allocate frame");
      cleanup();
      return false;
    }

    // Reset PTS tracking for fresh start
    next_pts_ = 0;

    log_trace("Decoder initialized successfully");
    log_trace("Codec: " + codecName());

    return true;
  }

  bool Decoder::findAndOpenCodec()
  {
    // Find the decoder
    codec_ = avcodec_find_decoder(options_.codecId);
    if (!codec_)
    {
      log_error("Failed to find decoder for codec ID: " + std::to_string(static_cast<int>(options_.codecId)));
      return false;
    }

    // Allocate codec context
    codecContext_ = avcodec_alloc_context3(codec_);
    if (!codecContext_)
    {
      log_error("Failed to allocate codec context");
      return false;
    }

    // Set codec parameters if provided
    if (options_.width > 0 && options_.height > 0)
    {
      codecContext_->width = options_.width;
      codecContext_->height = options_.height;
    }

    if (options_.pixelFormat != AV_PIX_FMT_NONE)
    {
      codecContext_->pix_fmt = options_.pixelFormat;
    }

    if (options_.channels > 0)
    {
      codecContext_->ch_layout.nb_channels = options_.channels;
    }

    if (options_.sampleRate > 0)
    {
      codecContext_->sample_rate = options_.sampleRate;
    }

    if (options_.sampleFormat != AV_SAMPLE_FMT_NONE)
    {
      codecContext_->sample_fmt = options_.sampleFormat;
    }

    // Set extradata if provided
    if (!options_.extradata.empty())
    {
      codecContext_->extradata = static_cast<uint8_t *>(av_malloc(options_.extradata.size() + AV_INPUT_BUFFER_PADDING_SIZE));
      if (!codecContext_->extradata)
      {
        log_error("Failed to allocate extradata");
        return false;
      }
      memcpy(codecContext_->extradata, options_.extradata.data(), options_.extradata.size());
      memset(codecContext_->extradata + options_.extradata.size(), 0, AV_INPUT_BUFFER_PADDING_SIZE);
      codecContext_->extradata_size = static_cast<int>(options_.extradata.size());
    }

    // Set appropriate timebase for the decoder
    // This is critical for proper timestamp handling
    if (options_.timeBase.den > 0)
    {
      // Use provided source stream timebase to preserve timestamp fidelity
      codecContext_->time_base = options_.timeBase;
    }
    
    if (options_.mediaType == AVMEDIA_TYPE_AUDIO)
    {
      // For audio, use sample rate as timebase denominator
      codecContext_->time_base = {1, options_.sampleRate > 0 ? options_.sampleRate : 48000};
    }
    else if (options_.mediaType == AVMEDIA_TYPE_VIDEO)
    {
      // For video, use a standard high-resolution timebase
      codecContext_->time_base = {1, 90000}; // Common video timebase
    }
    else
    {
      // Fallback timebase
      codecContext_->time_base = {1, 1000000}; // Microseconds
    }

    // Open the codec
    int ret = avcodec_open2(codecContext_, codec_, nullptr);
    if (ret < 0)
    {
      log_error("Failed to open codec: " + av_error_to_string(ret));
      return false;
    }

    // Re-apply timebase after codec open (FFmpeg may have overridden it)
    if (options_.timeBase.den > 0)
    {
      codecContext_->time_base = options_.timeBase;
    }

    return true;
  }

  bool Decoder::decode(const AVPacket *packet, std::vector<FrameInfo> &frames)
  {
    if (disposed_ || !codecContext_)
    {
      log_error("Cannot decode with disposed or uninitialized Decoder");
      return false;
    }

    frames.clear();

    // Send packet to decoder
    int ret = avcodec_send_packet(codecContext_, packet);
    if (ret < 0 && ret != AVERROR(EAGAIN))
    {
      log_warn("Failed to send packet to decoder: " + av_error_to_string(ret));
      return false;
    }

    // Receive frames from decoder
    while (true)
    {
      ret = avcodec_receive_frame(codecContext_, frame_);
      if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF)
      {
        // No more frames available right now
        break;
      }
      else if (ret < 0)
      {
        log_warn("Failed to receive frame from decoder: " + av_error_to_string(ret));
        break;
      }

      // Extract frame information
      FrameInfo frameInfo;
      extractFrameInfo(frame_, frameInfo);
      frames.push_back(frameInfo);

      // Unref the frame for reuse
      av_frame_unref(frame_);
    }

    return true;
  }

  bool Decoder::flush(std::vector<FrameInfo> &frames)
  {
    if (disposed_ || !codecContext_)
    {
      log_error("Cannot flush disposed or uninitialized Decoder");
      return false;
    }

    // Send null packet to signal end of stream
    return decode(nullptr, frames);
  }

  void Decoder::extractFrameInfo(const AVFrame *frame, FrameInfo &frameInfo)
  {
    // Determine and set frame timing
    frameInfo.pts = determineBestPts(frame);
    frameInfo.dts = frame->pkt_dts;
    frameInfo.format = frame->format;
    frameInfo.mediaType = codecContext_->codec_type;

    // Create frame copy and store in this decoder's frame map
    frameInfo.framePtr = createAndStoreFrameCopy(frame, frameInfo.pts);
    frameInfo.sourceFrame = getFrame(frameInfo.framePtr);

    // Extract media-specific properties
    if (codecContext_->codec_type == AVMEDIA_TYPE_VIDEO)
    {
      extractVideoProperties(frameInfo.sourceFrame, frameInfo);
    }
    else if (codecContext_->codec_type == AVMEDIA_TYPE_AUDIO)
    {
      extractAudioProperties(frameInfo.sourceFrame, frameInfo);
    }

    // Update PTS tracking for next frame
    updatePtsTracking(frameInfo.pts);
  }

  int64_t Decoder::determineBestPts(const AVFrame *frame)
  {
    // Use best_effort_timestamp if available and valid
    if (frame->best_effort_timestamp != AV_NOPTS_VALUE && frame->best_effort_timestamp >= 0)
    {
      log_trace("Using frame->best_effort_timestamp: " + std::to_string(frame->best_effort_timestamp));
      return frame->best_effort_timestamp;
    }
    // Fall back to frame->pts if valid
    else if (frame->pts != AV_NOPTS_VALUE && frame->pts >= 0)
    {
      log_trace("Using frame->pts: " + std::to_string(frame->pts));
      return frame->pts;
    }
    // Use our tracked next_pts_ for invalid timestamps (flush frames)
    else
    {
      int64_t currentPts = next_pts_;
      
      // Advance next_pts_ immediately to ensure unique timestamps for sequential flush frames
      next_pts_ += calculateFrameDuration();
      
      return currentPts;
    }
  }

  uintptr_t Decoder::createAndStoreFrameCopy(const AVFrame *frame, int64_t correctedPts)
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

    // Update the frame copy with our corrected PTS
    frameCopy->pts = correctedPts;
    log_trace("Set corrected PTS " + std::to_string(correctedPts) + " on frame copy (original: " + std::to_string(frame->pts) + ")");

    // Store frame with automatic cleanup
    uintptr_t framePtr = reinterpret_cast<uintptr_t>(frameCopy);
    frames_.emplace(framePtr, std::unique_ptr<AVFrame, FrameDeleter>(frameCopy, frameDeleter));

    return framePtr;
  }

  AVFrame *Decoder::getFrame(uintptr_t framePtr)
  {
    auto it = frames_.find(framePtr);
    if (it != frames_.end())
    {
      return it->second.get();
    }
    return nullptr;
  }

  void Decoder::extractVideoProperties(const AVFrame *frame, FrameInfo &frameInfo)
  {
    frameInfo.width = frame->width;
    frameInfo.height = frame->height;
    frameInfo.pixelFormat = static_cast<AVPixelFormat>(frame->format);

    // Copy plane data pointers and line sizes (legacy compatibility)
    for (int i = 0; i < AV_NUM_DATA_POINTERS && frame->data[i]; ++i)
    {
      frameInfo.data.push_back(frame->data[i]);
      frameInfo.linesize.push_back(frame->linesize[i]);
    }
  }

  void Decoder::extractAudioProperties(const AVFrame *frame, FrameInfo &frameInfo)
  {
    frameInfo.channels = frame->ch_layout.nb_channels;
    frameInfo.sampleRate = frame->sample_rate;
    frameInfo.samplesPerChannel = frame->nb_samples;
    frameInfo.sampleFormat = static_cast<AVSampleFormat>(frame->format);

    // Copy plane data pointers and line sizes (legacy compatibility)
    for (int i = 0; i < AV_NUM_DATA_POINTERS && frame->data[i]; ++i)
    {
      frameInfo.data.push_back(frame->data[i]);
      frameInfo.linesize.push_back(frame->linesize[i]);
    }
  }

  void Decoder::updatePtsTracking(int64_t currentPts)
  {
    // Calculate frame duration based on media type
    int64_t frameDuration = calculateFrameDuration();

    // Calculate what next_pts_ should be
    int64_t expectedNextPts = currentPts + frameDuration;
    
    // Only update if we haven't already advanced (e.g., in determineBestPts for flush frames)
    if (next_pts_ != expectedNextPts)
    {
      next_pts_ = expectedNextPts;
      log_trace("Updated next_pts_ to: " + std::to_string(next_pts_) + " (current: " + std::to_string(currentPts) + ", duration: " + std::to_string(frameDuration) + ")");
    }
    else
    {
      log_trace("next_pts_ already at expected value: " + std::to_string(next_pts_) + " (current: " + std::to_string(currentPts) + ", duration: " + std::to_string(frameDuration) + ")");
    }
  }

  int64_t Decoder::calculateFrameDuration()
  {
    if (codecContext_->codec_type == AVMEDIA_TYPE_VIDEO)
    {
      // For video, use frame rate to calculate duration
      if (codecContext_->framerate.num > 0 && codecContext_->framerate.den > 0)
      {
        // Duration = timebase_den * framerate_den / framerate_num
        return (int64_t)codecContext_->time_base.den * codecContext_->framerate.den / codecContext_->framerate.num;
      }
      else
      {
        // Fallback: assume 30fps if no framerate is available
        return codecContext_->time_base.den / 30;
      }
    }
    else if (codecContext_->codec_type == AVMEDIA_TYPE_AUDIO)
    {
      // For audio, use the last processed frame's sample count
      // This is a simplified approach - in practice we'd need the actual frame
      // For now, use a reasonable default
      return 1024 * codecContext_->time_base.den / (codecContext_->sample_rate > 0 ? codecContext_->sample_rate : 48000);
    }

    // Fallback duration
    return codecContext_->time_base.den / 30;
  }

  std::string Decoder::codecName() const
  {
    if (codec_)
    {
      return std::string(codec_->name);
    }
    return "unknown";
  }

  void Decoder::dispose()
  {
    if (disposed_)
    {
      return;
    }

    log_trace("Disposing Decoder");
    cleanup();
    disposed_ = true;
  }

  void Decoder::cleanup()
  {
    if (codecContext_)
    {
      avcodec_free_context(&codecContext_);
      codecContext_ = nullptr;
    }

    if (frame_)
    {
      av_frame_free(&frame_);
      frame_ = nullptr;
    }

    // Clear all stored frames
    frames_.clear();

    codec_ = nullptr;
  }

} // namespace playback