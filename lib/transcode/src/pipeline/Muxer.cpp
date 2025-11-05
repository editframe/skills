#include "Muxer.h"
#include "../logging.h"
#include <iostream>

extern "C"
{
#include <libavutil/opt.h>
#include <libavutil/mathematics.h>
}

namespace playback
{

  Muxer::Muxer()
      : lastVideoDts_(AV_NOPTS_VALUE), lastAudioDts_(AV_NOPTS_VALUE)
  {
    // Constructor
  }

  Muxer::~Muxer()
  {
    dispose();
  }

  bool Muxer::initialize(const MuxerOptions &options)
  {
    if (formatContext_)
    {
      log_error("Muxer already initialized");
      return false;
    }

    if (options.format.empty() || options.filename.empty())
    {
      log_error("Format and filename are required");
      return false;
    }

    options_ = options;
    format_ = options.format;
    filename_ = options.filename;

    // Allocate format context
    int ret = avformat_alloc_output_context2(&formatContext_, nullptr,
                                             format_.c_str(), filename_.c_str());
    if (ret < 0)
    {
      char errorStr[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret, errorStr, sizeof(errorStr));
      log_error("Failed to allocate output context: " + std::string(errorStr));
      return false;
    }

    outputFormat_ = formatContext_->oformat;

    if (!configureFormat())
    {
      dispose();
      return false;
    }

    log_trace("Muxer initialized for format: " + format_ + ", output: " + filename_);
    return true;
  }

  bool Muxer::addVideoStream(int codecId, int width, int height,
                             AVRational frameRate, AVRational timeBase,
                             int bitrate, int pixelFormat,
                             uint8_t *extradata, int extradataSize)
  {
    if (!formatContext_)
    {
      log_error("Muxer not initialized");
      return false;
    }

    if (videoStream_)
    {
      log_error("Video stream already added");
      return false;
    }

    videoStream_ = avformat_new_stream(formatContext_, nullptr);
    if (!videoStream_)
    {
      log_error("Failed to create video stream");
      return false;
    }

    videoStreamIndex_ = videoStream_->index;

    if (!setupVideoStream(videoStream_, codecId, width, height,
                          frameRate, timeBase, bitrate, pixelFormat,
                          extradata, extradataSize))
    {
      return false;
    }

    log_trace("Added video stream: " + std::to_string(width) + "x" + std::to_string(height) +
             ", codec: " + std::to_string(codecId) +
             (extradata ? " with extradata (" + std::to_string(extradataSize) + " bytes)" : ""));
    return true;
  }

  bool Muxer::addAudioStream(int codecId, int channels, int sampleRate,
                             AVRational timeBase, int bitrate, int sampleFormat,
                             uint8_t *extradata, int extradataSize)
  {
    if (!formatContext_)
    {
      log_error("Muxer not initialized");
      return false;
    }

    if (audioStream_)
    {
      log_error("Audio stream already added");
      return false;
    }

    audioStream_ = avformat_new_stream(formatContext_, nullptr);
    if (!audioStream_)
    {
      log_error("Failed to create audio stream");
      return false;
    }

    audioStreamIndex_ = audioStream_->index;

    if (!setupAudioStream(audioStream_, codecId, channels, sampleRate,
                          timeBase, bitrate, sampleFormat, extradata, extradataSize))
    {
      return false;
    }

    log_trace("Added audio stream: " + std::to_string(channels) + " channels, " +
             std::to_string(sampleRate) + " Hz, codec: " + std::to_string(codecId) +
             (extradata ? " with extradata (" + std::to_string(extradataSize) + " bytes)" : ""));
    return true;
  }

