#include "VideoSource.h"
#include "../logging.h"

extern "C"
{
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
#include <libavutil/error.h>
}

namespace playback
{

  static constexpr int BUFFER_SIZE = 64 * 1024; // 64KB buffer

  enum class RangePosition
  {
    BeforeRange = -1,
    WithinRange = 0,
    AfterRange = 1
  };

  VideoSource::VideoSource(const VideoSourceOptions &options)
      : options_(options)
  {
  }

  VideoSource::~VideoSource()
  {
    dispose();
  }

  bool VideoSource::initialize()
  {
    if (disposed_)
    {
      log_error("Cannot initialize disposed VideoSource");
      return false;
    }

    log_info("Initializing VideoSource for URL: " + options_.url);

    formatContext_ = avformat_alloc_context();
    if (!formatContext_)
    {
      log_error("Failed to allocate format context");
      return false;
    }

    log_info("Format context allocated successfully");

    bool success;
    if (options_.useSegmentData)
    {
      log_info("Using segment data for initialization");
      success = openWithSegmentData();
    }
    else if (options_.useSyntheticMp4)
    {
      log_info("Using synthetic MP4 for initialization");
      success = openWithSyntheticMp4();
    }
    else
    {
      log_info("Using URL for initialization");
      success = openWithUrl();
    }

    if (!success)
    {
      log_error("Failed to open input source");
      cleanup();
      return false;
    }

    log_info("Successfully opened input source, extracting stream info...");

    // Extract stream information
    extractStreamInfo();

    log_info("VideoSource initialization completed successfully");
    return true;
  }

  bool VideoSource::openWithSyntheticMp4()
  {
    if (options_.syntheticMp4.empty())
    {
      log_error("Synthetic MP4 buffer is empty");
      return false;
    }

    return openWithCustomIO();
  }

  bool VideoSource::openWithSegmentData()
  {
    if (options_.segmentData.empty())
    {
      log_error("Segment data buffer is empty");
      return false;
    }

    return openWithCustomIO();
  }

  bool VideoSource::openWithCustomIO()
  {
    // Create custom I/O context
    ioContext_ = createCustomIOContext();
    if (!ioContext_)
    {
      log_error("Failed to create custom I/O context");
      return false;
    }

    // Important: Once we set formatContext_->pb, the format context takes ownership
    formatContext_->pb = ioContext_;
    formatContext_->flags |= AVFMT_FLAG_CUSTOM_IO;

    // Set up options for more robust parsing of problematic files
    AVDictionary *options = nullptr;

    // Increase analysis duration and probe size for better codec detection
    av_dict_set(&options, "analyzeduration", "10000000", 0); // 10 seconds
    av_dict_set(&options, "probesize", "10000000", 0);       // 10MB

    // Make parsing more tolerant of errors
    av_dict_set(&options, "fflags", "+genpts+igndts", 0); // Generate PTS, ignore DTS errors
    av_dict_set(&options, "err_detect", "ignore_err", 0); // Ignore stream errors

    // Open input with custom I/O and robust options
    int ret = avformat_open_input(&formatContext_, nullptr, nullptr, &options);
    if (ret < 0)
    {
      log_error("Failed to open custom I/O input: " + av_error_to_string(ret));
      av_dict_free(&options);
      return false;
    }

    // Try to find stream info, but don't fail if it has issues
    ret = avformat_find_stream_info(formatContext_, nullptr);
    if (ret < 0)
    {
      log_warn("Stream info analysis had issues, but continuing: " + av_error_to_string(ret));
      // Don't return false here - we can still work with partial stream info
    }

    av_dict_free(&options);

    // For synthetic MP4, the index is already built from the sample tables in the moov box
    // No additional processing needed here

    return true;
  }

