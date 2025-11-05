#pragma once

#include <napi.h>
#include <vector>
#include <memory>
#include "../logging.h"
#include "../FFmpegUtils.h"

extern "C"
{
  struct AVPacket;
}

namespace playback
{
  struct PacketLogTag
  {
    static constexpr const char *prefix = "Packet";
  };

  struct PacketOptions
  {
    // Core packet data
    std::vector<uint8_t> data;

    // Timing information
    int64_t pts = AV_NOPTS_VALUE;
    int64_t dts = AV_NOPTS_VALUE;
    int64_t duration = 0;

    // Stream information
    int streamIndex = 0;

    // Packet flags
    bool isKeyFrame = false;

    // Additional metadata
    int64_t pos = -1; // Position in stream
  };

  class Packet : public LoggingMixin<PacketLogTag>
  {
  public:
    explicit Packet(const PacketOptions &options);
    explicit Packet(const uint8_t *data, size_t size, int64_t pts = AV_NOPTS_VALUE, int64_t dts = AV_NOPTS_VALUE);
    ~Packet();

    // Disable copy for now - these are expensive resources
    Packet(const Packet &) = delete;
    Packet &operator=(const Packet &) = delete;

    // Move constructor and assignment
    Packet(Packet &&other) noexcept;
    Packet &operator=(Packet &&other) noexcept;

    // Core functionality
    bool isValid() const { return packet_ != nullptr && !disposed_; }
    AVPacket *getAVPacket() const { return packet_; }

    // Create a copy of the packet (deep copy)
    std::unique_ptr<Packet> clone() const;

    // Getters for packet properties
    const uint8_t *data() const;
    size_t size() const;
    int64_t pts() const;
    int64_t dts() const;
    int64_t duration() const;
    int streamIndex() const;
    bool isKeyFrame() const;
    int64_t pos() const;

    // Setters for packet properties
    void setPts(int64_t pts);
    void setDts(int64_t dts);
    void setDuration(int64_t duration);
    void setStreamIndex(int streamIndex);
    void setKeyFrame(bool isKeyFrame);
    void setPos(int64_t pos);

    // Update packet data (creates new copy)
    bool setData(const uint8_t *data, size_t size);
    bool setData(const std::vector<uint8_t> &data);

    // Resource management - explicit cleanup
    void dispose();
    bool isDisposed() const { return disposed_; }

  private:
    AVPacket *packet_ = nullptr;
    bool disposed_ = false;

    // Helper methods
    void initialize(const PacketOptions &options);
    void cleanup();
    void moveFrom(Packet &&other) noexcept;
  };

} // namespace playback