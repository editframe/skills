#include "Packet.h"

extern "C"
{
#include <libavcodec/avcodec.h>
}

namespace playback
{

  Packet::Packet(const PacketOptions &options)
  {
    initialize(options);
  }

  Packet::Packet(const uint8_t *data, size_t size, int64_t pts, int64_t dts)
  {
    PacketOptions options;
    if (data && size > 0)
    {
      options.data.assign(data, data + size);
    }
    options.pts = pts;
    options.dts = dts;
    initialize(options);
  }

  Packet::~Packet()
  {
    cleanup();
  }

  Packet::Packet(Packet &&other) noexcept
  {
    moveFrom(std::move(other));
  }

  Packet &Packet::operator=(Packet &&other) noexcept
  {
    if (this != &other)
    {
      cleanup();
      moveFrom(std::move(other));
    }
    return *this;
  }

  void Packet::initialize(const PacketOptions &options)
  {
    cleanup(); // Ensure clean state

    packet_ = av_packet_alloc();
    if (!packet_)
    {
      log_error("Failed to allocate AVPacket");
      return;
    }

    // Mark as not disposed so setData() will work
    disposed_ = false;

    // Set packet data if provided
    if (!options.data.empty())
    {
      if (!setData(options.data))
      {
        cleanup();
        return;
      }
    }

    // Set timing information
    packet_->pts = options.pts;
    packet_->dts = options.dts;
    packet_->duration = options.duration;

    // Set stream information
    packet_->stream_index = options.streamIndex;

    // Set packet flags
    if (options.isKeyFrame)
    {
      packet_->flags |= AV_PKT_FLAG_KEY;
    }

    // Set position
    packet_->pos = options.pos;
  }

  void Packet::cleanup()
  {
    if (packet_)
    {
      av_packet_free(&packet_);
      packet_ = nullptr;
    }
    disposed_ = true;
  }

  void Packet::moveFrom(Packet &&other) noexcept
  {
    packet_ = other.packet_;
    disposed_ = other.disposed_;

    other.packet_ = nullptr;
    other.disposed_ = true;
  }

  std::unique_ptr<Packet> Packet::clone() const
  {
    if (!isValid())
    {
      return nullptr;
    }

    PacketOptions options;

    // Copy data
    if (packet_->data && packet_->size > 0)
    {
      options.data.assign(packet_->data, packet_->data + packet_->size);
    }

    // Copy timing information
    options.pts = packet_->pts;
    options.dts = packet_->dts;
    options.duration = packet_->duration;

    // Copy stream information
    options.streamIndex = packet_->stream_index;

    // Copy flags
    options.isKeyFrame = (packet_->flags & AV_PKT_FLAG_KEY) != 0;

    // Copy position
    options.pos = packet_->pos;

    return std::make_unique<Packet>(options);
  }

  const uint8_t *Packet::data() const
  {
    return isValid() ? packet_->data : nullptr;
  }

  size_t Packet::size() const
  {
    return isValid() ? static_cast<size_t>(packet_->size) : 0;
  }

  int64_t Packet::pts() const
  {
    return isValid() ? packet_->pts : AV_NOPTS_VALUE;
  }

  int64_t Packet::dts() const
  {
    return isValid() ? packet_->dts : AV_NOPTS_VALUE;
  }

  int64_t Packet::duration() const
  {
    return isValid() ? packet_->duration : 0;
  }

  int Packet::streamIndex() const
  {
    return isValid() ? packet_->stream_index : 0;
  }

  bool Packet::isKeyFrame() const
  {
    return isValid() ? (packet_->flags & AV_PKT_FLAG_KEY) != 0 : false;
  }

  int64_t Packet::pos() const
  {
    return isValid() ? packet_->pos : -1;
  }

  void Packet::setPts(int64_t pts)
  {
    if (isValid())
    {
      packet_->pts = pts;
    }
  }

  void Packet::setDts(int64_t dts)
  {
    if (isValid())
    {
      packet_->dts = dts;
    }
  }

  void Packet::setDuration(int64_t duration)
  {
    if (isValid())
    {
      packet_->duration = duration;
    }
  }

  void Packet::setStreamIndex(int streamIndex)
  {
    if (isValid())
    {
      packet_->stream_index = streamIndex;
    }
  }

  void Packet::setKeyFrame(bool isKeyFrame)
  {
    if (isValid())
    {
      if (isKeyFrame)
      {
        packet_->flags |= AV_PKT_FLAG_KEY;
      }
      else
      {
        packet_->flags &= ~AV_PKT_FLAG_KEY;
      }
    }
  }

  void Packet::setPos(int64_t pos)
  {
    if (isValid())
    {
      packet_->pos = pos;
    }
  }

  bool Packet::setData(const uint8_t *data, size_t size)
  {
    if (!isValid() || !data || size == 0)
    {
      return false;
    }

    // Free existing data if any
    if (packet_->data)
    {
      av_freep(&packet_->data);
      packet_->size = 0;
    }

    // Allocate new data buffer
    packet_->data = static_cast<uint8_t *>(av_malloc(size + AV_INPUT_BUFFER_PADDING_SIZE));
    if (!packet_->data)
    {
      log_error("Failed to allocate packet data buffer");
      return false;
    }

    // Copy data and set size
    memcpy(packet_->data, data, size);
    memset(packet_->data + size, 0, AV_INPUT_BUFFER_PADDING_SIZE); // Zero padding
    packet_->size = static_cast<int>(size);

    return true;
  }

  bool Packet::setData(const std::vector<uint8_t> &data)
  {
    return setData(data.data(), data.size());
  }

  void Packet::dispose()
  {
    cleanup();
  }

} // namespace playback