  bool VideoSource::openWithUrl()
  {
    log_info("Starting URL probe for: " + options_.url);
    
    // Set up options for more robust parsing of problematic files
    AVDictionary *options = nullptr;

    // Add timeout for network operations (30 seconds)
    av_dict_set(&options, "timeout", "30000000", 0); // 30 seconds in microseconds
    
    // Add connection timeout (10 seconds)
    av_dict_set(&options, "stimeout", "10000000", 0); // 10 seconds in microseconds
    
    // Add retry attempts for network errors
    av_dict_set(&options, "reconnect", "1", 0);
    av_dict_set(&options, "reconnect_streamed", "1", 0);
    av_dict_set(&options, "reconnect_delay_max", "2", 0);
    
    // Add HTTP specific options
    av_dict_set(&options, "user_agent", "VideoSource/1.0", 0);
    av_dict_set(&options, "multiple_requests", "1", 0);
    
    // Reduce probe requirements for faster startup
    av_dict_set(&options, "analyzeduration", "5000000", 0);  // 5 seconds (reduced from 10)
    av_dict_set(&options, "probesize", "5000000", 0);        // 5MB (reduced from 10MB)

    // Make parsing more tolerant of errors
    av_dict_set(&options, "fflags", "+genpts+igndts", 0); // Generate PTS, ignore DTS errors
    av_dict_set(&options, "err_detect", "ignore_err", 0); // Ignore stream errors

    log_info("Opening input with timeout settings...");
    
    int ret = avformat_open_input(&formatContext_, options_.url.c_str(), nullptr, &options);
    if (ret < 0)
    {
      log_error("Failed to open URL input: " + av_error_to_string(ret));
      av_dict_free(&options);
      return false;
    }

    log_info("Successfully opened input, analyzing stream info...");

    // Try to find stream info, but don't fail if it has issues
    ret = avformat_find_stream_info(formatContext_, nullptr);
    if (ret < 0)
    {
      log_warn("Stream info analysis had issues, but continuing: " + av_error_to_string(ret));
      // Don't return false here - we can still work with partial stream info
    }

    log_info("Stream info analysis complete");

    av_dict_free(&options);
    return true;
  }

  AVIOContext *VideoSource::createCustomIOContext()
  {
    ioBuffer_ = static_cast<uint8_t *>(av_malloc(BUFFER_SIZE));
    if (!ioBuffer_)
    {
      log_error("Failed to allocate I/O buffer");
      return nullptr;
    }

    AVIOContext *ctx = avio_alloc_context(
        ioBuffer_,
        BUFFER_SIZE,
        0, // read mode
        this,
        readFunction,
        nullptr, // no write function
        seekFunction);

    if (!ctx)
    {
      log_error("Failed to allocate AVIO context");
      av_free(ioBuffer_);
      ioBuffer_ = nullptr;
    }

    return ctx;
  }

  int VideoSource::readFunction(void *opaque, uint8_t *buf, int bufSize)
  {
    VideoSource *source = static_cast<VideoSource *>(opaque);

    // Choose the appropriate data source
    const std::vector<uint8_t> *dataSource = nullptr;
    if (source->options_.useSegmentData)
    {
      dataSource = &source->options_.segmentData;
    }
    else if (source->options_.useSyntheticMp4)
    {
      dataSource = &source->options_.syntheticMp4;
    }
    else
    {
      return AVERROR(EINVAL);
    }

    if (source->virtualFilePos_ >= dataSource->size())
    {
      return AVERROR_EOF;
    }

    size_t remainingBytes = dataSource->size() - source->virtualFilePos_;
    size_t bytesToRead = std::min(static_cast<size_t>(bufSize), remainingBytes);

    if (bytesToRead > 0)
    {
      memcpy(buf, dataSource->data() + source->virtualFilePos_, bytesToRead);
      source->virtualFilePos_ += bytesToRead;
    }

    return static_cast<int>(bytesToRead);
  }

  int64_t VideoSource::seekFunction(void *opaque, int64_t offset, int whence)
  {
    VideoSource *source = static_cast<VideoSource *>(opaque);

    // Choose the appropriate data source
    const std::vector<uint8_t> *dataSource = nullptr;
    if (source->options_.useSegmentData)
    {
      dataSource = &source->options_.segmentData;
    }
    else if (source->options_.useSyntheticMp4)
    {
      dataSource = &source->options_.syntheticMp4;
    }
    else
    {
      return AVERROR(EINVAL);
    }

    int64_t newPos = 0;
    switch (whence)
    {
    case SEEK_SET:
      newPos = offset;
      break;
    case SEEK_CUR:
      newPos = static_cast<int64_t>(source->virtualFilePos_) + offset;
      break;
    case SEEK_END:
      newPos = static_cast<int64_t>(dataSource->size()) + offset;
      break;
    case AVSEEK_SIZE:
      return static_cast<int64_t>(dataSource->size());
    default:
      return AVERROR(EINVAL);
    }

    if (newPos < 0 || newPos > static_cast<int64_t>(dataSource->size()))
    {
      return AVERROR(EINVAL);
    }

    source->virtualFilePos_ = static_cast<size_t>(newPos);
    return newPos;
  }

