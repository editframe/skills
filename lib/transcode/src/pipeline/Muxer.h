#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include "../logging.h"

extern "C"
{
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
#include <libavutil/dict.h>
#include <libavutil/mathematics.h>
}

namespace playback
{
  struct MuxerLogTag
  {
    static constexpr const char *prefix = "Muxer";
  };

  // Muxer configuration options
  struct MuxerOptions
  {
    // Container format
    std::string format;   // "mp4", "webm", "mkv", "avi", "mov", etc.
    std::string filename; // Output filename or URL

    // Video stream options (if present)
    std::optional<int> videoCodecId;
    std::optional<int> videoWidth;
    std::optional<int> videoHeight;
    std::optional<AVRational> videoFrameRate;
    std::optional<AVRational> videoTimeBase;
    std::optional<int> videoBitrate;
    std::optional<int> videoPixelFormat;

    // Audio stream options (if present)
    std::optional<int> audioCodecId;
    std::optional<int> audioChannels;
    std::optional<int> audioSampleRate;
    std::optional<int> audioSampleFormat;
    std::optional<AVRational> audioTimeBase;
    std::optional<int> audioBitrate;

    // Container options
    bool fastStart = false;   // Move moov atom to beginning (for MP4)
    int fragmentDuration = 0; // Fragment duration in seconds (for fragmented MP4)
    std::string movFlags;     // MP4 muxer flags

    // Metadata
    std::string title;
    std::string artist;
    std::string album;
    std::string comment;
    std::string copyright;
    std::string description;
  };

  // Input packet information
  struct InputPacketInfo
  {
    uint8_t *data;
    int size;
    int64_t pts;
    int64_t dts;
    int streamIndex; // 0 for video, 1 for audio
    int duration;
    int flags;                 // AVPKT_FLAG_KEY, etc.
    AVRational sourceTimeBase; // Timebase of the source (encoder) for proper rescaling

    // Constructor
    InputPacketInfo(uint8_t *data, int size, int64_t pts, int64_t dts,
                    int streamIndex, int duration = 0, int flags = 0,
                    AVRational sourceTimeBase = {1, 1000000}) // Default to microseconds
        : data(data), size(size), pts(pts), dts(dts),
          streamIndex(streamIndex), duration(duration), flags(flags),
          sourceTimeBase(sourceTimeBase)
    {
    }
  };

  // Muxer statistics
  struct MuxerStats
  {
    int64_t videoPacketsWritten = 0;
    int64_t audioPacketsWritten = 0;
    int64_t totalBytesWritten = 0;
    double videoDuration = 0.0; // in seconds
    double audioDuration = 0.0; // in seconds
    bool isFinalized = false;
  };

  class Muxer : public LoggingMixin<MuxerLogTag>
  {
  public:
    Muxer();
    ~Muxer();

    // Initialize muxer with options
    bool initialize(const MuxerOptions &options);

    // Add video/audio streams (call before writing packets)
    bool addVideoStream(int codecId, int width, int height,
                        AVRational frameRate, AVRational timeBase,
                        int bitrate = 0, int pixelFormat = AV_PIX_FMT_YUV420P,
                        uint8_t *extradata = nullptr, int extradataSize = 0);
    bool addAudioStream(int codecId, int channels, int sampleRate,
                        AVRational timeBase, int bitrate = 0,
                        int sampleFormat = AV_SAMPLE_FMT_FLTP,
                        uint8_t *extradata = nullptr, int extradataSize = 0);

    // New methods that accept encoder parameters directly (preferred for transcoding)
    bool addVideoStreamFromEncoder(const AVCodecParameters *codecpar,
                                   AVRational timeBase, AVRational frameRate);
    bool addAudioStreamFromEncoder(const AVCodecParameters *codecpar,
                                   AVRational timeBase);

    // Start writing (call after adding all streams)
    bool writeHeader();

    // Write encoded packets
    bool writePacket(const InputPacketInfo &packetInfo);

    // Finalize and close output
    bool finalize();

    // Clean up resources
    void dispose();

    // Getters
    bool isInitialized() const { return formatContext_ != nullptr; }
    bool hasVideoStream() const { return videoStreamIndex_ >= 0; }
    bool hasAudioStream() const { return audioStreamIndex_ >= 0; }
    const std::string &getFormat() const { return format_; }
    const std::string &getFilename() const { return filename_; }
    const MuxerStats &getStats() const { return stats_; }

  private:
    // FFmpeg context
    AVFormatContext *formatContext_ = nullptr;
    const AVOutputFormat *outputFormat_ = nullptr;

    // Stream information
    AVStream *videoStream_ = nullptr;
    AVStream *audioStream_ = nullptr;
    int videoStreamIndex_ = -1;
    int audioStreamIndex_ = -1;

    // Configuration
    std::string format_;
    std::string filename_;
    MuxerOptions options_;

    // Statistics
    MuxerStats stats_;

    // State
    bool headerWritten_ = false;
    bool finalized_ = false;

    // Per-stream DTS tracking for monotonicity enforcement
    int64_t lastVideoDts_ = AV_NOPTS_VALUE;
    int64_t lastAudioDts_ = AV_NOPTS_VALUE;

    // Helper methods
    bool configureFormat();
    bool setupVideoStream(AVStream *stream, int codecId, int width, int height,
                          AVRational frameRate, AVRational timeBase,
                          int bitrate, int pixelFormat,
                          uint8_t *extradata, int extradataSize);
    bool setupAudioStream(AVStream *stream, int codecId, int channels,
                          int sampleRate, AVRational timeBase,
                          int bitrate, int sampleFormat,
                          uint8_t *extradata, int extradataSize);
    bool setMetadata();
    bool configureContainer();
    bool validateStreamIndex(const InputPacketInfo &packetInfo);
    AVPacket *createPacketFromInfo(const InputPacketInfo &packetInfo);
    bool processAndWritePacket(AVPacket *packet, const InputPacketInfo &packetInfo);
    void normalizePacketTimestamps(AVPacket *packet);
    void updateStats(const InputPacketInfo &packetInfo);
  };

} // namespace playback