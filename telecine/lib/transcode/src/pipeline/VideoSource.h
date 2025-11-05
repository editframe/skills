#pragma once

#include <napi.h>
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include "../logging.h"
#include "../FFmpegUtils.h"

extern "C"
{
  struct AVFormatContext;
  struct AVIOContext;
  struct AVPacket;
  struct AVStream;
  struct AVCodecParameters;
}

namespace playback
{
  struct VideoSourceLogTag
  {
    static constexpr const char *prefix = "VideoSource";
  };

  struct VideoStreamInfo
  {
    int index;
    int64_t duration;
    double durationMs;
    AVMediaType codecType;
    AVCodecID codecId;
    std::string codecName;

    // Video specific
    int width = 0;
    int height = 0;
    AVPixelFormat pixelFormat = AV_PIX_FMT_NONE;
    AVRational frameRate = {0, 1};

    // Audio specific
    int channels = 0;
    int sampleRate = 0;
    AVSampleFormat sampleFormat = AV_SAMPLE_FMT_NONE;

    AVRational timeBase;
    const AVCodecParameters *codecParams = nullptr;
  };

  struct SampleTableEntry
  {
    int64_t dts;     // Decode timestamp in stream time base (from index)
    double dtsMs;    // Decode timestamp in milliseconds
    int64_t pos;     // Byte position in file
    int64_t size;    // Size in bytes
    bool isKeyframe; // Whether this is a keyframe
    int flags;       // Raw FFmpeg index entry flags
  };

  struct VideoSourceOptions
  {
    std::string url;
    std::vector<uint8_t> syntheticMp4;
    std::vector<uint8_t> segmentData;
    bool useSyntheticMp4 = false;
    bool useSegmentData = false;
  };

  class VideoSource : public LoggingMixin<VideoSourceLogTag>
  {
  public:
    explicit VideoSource(const VideoSourceOptions &options);
    ~VideoSource();

    // Disable copy/move for now - these are expensive resources
    VideoSource(const VideoSource &) = delete;
    VideoSource &operator=(const VideoSource &) = delete;
    VideoSource(VideoSource &&) = delete;
    VideoSource &operator=(VideoSource &&) = delete;

    // Core functionality
    bool initialize();
    bool seek(double timeMs);
    bool readPacket(AVPacket *packet);
    bool canReadPackets() const { return !options_.useSyntheticMp4; }

    // Add stream filtering capability
    void setStreamFilter(AVMediaType mediaType) {
      streamFilter_ = mediaType;
    }

    // Getters
    const std::string &url() const { return options_.url; }
    double durationMs() const { return durationMs_; }
    const std::vector<VideoStreamInfo> &streams() const { return streams_; }
    AVFormatContext *formatContext() const { return formatContext_; }

    // Time range analysis
    bool findByteRangeForTimeRange(double startTimeMs, double endTimeMs, int64_t *outStartByte, int64_t *outEndByte, double *outExpandedStartTimeMs = nullptr, double *outExpandedEndTimeMs = nullptr);
    std::vector<playback::SampleTableEntry> getSampleTableEntries(int streamIndex, double startTimeMs, double endTimeMs);
    
    // CRITICAL FIX: Unified keyframe-based fetching to match FFmpeg's approach
    // This method does ONE keyframe search and returns both byte range and sample table entries
    // eliminating the timing mismatch between separate searches
    struct KeyframeAlignedResult {
      int64_t startByte;
      int64_t endByte;
      double expandedStartTimeMs;
      double expandedEndTimeMs;
      std::vector<playback::SampleTableEntry> sampleTableEntries;
    };
    
    bool findKeyframeAlignedData(int streamIndex, double startTimeMs, double endTimeMs, KeyframeAlignedResult *outResult);
    
    bool hasIndexEntries() const;

    // Resource management - explicit cleanup
    void dispose();
    bool isDisposed() const { return disposed_; }

  private:
    VideoSourceOptions options_;
    AVFormatContext *formatContext_ = nullptr;
    AVIOContext *ioContext_ = nullptr;
    uint8_t *ioBuffer_ = nullptr;
    AVMediaType streamFilter_ = AVMEDIA_TYPE_UNKNOWN;  // No filtering by default

    // Synthetic MP4 handling
    size_t virtualFilePos_ = 0;

    // Stream information cache
    std::vector<VideoStreamInfo> streams_;
    double durationMs_ = 0.0;
    bool disposed_ = false;

    // Custom I/O functions for synthetic MP4
    static int readFunction(void *opaque, uint8_t *buf, int bufSize);
    static int64_t seekFunction(void *opaque, int64_t offset, int whence);

    bool openInputSource();
    bool openWithSyntheticMp4();
    bool openWithSegmentData();
    bool openWithUrl();
    bool openWithCustomIO();
    void extractStreamInfo();
    void cleanup();

    AVIOContext *createCustomIOContext();
    bool isValidTimeBase(const AVRational &timeBase) const;
    bool findStreamByteRange(AVStream *stream, double startTimeSec, double endTimeSec, int64_t *outStartByte, int64_t *outEndByte, double *outExpandedStartTimeMs, double *outExpandedEndTimeMs);
    void findKeyframeIndices(AVStream *stream, int64_t startTimestamp, int64_t endTimestamp, int64_t *leadingKeyframeIndex, int64_t *trailingKeyframeIndex);
    bool calculateByteRangeFromKeyframes(AVStream *stream, int64_t leadingKeyframeIndex, int64_t trailingKeyframeIndex, int64_t *outStartByte, int64_t *outEndByte, double *outExpandedStartTimeMs, double *outExpandedEndTimeMs);
  };

} // namespace playback