  void VideoSource::extractStreamInfo()
  {
    log_info("Starting stream info extraction");
    
    streams_.clear();

    if (!formatContext_)
    {
      log_error("Format context is null during stream info extraction");
      return;
    }

    log_info("Format context is valid, extracting duration and stream information");

    // Calculate total duration
    if (formatContext_->duration != AV_NOPTS_VALUE)
    {
      durationMs_ = static_cast<double>(formatContext_->duration) / AV_TIME_BASE * 1000.0;
      log_info("Video duration: " + std::to_string(durationMs_) + "ms");
    }
    else
    {
      log_warn("Video duration is unknown (AV_NOPTS_VALUE)");
    }

    log_info("Processing " + std::to_string(formatContext_->nb_streams) + " streams");

    // Extract information for each stream
    for (unsigned i = 0; i < formatContext_->nb_streams; ++i)
    {
      AVStream *stream = formatContext_->streams[i];
      AVCodecParameters *codecpar = stream->codecpar;

      log_info("Processing stream " + std::to_string(i) + " (codec type: " + std::to_string(codecpar->codec_type) + ")");

      VideoStreamInfo info;
      info.index = static_cast<int>(i);
      info.codecType = codecpar->codec_type;
      info.codecId = codecpar->codec_id;
      info.timeBase = stream->time_base;
      info.codecParams = codecpar;

      // Get codec name
      const AVCodec *codec = avcodec_find_decoder(codecpar->codec_id);
      if (codec)
      {
        info.codecName = codec->name;
        log_info("Stream " + std::to_string(i) + " codec: " + info.codecName);
      }
      else
      {
        log_warn("Could not find decoder for stream " + std::to_string(i));
      }

      // Calculate stream duration
      if (stream->duration != AV_NOPTS_VALUE)
      {
        info.duration = stream->duration;
        info.durationMs = static_cast<double>(stream->duration) *
                          av_q2d(stream->time_base) * 1000.0;
        log_info("Stream " + std::to_string(i) + " duration: " + std::to_string(info.durationMs) + "ms");
      }
      else if (durationMs_ > 0)
      {
        info.durationMs = durationMs_;
        info.duration = static_cast<int64_t>(durationMs_ / 1000.0 / av_q2d(stream->time_base));
        log_info("Stream " + std::to_string(i) + " using global duration: " + std::to_string(info.durationMs) + "ms");
      }
      else
      {
        log_warn("Stream " + std::to_string(i) + " duration is unknown");
      }

      // Extract media-specific information
      if (codecpar->codec_type == AVMEDIA_TYPE_VIDEO)
      {
        info.width = codecpar->width;
        info.height = codecpar->height;
        info.pixelFormat = static_cast<AVPixelFormat>(codecpar->format);

        log_info("Video stream " + std::to_string(i) + " resolution: " + std::to_string(info.width) + "x" + std::to_string(info.height));

        // Calculate frame rate
        if (stream->avg_frame_rate.num && stream->avg_frame_rate.den)
        {
          info.frameRate = stream->avg_frame_rate;
          double fps = static_cast<double>(info.frameRate.num) / info.frameRate.den;
          log_info("Video stream " + std::to_string(i) + " frame rate: " + std::to_string(fps) + " fps");
        }
        else if (stream->r_frame_rate.num && stream->r_frame_rate.den)
        {
          info.frameRate = stream->r_frame_rate;
          double fps = static_cast<double>(info.frameRate.num) / info.frameRate.den;
          log_info("Video stream " + std::to_string(i) + " frame rate (r_frame_rate): " + std::to_string(fps) + " fps");
        }
        else
        {
          info.frameRate = {25, 1}; // Default fallback
          log_warn("Video stream " + std::to_string(i) + " frame rate unknown, using default 25 fps");
        }
      }
      else if (codecpar->codec_type == AVMEDIA_TYPE_AUDIO)
      {
        info.channels = codecpar->ch_layout.nb_channels;
        info.sampleRate = codecpar->sample_rate;
        info.sampleFormat = static_cast<AVSampleFormat>(codecpar->format);

        log_info("Audio stream " + std::to_string(i) + " channels: " + std::to_string(info.channels) + 
                ", sample rate: " + std::to_string(info.sampleRate) + " Hz");
      }

      streams_.push_back(info);
    }

    log_info("Stream info extraction completed. Found " + std::to_string(streams_.size()) + " streams");
  }

  bool VideoSource::seek(double timeMs)
  {
    if (disposed_ || !formatContext_)
    {
      log_error("Cannot seek on disposed VideoSource");
      return false;
    }

    // Convert milliseconds to AV_TIME_BASE units (microseconds)
    int64_t timestamp = static_cast<int64_t>((timeMs / 1000.0) * AV_TIME_BASE);

    int ret = av_seek_frame(formatContext_, -1, timestamp, AVSEEK_FLAG_BACKWARD);
    if (ret < 0)
    {
      log_warn("Seek failed: " + av_error_to_string(ret));
      return false;
    }

    log_trace("Seeked to " + std::to_string(timeMs) + "ms");
    return true;
  }

