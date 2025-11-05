#pragma once

#include <napi.h>
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include "../logging.h"
#include "../FFmpegUtils.h"

#include "Decoder.h" // For FrameInfo

extern "C"
{
  struct AVCodecContext;
  struct AVCodecParameters;
  struct AVFrame;
  struct AVPacket;
  struct AVCodec;
  enum AVPixelFormat;
  enum AVSampleFormat;
}

namespace playback
{
  struct EncoderLogTag
  {
    static constexpr const char *prefix = "Encoder";
  };

  struct EncoderOptions
  {
    // Media type and codec
    AVMediaType mediaType = AVMEDIA_TYPE_UNKNOWN;
    int codecId = 0; // AVCodecID value

    // Video encoding parameters
    int width = 0;
    int height = 0;
    AVPixelFormat pixelFormat = AV_PIX_FMT_NONE;
    AVRational frameRate = {25, 1}; // Default 25 FPS
    AVRational timeBase = {1, 25};
    int64_t videoBitrate = 1000000; // 1 Mbps default

    // Audio encoding parameters
    int channels = 0;
    int sampleRate = 0;
    AVSampleFormat sampleFormat = AV_SAMPLE_FMT_NONE;
    int64_t audioBitrate = 128000; // 128 kbps default

    // Quality and performance settings
    int quality = 23;              // CRF value for video (lower = better quality)
    std::string preset = "medium"; // Encoding speed preset
    std::string profile = "";      // Codec profile (e.g., "high" for H.264)
    int maxBFrames = 3;            // Maximum consecutive B-frames
    int gopSize = 250;             // Group of Pictures size

    // Advanced options
    std::string extraOpts; // Additional FFmpeg options
  };

  // Encoded packet information
  struct EncodedPacketInfo
  {
    // Packet timing
    int64_t pts = AV_NOPTS_VALUE;
    int64_t dts = AV_NOPTS_VALUE;
    int64_t duration = 0;

    // Packet properties
    AVMediaType mediaType = AVMEDIA_TYPE_UNKNOWN;
    int streamIndex = 0;
    bool isKeyFrame = false;
    int size = 0;

    // Packet data
    std::vector<uint8_t> data;

    // Internal packet reference for memory management
    const AVPacket *sourcePacket = nullptr;
  };

  class Encoder : public LoggingMixin<EncoderLogTag>
  {
  public:
    explicit Encoder(const EncoderOptions &options);
    ~Encoder();

    // Disable copy/move for now - these are expensive resources
    Encoder(const Encoder &) = delete;
    Encoder &operator=(const Encoder &) = delete;
    Encoder(Encoder &&) = delete;
    Encoder &operator=(Encoder &&) = delete;

    // Core functionality
    bool initialize();

    // Legacy method (kept for compatibility)
    bool encode(const AVFrame *inputFrame, std::vector<EncodedPacketInfo> &outputPackets);

    // Method that accepts frame with explicit timestamp
    bool encodeWithTimestamp(const AVFrame *inputFrame, int64_t pts, std::vector<EncodedPacketInfo> &outputPackets);

    // New method using frame pointers
    bool encodeFrame(uintptr_t inputFramePtr, std::vector<EncodedPacketInfo> &outputPackets);

    // Convenience method to encode from FrameInfo (from Decoder/Filter)
    bool encodeFrameInfo(const FrameInfo &frameInfo, std::vector<EncodedPacketInfo> &outputPackets);

    // Method to encode FrameInfo with explicit source timebase for timestamp conversion
    bool encodeFrameInfo(const FrameInfo &frameInfo, AVRational sourceTimeBase, std::vector<EncodedPacketInfo> &outputPackets);

    bool flush(std::vector<EncodedPacketInfo> &outputPackets); // Get remaining packets

    // Getters
    AVMediaType mediaType() const { return options_.mediaType; }
    int codecId() const { return options_.codecId; }
    std::string codecName() const;
    bool isInitialized() const { return codecContext_ != nullptr && !disposed_; }
    AVRational getTimeBase() const { return codecContext_ ? codecContext_->time_base : AVRational{0, 1}; }

    // Get encoder-generated extradata (SPS/PPS for H.264, etc.)
    std::vector<uint8_t> getExtradata() const;

    // Get complete codec parameters from encoder (caller must free with avcodec_parameters_free)
    AVCodecParameters *getCodecParameters() const;

    // Encoding statistics
    int64_t getFramesEncoded() const { return framesEncoded_; }
    int64_t getBytesEncoded() const { return bytesEncoded_; }

    // Resource management - explicit cleanup
    void dispose();
    bool isDisposed() const { return disposed_; }

  private:
    EncoderOptions options_;
    AVCodecContext *codecContext_ = nullptr;
    const AVCodec *codec_ = nullptr;
    AVPacket *tempPacket_ = nullptr; // Temporary packet for encoding

    // Statistics
    int64_t framesEncoded_ = 0;
    int64_t bytesEncoded_ = 0;
    bool disposed_ = false;

    // AAC encoder delay compensation
    int64_t aacEncoderDelay_ = -1; // -1 means not yet determined

    // Helper methods
    bool findAndOpenCodec();
    bool configureVideoEncoder();
    bool configureAudioEncoder();
    void extractPacketInfo(const AVPacket *packet, EncodedPacketInfo &packetInfo);
    void applyAdvancedOptions();
    AVFrame *createFrameWithTimestamp(const AVFrame *inputFrame, int64_t pts);
    bool receiveEncodedPackets(std::vector<EncodedPacketInfo> &outputPackets);
    void handleEncoderDelay(AVPacket *packet);
    void cleanup();
  };

} // namespace playback