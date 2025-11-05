#pragma once

#include <napi.h>
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <unordered_map>
#include "../logging.h"
#include "../FFmpegUtils.h"

extern "C"
{
  struct AVCodecContext;
  struct AVCodec;
  struct AVFrame;
  struct AVPacket;
}

namespace playback
{
  struct DecoderLogTag
  {
    static constexpr const char *prefix = "Decoder";
  };

  struct FrameInfo
  {
    // Frame pointer for TypeScript (numeric pointer value, not binary data)
    uintptr_t framePtr = 0;

    // Common properties
    int64_t pts = AV_NOPTS_VALUE;
    int64_t dts = AV_NOPTS_VALUE;
    int format = -1;
    AVMediaType mediaType = AVMEDIA_TYPE_UNKNOWN;

    // Video frame properties
    int width = 0;
    int height = 0;
    AVPixelFormat pixelFormat = AV_PIX_FMT_NONE;

    // Audio frame properties
    int channels = 0;
    int sampleRate = 0;
    int samplesPerChannel = 0;
    AVSampleFormat sampleFormat = AV_SAMPLE_FMT_NONE;

    // Frame data pointers for compatibility
    std::vector<uint8_t *> data;
    std::vector<int> linesize;

    // Internal frame reference for memory management
    const AVFrame *sourceFrame = nullptr;
  };

  struct DecoderOptions
  {
    AVCodecID codecId = AV_CODEC_ID_NONE;
    AVMediaType mediaType = AVMEDIA_TYPE_UNKNOWN;

    // Optional codec parameters for initialization
    int width = 0;
    int height = 0;
    int channels = 0;
    int sampleRate = 0;
    AVPixelFormat pixelFormat = AV_PIX_FMT_NONE;
    AVSampleFormat sampleFormat = AV_SAMPLE_FMT_NONE;

    // Source stream timebase (prevents timestamp corruption during flush)
    AVRational timeBase = {0, 1};

    // Optional extra data (e.g., codec private data)
    std::vector<uint8_t> extradata;
  };

  class Decoder : public LoggingMixin<DecoderLogTag>
  {
  public:
    explicit Decoder(const DecoderOptions &options);
    ~Decoder();

    // Disable copy/move for now - these are expensive resources
    Decoder(const Decoder &) = delete;
    Decoder &operator=(const Decoder &) = delete;
    Decoder(Decoder &&) = delete;
    Decoder &operator=(Decoder &&) = delete;

    // Core functionality
    bool initialize();
    bool decode(const AVPacket *packet, std::vector<FrameInfo> &frames);
    bool flush(std::vector<FrameInfo> &frames); // Get remaining frames from decoder

    // Frame access by pointer (for other components)
    AVFrame *getFrame(uintptr_t framePtr);

    // Getters
    AVCodecID codecId() const { return options_.codecId; }
    AVMediaType mediaType() const { return options_.mediaType; }
    std::string codecName() const;
    bool isInitialized() const { return codecContext_ != nullptr && !disposed_; }

    // Resource management - explicit cleanup
    void dispose();
    bool isDisposed() const { return disposed_; }

    // PTS tracking management
    void resetPtsTracking() { next_pts_ = 0; }

  private:
    DecoderOptions options_;
    const AVCodec *codec_ = nullptr;
    AVCodecContext *codecContext_ = nullptr;
    AVFrame *frame_ = nullptr; // Reusable frame for decoding

    bool disposed_ = false;
    int64_t next_pts_ = 0; // Track next expected PTS for frames with invalid timestamps

    // Frame storage for this decoder instance
    using FrameDeleter = void (*)(AVFrame *);
    std::unordered_map<uintptr_t, std::unique_ptr<AVFrame, FrameDeleter>> frames_;

    // Helper methods
    bool findAndOpenCodec();
    void extractFrameInfo(const AVFrame *frame, FrameInfo &frameInfo);
    int64_t determineBestPts(const AVFrame *frame);
    uintptr_t createAndStoreFrameCopy(const AVFrame *frame, int64_t correctedPts);
    void extractVideoProperties(const AVFrame *frame, FrameInfo &frameInfo);
    void extractAudioProperties(const AVFrame *frame, FrameInfo &frameInfo);
    void updatePtsTracking(int64_t currentPts);
    int64_t calculateFrameDuration();
    void cleanup();
  };

} // namespace playback