  bool VideoSource::readPacket(AVPacket *packet)
  {
    if (disposed_ || !formatContext_)
    {
      log_error("Cannot read packet from disposed VideoSource");
      return false;
    }

    if (!packet)
    {
      log_error("Packet is null");
      return false;
    }

    // For synthetic MP4, we can't read actual packet data since we only have metadata
    if (options_.useSyntheticMp4)
    {
      log_trace("Cannot read packets from synthetic MP4 (metadata only)");
      return false; // This is expected behavior for synthetic MP4
    }

    // Keep reading packets until we find one from a stream we want
    while (true) {
    int ret = av_read_frame(formatContext_, packet);
    if (ret < 0)
    {
      if (ret == AVERROR_EOF)
      {
        log_trace("End of file reached");
      }
      else
      {
        log_warn("Failed to read packet: " + av_error_to_string(ret));
      }
      return false;
    }

      // If no filter is set, or the packet matches our filter, return it
      if (streamFilter_ == AVMEDIA_TYPE_UNKNOWN ||
          (packet->stream_index < static_cast<int>(formatContext_->nb_streams) &&
           formatContext_->streams[packet->stream_index]->codecpar->codec_type == streamFilter_))
      {
    return true;
      }

      // Not a packet we want, unref it and try again
      av_packet_unref(packet);
    }

    return false;  // Should never reach here
  }

  void VideoSource::dispose()
  {
    if (disposed_)
    {
      return;
    }

    log_trace("Disposing VideoSource");
    cleanup();
    disposed_ = true;
  }

  bool VideoSource::findByteRangeForTimeRange(double startTimeMs, double endTimeMs, int64_t *outStartByte, int64_t *outEndByte, double *outExpandedStartTimeMs, double *outExpandedEndTimeMs)
  {
    if (!formatContext_ || disposed_)
    {
      log_error("Cannot find byte range on disposed VideoSource or missing format context");
      return false;
    }

    if (!outStartByte || !outEndByte)
    {
      log_error("Output parameters cannot be null");
      return false;
    }

    // Clamp the time range to the actual video duration
    double actualDurationMs = durationMs_;
    if (actualDurationMs <= 0)
    {
      log_warn("Video duration is unknown or zero, cannot clamp time range");
      // Try to proceed anyway - maybe we can still find some data
    }
    else
    {
      // Store original values for logging
      double originalStartTimeMs = startTimeMs;
      double originalEndTimeMs = endTimeMs;

      // Clamp start time to be within bounds
      startTimeMs = std::max(0.0, std::min(startTimeMs, actualDurationMs));

      // Clamp end time to be within bounds and after start time
      endTimeMs = std::max(startTimeMs, std::min(endTimeMs, actualDurationMs));

      if (originalEndTimeMs != endTimeMs || originalStartTimeMs != startTimeMs)
      {
        log_trace("Clamped time range from " + std::to_string(originalStartTimeMs) + "-" +
                 std::to_string(originalEndTimeMs) + "ms to " + std::to_string(startTimeMs) +
                 "-" + std::to_string(endTimeMs) + "ms (video duration: " +
                 std::to_string(actualDurationMs) + "ms)");
      }
    }

    // Convert milliseconds to seconds
    double startTimeSec = startTimeMs / 1000.0;
    double endTimeSec = endTimeMs / 1000.0;

    log_trace("Finding byte range for time range: " + std::to_string(startTimeSec) + "s to " + std::to_string(endTimeSec) + "s");

    int64_t globalStartByte = INT64_MAX;
    int64_t globalEndByte = 0;
    double globalExpandedStartTimeMs = startTimeMs;
    double globalExpandedEndTimeMs = endTimeMs;
    bool found = false;

    // Process all streams to find the optimal byte range
    for (unsigned int streamIndex = 0; streamIndex < formatContext_->nb_streams; streamIndex++)
    {
      AVStream *stream = formatContext_->streams[streamIndex];
      if (!stream || !isValidTimeBase(stream->time_base))
        continue;

      int64_t startByte, endByte;
      double expandedStartTimeMs, expandedEndTimeMs;

      if (findStreamByteRange(stream, startTimeSec, endTimeSec, &startByte, &endByte, &expandedStartTimeMs, &expandedEndTimeMs))
      {
        // Take min of start bytes and max of end bytes to get largest range
        globalStartByte = std::min(globalStartByte, startByte);
        globalEndByte = std::max(globalEndByte, endByte);

        // Track the expanded time range across all streams
        globalExpandedStartTimeMs = std::min(globalExpandedStartTimeMs, expandedStartTimeMs);
        globalExpandedEndTimeMs = std::max(globalExpandedEndTimeMs, expandedEndTimeMs);

        found = true;
      }
    }

    if (!found)
    {
      return false;
    }

    *outStartByte = globalStartByte;
    *outEndByte = globalEndByte;

    // Set expanded time range if output parameters are provided
    if (outExpandedStartTimeMs)
    {
      *outExpandedStartTimeMs = globalExpandedStartTimeMs;
    }
    if (outExpandedEndTimeMs)
    {
      *outExpandedEndTimeMs = globalExpandedEndTimeMs;
    }

    return true;
  }