  bool Muxer::addVideoStreamFromEncoder(const AVCodecParameters *codecpar,
                                        AVRational timeBase, AVRational frameRate)
  {
    if (!formatContext_)
    {
      log_error("Muxer not initialized");
      return false;
    }

    if (videoStream_)
    {
      log_error("Video stream already added");
      return false;
    }

    if (!codecpar)
    {
      log_error("Codec parameters cannot be null");
      return false;
    }

    videoStream_ = avformat_new_stream(formatContext_, nullptr);
    if (!videoStream_)
    {
      log_error("Failed to create video stream");
      return false;
    }

    videoStreamIndex_ = videoStream_->index;

    // Use FFmpeg built-in parameter copy instead of manual assignment
    int ret = avcodec_parameters_copy(videoStream_->codecpar, codecpar);
    if (ret < 0)
    {
      char errorStr[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret, errorStr, sizeof(errorStr));
      log_error("Failed to copy codec parameters: " + std::string(errorStr));
      return false;
    }

    // Set timebase and framerate
    videoStream_->time_base = timeBase;
    videoStream_->avg_frame_rate = frameRate;
    videoStream_->r_frame_rate = frameRate;  // Set real frame rate for ffprobe

    log_trace("Added video stream from encoder: " + std::to_string(codecpar->width) + "x" + std::to_string(codecpar->height) +
             ", codec: " + std::to_string(codecpar->codec_id) +
             ", extradata: " + std::to_string(codecpar->extradata_size) + " bytes");
    return true;
  }

  bool Muxer::addAudioStreamFromEncoder(const AVCodecParameters *codecpar,
                                        AVRational timeBase)
  {
    if (!formatContext_)
    {
      log_error("Muxer not initialized");
      return false;
    }

    if (audioStream_)
    {
      log_error("Audio stream already added");
      return false;
    }

    if (!codecpar)
    {
      log_error("Codec parameters cannot be null");
      return false;
    }

    audioStream_ = avformat_new_stream(formatContext_, nullptr);
    if (!audioStream_)
    {
      log_error("Failed to create audio stream");
      return false;
    }

    audioStreamIndex_ = audioStream_->index;

    // Use FFmpeg built-in parameter copy instead of manual assignment
    int ret = avcodec_parameters_copy(audioStream_->codecpar, codecpar);
    if (ret < 0)
    {
      char errorStr[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret, errorStr, sizeof(errorStr));
      log_error("Failed to copy codec parameters: " + std::string(errorStr));
      return false;
    }

    // Set timebase
    audioStream_->time_base = timeBase;

    log_trace("Added audio stream from encoder: " + std::to_string(codecpar->ch_layout.nb_channels) + " channels, " +
             std::to_string(codecpar->sample_rate) + " Hz, codec: " + std::to_string(codecpar->codec_id) +
             ", extradata: " + std::to_string(codecpar->extradata_size) + " bytes");
    return true;
  }

  bool Muxer::writeHeader()
  {
    if (!formatContext_)
    {
      log_error("Muxer not initialized");
      return false;
    }

    if (headerWritten_)
    {
      log_error("Header already written");
      return false;
    }

    // Set metadata
    if (!setMetadata())
    {
      return false;
    }

    // Configure container-specific options
    if (!configureContainer())
    {
      return false;
    }

    // Open output file
    if (!(outputFormat_->flags & AVFMT_NOFILE))
    {
      int ret = avio_open(&formatContext_->pb, filename_.c_str(), AVIO_FLAG_WRITE);
      if (ret < 0)
      {
        char errorStr[AV_ERROR_MAX_STRING_SIZE];
        av_strerror(ret, errorStr, sizeof(errorStr));
        log_error("Failed to open output file: " + std::string(errorStr));
        return false;
      }
    }

    // Prepare format options for MP4 fragmentation
    AVDictionary *formatOptions = nullptr;
    if (format_ == "mp4" || format_ == "mov")
    {
      // Build movflags string
      std::string movflags;
      
      if (options_.fastStart)
      {
        if (!movflags.empty()) movflags += "+";
        movflags += "faststart";
      }
      
      if (options_.fragmentDuration > 0)
      {
        // Set fragment duration for duration-based fragmentation
        // Do NOT add frag_keyframe as it creates multiple fragments per segment
        std::string fragDuration = std::to_string(options_.fragmentDuration);
        av_dict_set(&formatOptions, "frag_duration", fragDuration.c_str(), 0);
        log_trace("Setting frag_duration: " + fragDuration + " microseconds");
      }
      
      if (!options_.movFlags.empty())
      {
        if (!movflags.empty()) movflags += "+";
        movflags += options_.movFlags;
      }
      
      if (!movflags.empty())
      {
        av_dict_set(&formatOptions, "movflags", movflags.c_str(), 0);
        log_trace("Setting movflags: " + movflags);
      }
    }

    // Write header with format options
    int ret = avformat_write_header(formatContext_, &formatOptions);
    if (formatOptions)
    {
      av_dict_free(&formatOptions);
    }
    
    if (ret < 0)
    {
      char errorStr[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret, errorStr, sizeof(errorStr));
      log_error("Failed to write header: " + std::string(errorStr));
      return false;
    }

    headerWritten_ = true;
    log_trace("Header written successfully");
    return true;
  }