  bool VideoSource::isValidTimeBase(const AVRational &timeBase) const
  {
    return timeBase.num != 0 && timeBase.den != 0;
  }

  bool VideoSource::findStreamByteRange(AVStream *stream, double startTimeSec, double endTimeSec, int64_t *outStartByte, int64_t *outEndByte, double *outExpandedStartTimeMs, double *outExpandedEndTimeMs)
  {
    AVRational timeBase = stream->time_base;

    // Convert time to stream timestamps
    int64_t startTimestamp = static_cast<int64_t>(startTimeSec / av_q2d(timeBase));
    int64_t endTimestamp = static_cast<int64_t>(endTimeSec / av_q2d(timeBase));

    int entryCount = avformat_index_get_entries_count(stream);
    log_trace("Stream " + std::to_string(stream->index) + " has " + std::to_string(entryCount) + " index entries");

    if (entryCount <= 0)
    {
      log_warn("Stream " + std::to_string(stream->index) + " has no index entries, cannot find byte range");
      return false;
    }

    int64_t leadingKeyframeIndex = -1;
    int64_t trailingKeyframeIndex = -1;

    findKeyframeIndices(stream, startTimestamp, endTimestamp, &leadingKeyframeIndex, &trailingKeyframeIndex);

    log_trace("Stream " + std::to_string(stream->index) + " keyframe indices: leading=" +
             std::to_string(leadingKeyframeIndex) + ", trailing=" + std::to_string(trailingKeyframeIndex));

    if (leadingKeyframeIndex == -1 || trailingKeyframeIndex == -1)
    {
      log_warn("Stream " + std::to_string(stream->index) + " could not find valid keyframe indices");
      return false;
    }

    return calculateByteRangeFromKeyframes(stream, leadingKeyframeIndex, trailingKeyframeIndex, outStartByte, outEndByte, outExpandedStartTimeMs, outExpandedEndTimeMs);
  }

  void VideoSource::findKeyframeIndices(AVStream *stream, int64_t startTimestamp, int64_t endTimestamp, int64_t *leadingKeyframeIndex, int64_t *trailingKeyframeIndex)
  {
    int entryCount = avformat_index_get_entries_count(stream);
    
    // IMPLEMENTATION GUIDELINES: For video streams, include the leading keyframe
    // even if it's before the requested start time for proper GOP decoding
    int64_t actualStartTimestamp = startTimestamp;
    bool isVideoStream = (stream->codecpar->codec_type == AVMEDIA_TYPE_VIDEO);
    
    if (isVideoStream) {
      // Find the closest keyframe at or before the requested start time
      for (int i = 0; i < entryCount; i++)
      {
        const AVIndexEntry *entry = avformat_index_get_entry(stream, i);
        if (!entry) continue;
        
        // Look for keyframes at or before our start time
        if ((entry->flags & AVINDEX_KEYFRAME) && entry->timestamp <= startTimestamp)
        {
          actualStartTimestamp = entry->timestamp;
        }
        
        // Stop looking once we've passed the start time
        if (entry->timestamp > startTimestamp) break;
      }
      
      if (actualStartTimestamp < startTimestamp) {
        log_trace("Video stream byte range: including leading keyframe at timestamp " + 
                 std::to_string(actualStartTimestamp) + " (before requested start " + 
                 std::to_string(startTimestamp) + ")");
      }
    }

    RangePosition rangePosition = RangePosition::AfterRange;

    for (int64_t i = entryCount - 1; i >= 0; i--)
    {
      const AVIndexEntry *entry = avformat_index_get_entry(stream, i);
      if (!entry)
        continue;

      bool isKeyframe = entry->flags & AVINDEX_KEYFRAME;
      // Use actualStartTimestamp (which may include leading keyframe) instead of startTimestamp
      bool isWithinRange = entry->timestamp <= endTimestamp && entry->timestamp >= actualStartTimestamp;

      // Update range position first, before processing keyframes
      if (isWithinRange && rangePosition == RangePosition::AfterRange)
      {
        rangePosition = RangePosition::WithinRange;
      }
      else if (!isWithinRange && rangePosition == RangePosition::WithinRange)
      {
        rangePosition = RangePosition::BeforeRange;
      }

      switch (rangePosition)
      {
      case RangePosition::AfterRange:
        if (isKeyframe)
        {
          *trailingKeyframeIndex = i;
        }
        break;
      case RangePosition::WithinRange:
        // If this is a keyframe exactly at the start of our range,
        // use it as the leading keyframe since there's nothing before it
        if (isKeyframe && entry->timestamp == actualStartTimestamp)
        {
          *leadingKeyframeIndex = i;
        }
        else if (isKeyframe && !isWithinRange)
        {
          *leadingKeyframeIndex = i;
        }
        break;
      case RangePosition::BeforeRange:
        if (isKeyframe)
        {
          *leadingKeyframeIndex = i;
        }
        break;
      }

      // If we have both leading and trailing keyframes, we can stop
      if (*leadingKeyframeIndex != -1 && *trailingKeyframeIndex != -1)
        break;
    }

    // Handle edge case: if we couldn't find a trailing keyframe (e.g., when requesting
    // the entire video duration), use the last frame in the stream as the end bound
    if (*leadingKeyframeIndex != -1 && *trailingKeyframeIndex == -1)
    {
      // Use the last frame (any frame, not necessarily a keyframe) as the trailing bound
      *trailingKeyframeIndex = entryCount; // Use index after the last frame
      log_trace("Using last frame as trailing bound for stream " + std::to_string(stream->index) +
               " (entryCount=" + std::to_string(entryCount) + " -> trailingIndex=" + std::to_string(*trailingKeyframeIndex) + ")");
    }
  }

  bool VideoSource::calculateByteRangeFromKeyframes(AVStream *stream, int64_t leadingKeyframeIndex, int64_t trailingKeyframeIndex, int64_t *outStartByte, int64_t *outEndByte, double *outExpandedStartTimeMs, double *outExpandedEndTimeMs)
  {
    const AVIndexEntry *leadingEntry = avformat_index_get_entry(stream, leadingKeyframeIndex);
    if (!leadingEntry)
    {
      log_warn("Leading entry at index " + std::to_string(leadingKeyframeIndex) + " is null");
      return false;
    }

    // Handle the case where trailingKeyframeIndex might be beyond the last entry
    int entryCount = avformat_index_get_entries_count(stream);
    int64_t actualTrailingIndex = std::min(trailingKeyframeIndex - 1, static_cast<int64_t>(entryCount - 1));

    const AVIndexEntry *trailingEntry = avformat_index_get_entry(stream, actualTrailingIndex);
    if (!trailingEntry)
    {
      log_warn("Trailing entry at index " + std::to_string(actualTrailingIndex) + " is null");
      return false;
    }

    *outStartByte = leadingEntry->pos;
    // HTTP Range requests use inclusive end bytes, so subtract 1 from logical end position
    *outEndByte = trailingEntry->pos + trailingEntry->size - 1;

    // Calculate expanded time range in milliseconds
    AVRational timeBase = stream->time_base;
    *outExpandedStartTimeMs = leadingEntry->timestamp * av_q2d(timeBase) * 1000.0;
    *outExpandedEndTimeMs = trailingEntry->timestamp * av_q2d(timeBase) * 1000.0;

    log_trace("Calculated byte range for stream " + std::to_string(stream->index) +
             ": " + std::to_string(*outStartByte) + " to " + std::to_string(*outEndByte) +
             " (size: " + std::to_string(*outEndByte - *outStartByte + 1) + " bytes)");

    return true;
  }