  bool Muxer::writePacket(const InputPacketInfo &packetInfo)
  {
    if (!formatContext_ || !headerWritten_)
    {
      log_error("Muxer not ready for writing packets");
      return false;
    }

    if (finalized_)
    {
      log_error("Cannot write packet after finalization");
      return false;
    }

    // Validate stream index
    if (!validateStreamIndex(packetInfo))
    {
      return false;
    }

    // Create and configure AVPacket
    AVPacket *packet = createPacketFromInfo(packetInfo);
    if (!packet)
    {
      return false;
    }

    // Process packet timestamps and write
    bool success = processAndWritePacket(packet, packetInfo);

    av_packet_free(&packet);
    return success;
  }

  bool Muxer::validateStreamIndex(const InputPacketInfo &packetInfo)
  {
    if (packetInfo.streamIndex == 0 && !hasVideoStream())
    {
      log_error("Video packet received but no video stream");
      return false;
    }
    if (packetInfo.streamIndex == 1 && !hasAudioStream())
    {
      log_error("Audio packet received but no audio stream");
      return false;
    }
    return true;
  }

  AVPacket *Muxer::createPacketFromInfo(const InputPacketInfo &packetInfo)
  {
    AVPacket *packet = av_packet_alloc();
    if (!packet)
    {
      log_error("Failed to allocate packet");
      return nullptr;
    }

    // Copy packet data
    packet->data = packetInfo.data;
    packet->size = packetInfo.size;
    packet->pts = packetInfo.pts;
    packet->dts = packetInfo.dts;
    packet->duration = packetInfo.duration;
    packet->flags = packetInfo.flags;

    // Set stream index
    if (packetInfo.streamIndex == 0)
    {
      packet->stream_index = videoStreamIndex_;
    }
    else if (packetInfo.streamIndex == 1)
    {
      packet->stream_index = audioStreamIndex_;
    }
    else
    {
      log_error("Invalid stream index: " + std::to_string(packetInfo.streamIndex));
      av_packet_free(&packet);
      return nullptr;
    }

    return packet;
  }

  bool Muxer::processAndWritePacket(AVPacket *packet, const InputPacketInfo &packetInfo)
  {
    // Get the target stream
    AVStream *stream = formatContext_->streams[packet->stream_index];

    // Rescale timestamps from source timebase to stream timebase
    av_packet_rescale_ts(packet, packetInfo.sourceTimeBase, stream->time_base);

    log_trace("Rescaled packet timestamps from " +
              std::to_string(packetInfo.sourceTimeBase.num) + "/" + std::to_string(packetInfo.sourceTimeBase.den) +
              " to " + std::to_string(stream->time_base.num) + "/" + std::to_string(stream->time_base.den) +
              ", pts=" + std::to_string(packet->pts) + ", dts=" + std::to_string(packet->dts));

    // Ensure valid timestamps
    normalizePacketTimestamps(packet);

    // Write packet
    int ret = av_interleaved_write_frame(formatContext_, packet);
    if (ret < 0)
    {
      char errorStr[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret, errorStr, sizeof(errorStr));
      log_error("Failed to write packet: " + std::string(errorStr));
      return false;
    }

    // Update statistics
    updateStats(packetInfo);
    return true;
  }