  std::vector<playback::SampleTableEntry> VideoSource::getSampleTableEntries(int streamIndex, double startTimeMs, double endTimeMs)
  {
    std::vector<playback::SampleTableEntry> entries;

    if (!formatContext_ || disposed_)
    {
      log_error("Cannot get sample table entries from disposed VideoSource or missing format context");
      return entries;
    }

    if (streamIndex < 0 || streamIndex >= static_cast<int>(formatContext_->nb_streams))
    {
      log_error("Invalid stream index: " + std::to_string(streamIndex));
      return entries;
    }

    AVStream *stream = formatContext_->streams[streamIndex];
    if (!stream)
    {
      log_error("Stream " + std::to_string(streamIndex) + " is null");
      return entries;
    }

    AVRational timeBase = stream->time_base;
    if (timeBase.num == 0 || timeBase.den == 0)
    {
      log_error("Stream " + std::to_string(streamIndex) + " has invalid time base");
      return entries;
    }

    // Convert milliseconds to seconds, then to stream timestamps
    double startTimeSec = startTimeMs / 1000.0;
    double endTimeSec = endTimeMs / 1000.0;
    int64_t startTimestamp = static_cast<int64_t>(startTimeSec / av_q2d(timeBase));
    int64_t endTimestamp = static_cast<int64_t>(endTimeSec / av_q2d(timeBase));

    log_trace("Getting sample table entries for stream " + std::to_string(streamIndex) +
             " from " + std::to_string(startTimeMs) + "ms to " + std::to_string(endTimeMs) + "ms");

    int entryCount = avformat_index_get_entries_count(stream);
    if (entryCount <= 0)
    {
      log_trace("Stream " + std::to_string(streamIndex) + " has no index entries");
      return entries;
    }

    // IMPLEMENTATION GUIDELINES: For video streams, we need to include the leading I-frame
    // even if it's before the requested start time, as P-frames depend on it for decoding
    int64_t actualStartTimestamp = startTimestamp;
    bool isVideoStream = (stream->codecpar->codec_type == AVMEDIA_TYPE_VIDEO);
    
    if (isVideoStream) {
      // Find the closest keyframe at or before the requested start time
      int64_t leadingKeyframeTimestamp = startTimestamp;
      bool foundLeadingKeyframe = false;
      
      for (int i = 0; i < entryCount; i++)
      {
        const AVIndexEntry *entry = avformat_index_get_entry(stream, i);
        if (!entry) continue;
        
        // Look for keyframes at or before our start time
        if ((entry->flags & AVINDEX_KEYFRAME) && entry->timestamp <= startTimestamp)
        {
          leadingKeyframeTimestamp = entry->timestamp;
          foundLeadingKeyframe = true;
        }
        
        // Stop looking once we've passed the start time
        if (entry->timestamp > startTimestamp) break;
      }
      
      if (foundLeadingKeyframe && leadingKeyframeTimestamp < startTimestamp)
      {
        actualStartTimestamp = leadingKeyframeTimestamp;
        log_trace("Video stream: including leading keyframe at timestamp " + 
                 std::to_string(leadingKeyframeTimestamp) + " (before requested start " + 
                 std::to_string(startTimestamp) + ")");
      }
    }

    // Collect entries from the actual start (including leading keyframe) to end
    for (int i = 0; i < entryCount; i++)
    {
      const AVIndexEntry *entry = avformat_index_get_entry(stream, i);
      if (!entry)
        continue;

      // Include entries from the actual start timestamp (which may include leading keyframe)
      if (entry->timestamp >= actualStartTimestamp && entry->timestamp <= endTimestamp)
      {
        playback::SampleTableEntry sampleEntry;
        sampleEntry.dts = entry->timestamp;
        sampleEntry.dtsMs = entry->timestamp * av_q2d(timeBase) * 1000.0;
        sampleEntry.pos = entry->pos;
        sampleEntry.size = entry->size;
        sampleEntry.isKeyframe = (entry->flags & AVINDEX_KEYFRAME) != 0;
        sampleEntry.flags = entry->flags;

        entries.push_back(sampleEntry);
      }

      // Stop if we've gone past our end time
      if (entry->timestamp > endTimestamp)
      {
        break;
      }
    }

    log_trace("Found " + std::to_string(entries.size()) + " sample table entries in time range" +
             (isVideoStream && actualStartTimestamp < startTimestamp ? 
              " (including leading keyframe)" : ""));
    return entries;
  }

  bool VideoSource::hasIndexEntries() const
  {
    if (!formatContext_ || disposed_)
    {
      return false;
    }

    for (unsigned int i = 0; i < formatContext_->nb_streams; i++)
    {
      AVStream *stream = formatContext_->streams[i];
      if (stream && avformat_index_get_entries_count(stream) > 0)
      {
        return true;
      }
    }

    return false;
  }