  void Muxer::normalizePacketTimestamps(AVPacket *packet)
  {
    // IMPLEMENTATION GUIDELINES: Allow negative timestamps for video segments
    // The first segment of a video file may naturally have negative timestamps
    // due to B-frames or keyframe alignment. This is valid for fragmented MP4.
    
    // Enforce monotonic DTS per stream while preserving negative values
    int64_t *lastDts = nullptr;
    if (packet->stream_index == videoStreamIndex_)
    {
      lastDts = &lastVideoDts_;
    }
    else if (packet->stream_index == audioStreamIndex_)
    {
      lastDts = &lastAudioDts_;
    }
    
    if (lastDts && *lastDts != AV_NOPTS_VALUE)
    {
      if (packet->dts <= *lastDts)
      {
        int64_t originalDts = packet->dts;
        packet->dts = *lastDts + 1;
        log_warn("🔧 MUXER: Adjusted DTS from " + std::to_string(originalDts) + " to " + std::to_string(packet->dts) + " for monotonicity");
      }
    }
    
    // Update last DTS tracking
    if (lastDts)
    {
      *lastDts = packet->dts;
    }
    
    // Ensure PTS >= DTS relationship is maintained
    if (packet->pts < packet->dts)
    {
      log_warn("Correcting PTS " + std::to_string(packet->pts) + " to match DTS " + std::to_string(packet->dts));
      packet->pts = packet->dts;
    }
  }

  bool Muxer::finalize()
  {
    if (!formatContext_ || !headerWritten_)
    {
      log_error("Muxer not ready for finalization");
      return false;
    }

    if (finalized_)
    {
      log_warn("Muxer already finalized");
      return true;
    }

    // Write trailer
    int ret = av_write_trailer(formatContext_);
    if (ret < 0)
    {
      char errorStr[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret, errorStr, sizeof(errorStr));
      log_error("Failed to write trailer: " + std::string(errorStr));
      return false;
    }

    // Close output file
    if (!(outputFormat_->flags & AVFMT_NOFILE))
    {
      avio_closep(&formatContext_->pb);
    }

    finalized_ = true;
    stats_.isFinalized = true;

    log_trace("Muxer finalized. Video packets: " + std::to_string(stats_.videoPacketsWritten) +
             ", Audio packets: " + std::to_string(stats_.audioPacketsWritten) +
             ", Total bytes: " + std::to_string(stats_.totalBytesWritten));
    return true;
  }

  void Muxer::dispose()
  {
    if (formatContext_)
    {
      if (!finalized_ && headerWritten_)
      {
        // Try to finalize gracefully
        finalize();
      }

      avformat_free_context(formatContext_);
      formatContext_ = nullptr;
    }

    // Reset state
    outputFormat_ = nullptr;
    videoStream_ = nullptr;
    audioStream_ = nullptr;
    videoStreamIndex_ = -1;
    audioStreamIndex_ = -1;
    headerWritten_ = false;
    finalized_ = false;
    lastVideoDts_ = AV_NOPTS_VALUE;
    lastAudioDts_ = AV_NOPTS_VALUE;

    log_trace("Muxer disposed");
  }

  bool Muxer::configureFormat()
  {
    if (!outputFormat_)
    {
      log_error("Output format not available");
      return false;
    }

    log_trace("Configured format: " + std::string(outputFormat_->name) +
              " (" + std::string(outputFormat_->long_name) + ")");
    return true;
  }

  bool Muxer::setupVideoStream(AVStream *stream, int codecId, int width, int height,
                               AVRational frameRate, AVRational timeBase,
                               int bitrate, int pixelFormat,
                               uint8_t *extradata, int extradataSize)
  {
    AVCodecParameters *codecpar = stream->codecpar;

    codecpar->codec_type = AVMEDIA_TYPE_VIDEO;
    codecpar->codec_id = static_cast<AVCodecID>(codecId);
    codecpar->width = width;
    codecpar->height = height;
    codecpar->format = pixelFormat;

    if (bitrate > 0)
    {
      codecpar->bit_rate = bitrate;
    }

    // Set timebase and framerate
    stream->time_base = timeBase;
    stream->avg_frame_rate = frameRate;
    stream->r_frame_rate = frameRate;  // Set real frame rate for ffprobe

    // Copy extradata (SPS/PPS for H.264, etc.)
    if (extradata && extradataSize > 0)
    {
      codecpar->extradata = static_cast<uint8_t *>(av_malloc(extradataSize));
      if (!codecpar->extradata)
      {
        log_error("Failed to allocate video extradata");
        return false;
      }
      memcpy(codecpar->extradata, extradata, extradataSize);
      codecpar->extradata_size = extradataSize;
    }
    else
    {
      codecpar->extradata = nullptr;
      codecpar->extradata_size = 0;
    }

    // Note: AVFMT_GLOBALHEADER is handled at the encoder level, not in muxer codecpar
    return true;
  }

  bool Muxer::setupAudioStream(AVStream *stream, int codecId, int channels,
                               int sampleRate, AVRational timeBase,
                               int bitrate, int sampleFormat,
                               uint8_t *extradata, int extradataSize)
  {
    AVCodecParameters *codecpar = stream->codecpar;

    codecpar->codec_type = AVMEDIA_TYPE_AUDIO;
    codecpar->codec_id = static_cast<AVCodecID>(codecId);

    // Use newer channel layout API instead of deprecated channels field
    av_channel_layout_default(&codecpar->ch_layout, channels);
    codecpar->sample_rate = sampleRate;
    codecpar->format = sampleFormat;

    if (bitrate > 0)
    {
      codecpar->bit_rate = bitrate;
    }

    // Set timebase
    stream->time_base = timeBase;

    // Note: AVFMT_GLOBALHEADER is handled at the encoder level, not in muxer codecpar
    if (extradata && extradataSize > 0)
    {
      codecpar->extradata = static_cast<uint8_t *>(av_malloc(extradataSize));
      if (!codecpar->extradata)
      {
        log_error("Failed to allocate extradata");
        return false;
      }
      memcpy(codecpar->extradata, extradata, extradataSize);
      codecpar->extradata_size = extradataSize;
    }
    else
    {
      codecpar->extradata = nullptr;
      codecpar->extradata_size = 0;
    }

    return true;
  }

  bool Muxer::setMetadata()
  {
    if (!options_.title.empty())
    {
      av_dict_set(&formatContext_->metadata, "title", options_.title.c_str(), 0);
    }
    if (!options_.artist.empty())
    {
      av_dict_set(&formatContext_->metadata, "artist", options_.artist.c_str(), 0);
    }
    if (!options_.album.empty())
    {
      av_dict_set(&formatContext_->metadata, "album", options_.album.c_str(), 0);
    }
    if (!options_.comment.empty())
    {
      av_dict_set(&formatContext_->metadata, "comment", options_.comment.c_str(), 0);
    }
    if (!options_.copyright.empty())
    {
      av_dict_set(&formatContext_->metadata, "copyright", options_.copyright.c_str(), 0);
    }
    if (!options_.description.empty())
    {
      av_dict_set(&formatContext_->metadata, "description", options_.description.c_str(), 0);
    }

    return true;
  }

  bool Muxer::configureContainer()
  {
    // Container-specific options are stored and applied during writeHeader()
    // This method is kept for consistency but options are now handled properly
    return true;
  }

  void Muxer::updateStats(const InputPacketInfo &packetInfo)
  {
    stats_.totalBytesWritten += packetInfo.size;

    if (packetInfo.streamIndex == 0)
    {
      // Video packet
      stats_.videoPacketsWritten++;
      if (videoStream_)
      {
        double timeBase = av_q2d(videoStream_->time_base);
        stats_.videoDuration = packetInfo.pts * timeBase;
      }
    }
    else if (packetInfo.streamIndex == 1)
    {
      // Audio packet
      stats_.audioPacketsWritten++;
      if (audioStream_)
      {
        double timeBase = av_q2d(audioStream_->time_base);
        stats_.audioDuration = packetInfo.pts * timeBase;
      }
    }
  }

} // namespace playback