  // CRITICAL FIX: Unified keyframe-based fetching to match FFmpeg's approach
  // This eliminates the double keyframe search issue that caused sample count mismatches
  bool VideoSource::findKeyframeAlignedData(int streamIndex, double startTimeMs, double endTimeMs, KeyframeAlignedResult *outResult)
  {
    if (!formatContext_ || disposed_ || !outResult)
    {
      log_error("Cannot find keyframe aligned data on disposed VideoSource or null result");
      return false;
    }

    if (streamIndex < 0 || streamIndex >= static_cast<int>(formatContext_->nb_streams))
    {
      log_error("Invalid stream index: " + std::to_string(streamIndex));
      return false;
    }

    AVStream *stream = formatContext_->streams[streamIndex];
    if (!stream || !isValidTimeBase(stream->time_base))
    {
      log_error("Stream " + std::to_string(streamIndex) + " is null or has invalid time base");
      return false;
    }

    log_trace("Finding keyframe aligned data for stream " + std::to_string(streamIndex) +
             " from " + std::to_string(startTimeMs) + "ms to " + std::to_string(endTimeMs) + "ms");

    // Convert milliseconds to stream timestamps (same logic as existing methods)
    AVRational timeBase = stream->time_base;
    double startTimeSec = startTimeMs / 1000.0;
    double endTimeSec = endTimeMs / 1000.0;
    int64_t startTimestamp = static_cast<int64_t>(startTimeSec / av_q2d(timeBase));
    int64_t endTimestamp = static_cast<int64_t>(endTimeSec / av_q2d(timeBase));

    int entryCount = avformat_index_get_entries_count(stream);
    if (entryCount <= 0)
    {
      log_trace("Stream " + std::to_string(streamIndex) + " has no index entries");
      return false;
    }

    // STEP 1: Find keyframe boundaries (same logic as findKeyframeIndices)
    int64_t leadingKeyframeIndex = -1;
    int64_t trailingKeyframeIndex = -1;
    findKeyframeIndices(stream, startTimestamp, endTimestamp, &leadingKeyframeIndex, &trailingKeyframeIndex);

    log_trace("Stream " + std::to_string(streamIndex) + " keyframe indices: leading=" +
             std::to_string(leadingKeyframeIndex) + ", trailing=" + std::to_string(trailingKeyframeIndex));

    if (leadingKeyframeIndex == -1 || trailingKeyframeIndex == -1)
    {
      log_warn("Stream " + std::to_string(streamIndex) + " could not find valid keyframe indices");
      return false;
    }

    // STEP 2: Calculate byte range from keyframes (same logic as calculateByteRangeFromKeyframes)
    if (!calculateByteRangeFromKeyframes(stream, leadingKeyframeIndex, trailingKeyframeIndex, 
                                        &outResult->startByte, &outResult->endByte, 
                                        &outResult->expandedStartTimeMs, &outResult->expandedEndTimeMs))
    {
      log_warn("Failed to calculate byte range from keyframes for stream " + std::to_string(streamIndex));
      return false;
    }

    // STEP 3: Extract sample table entries using the EXACT SAME keyframe indices
    // This ensures perfect consistency with the byte range calculation
    outResult->sampleTableEntries.clear();

    // Use the actual keyframe timestamps from the indices (not the input time range)
    const AVIndexEntry *leadingEntry = avformat_index_get_entry(stream, leadingKeyframeIndex);
    int64_t actualTrailingIndex = std::min(trailingKeyframeIndex - 1, static_cast<int64_t>(entryCount - 1));
    const AVIndexEntry *trailingEntry = avformat_index_get_entry(stream, actualTrailingIndex);

    if (!leadingEntry || !trailingEntry)
    {
      log_warn("Could not get keyframe entries for stream " + std::to_string(streamIndex));
      return false;
    }

    int64_t actualStartTimestamp = leadingEntry->timestamp;
    int64_t actualEndTimestamp = trailingEntry->timestamp;

    log_trace("Using exact keyframe timestamps: " + std::to_string(actualStartTimestamp) + 
             " - " + std::to_string(actualEndTimestamp));

    // Collect entries from the exact keyframe range (guaranteed to match byte range)
    for (int i = 0; i < entryCount; i++)
    {
      const AVIndexEntry *entry = avformat_index_get_entry(stream, i);
      if (!entry)
        continue;

      // Include entries from the exact keyframe range
      if (entry->timestamp >= actualStartTimestamp && entry->timestamp <= actualEndTimestamp)
      {
        playback::SampleTableEntry sampleEntry;
        sampleEntry.dts = entry->timestamp;
        sampleEntry.dtsMs = entry->timestamp * av_q2d(timeBase) * 1000.0;
        sampleEntry.pos = entry->pos;
        sampleEntry.size = entry->size;
        sampleEntry.isKeyframe = (entry->flags & AVINDEX_KEYFRAME) != 0;
        sampleEntry.flags = entry->flags;

        outResult->sampleTableEntries.push_back(sampleEntry);
      }

      // Stop if we've gone past our end time
      if (entry->timestamp > actualEndTimestamp)
      {
        break;
      }
    }

    log_trace("Found " + std::to_string(outResult->sampleTableEntries.size()) + 
             " sample table entries from keyframe range (exact match with byte range)");

    return true;
  }

  void VideoSource::cleanup()
  {
    // Close format context first - this will also close any associated I/O
    if (formatContext_)
    {
      avformat_close_input(&formatContext_);
      formatContext_ = nullptr;
    }

    // Important: Don't free ioBuffer_ or ioContext_ manually!
    // When we set formatContext_->pb = ioContext_, the format context takes ownership
    // and avformat_close_input() will automatically free both the AVIOContext and its buffer
    ioContext_ = nullptr;
    ioBuffer_ = nullptr;

    virtualFilePos_ = 0;
    streams_.clear();
    durationMs_ = 0.0;
  }

} // namespace playback