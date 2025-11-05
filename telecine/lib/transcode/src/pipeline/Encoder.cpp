#include "Encoder.h"
#include "../logging.h"

extern "C"
{
#include <libavcodec/avcodec.h>
#include <libavutil/opt.h>
#include <libavutil/pixdesc.h>
#include <libavutil/channel_layout.h>
}

namespace playback
{

  Encoder::Encoder(const EncoderOptions &options)
      : options_(options)
  {
  }

  Encoder::~Encoder()
  {
    dispose();
  }

  bool Encoder::initialize()
  {
    if (disposed_)
    {
      log_error("Cannot initialize disposed Encoder");
      return false;
    }

    if (options_.mediaType == AVMEDIA_TYPE_UNKNOWN)
    {
      log_error("Media type must be specified");
      return false;
    }

    if (options_.codecId == 0)
    {
      log_error("Codec ID must be specified");
      return false;
    }

    log_trace("Initializing Encoder for " + std::string(options_.mediaType == AVMEDIA_TYPE_VIDEO ? "video" : "audio"));
    log_trace("Codec ID: " + std::to_string(options_.codecId));

    // Find and open codec
    if (!findAndOpenCodec())
    {
      cleanup();
      return false;
    }

    // Configure encoder based on media type
    if (options_.mediaType == AVMEDIA_TYPE_VIDEO)
    {
      if (!configureVideoEncoder())
      {
        cleanup();
        return false;
      }
    }
    else if (options_.mediaType == AVMEDIA_TYPE_AUDIO)
    {
      if (!configureAudioEncoder())
      {
        cleanup();
        return false;
      }
    }

    // Apply advanced options
    applyAdvancedOptions();

    // Open the encoder
    int ret = avcodec_open2(codecContext_, codec_, nullptr);
    if (ret < 0)
    {
      log_error("Failed to open encoder: " + av_error_to_string(ret));
      cleanup();
      return false;
    }

    // Allocate temporary packet
    tempPacket_ = av_packet_alloc();
    if (!tempPacket_)
    {
      log_error("Failed to allocate temporary packet");
      cleanup();
      return false;
    }

    log_trace("Encoder initialized successfully");
    return true;
  }

  bool Encoder::findAndOpenCodec()
  {
    codec_ = avcodec_find_encoder(static_cast<AVCodecID>(options_.codecId));
    if (!codec_)
    {
      log_error("Codec not found for ID: " + std::to_string(options_.codecId));
      return false;
    }

    log_trace("Found codec: " + std::string(codec_->name));

    codecContext_ = avcodec_alloc_context3(codec_);
    if (!codecContext_)
    {
      log_error("Failed to allocate codec context");
      return false;
    }

    return true;
  }

  bool Encoder::configureVideoEncoder()
  {
    if (options_.width <= 0 || options_.height <= 0)
    {
      log_error("Invalid video dimensions: " + std::to_string(options_.width) + "x" + std::to_string(options_.height));
      return false;
    }

    // Basic video parameters
    codecContext_->codec_type = AVMEDIA_TYPE_VIDEO;
    codecContext_->width = options_.width;
    codecContext_->height = options_.height;
    codecContext_->pix_fmt = options_.pixelFormat;
    codecContext_->framerate = options_.frameRate;
    codecContext_->time_base = options_.timeBase;

    // Bitrate and quality settings
    if (options_.videoBitrate > 0)
    {
      codecContext_->bit_rate = options_.videoBitrate;
    }

    // GOP and B-frame settings
    codecContext_->gop_size = options_.gopSize;
    codecContext_->max_b_frames = options_.maxBFrames;

    // Set quality (CRF) if specified
    if (options_.quality >= 0)
    {
      char crf_str[16];
      snprintf(crf_str, sizeof(crf_str), "%d", options_.quality);
      av_opt_set(codecContext_->priv_data, "crf", crf_str, 0);
    }

    // Set preset
    if (!options_.preset.empty())
    {
      av_opt_set(codecContext_->priv_data, "preset", options_.preset.c_str(), 0);
    }

    // Set profile if specified
    if (!options_.profile.empty())
    {
      av_opt_set(codecContext_->priv_data, "profile", options_.profile.c_str(), 0);
    }

    log_trace("Video encoder configured: " + std::to_string(options_.width) + "x" + std::to_string(options_.height) +
              ", bitrate=" + std::to_string(options_.videoBitrate) + ", quality=" + std::to_string(options_.quality));

    return true;
  }

  bool Encoder::configureAudioEncoder()
  {
    if (options_.channels <= 0 || options_.sampleRate <= 0)
    {
      log_error("Invalid audio parameters: " + std::to_string(options_.channels) + " channels, " + std::to_string(options_.sampleRate) + " Hz");
      return false;
    }

    // Basic audio parameters
    codecContext_->codec_type = AVMEDIA_TYPE_AUDIO;
    codecContext_->sample_rate = options_.sampleRate;
    codecContext_->sample_fmt = options_.sampleFormat;
    codecContext_->time_base = {1, options_.sampleRate};

    // Set channel layout using new API
    av_channel_layout_default(&codecContext_->ch_layout, options_.channels);

    // Bitrate settings
    if (options_.audioBitrate > 0)
    {
      codecContext_->bit_rate = options_.audioBitrate;
    }

    // Set AAC profile explicitly for QuickTime compatibility
    if (options_.codecId == AV_CODEC_ID_AAC)
    {
      // Set AAC-LC profile explicitly
      codecContext_->profile = FF_PROFILE_AAC_LOW;
      
      // This disables Perceptual Noise Substitution (PNS). According to the documentation:
      av_opt_set_int(codecContext_->priv_data, "aac_pns", 0, 0); // Disable PNS for consistent timing
      
      log_trace("Setting AAC-LC profile with gapless options for QuickTime compatibility");
    }

    // Set profile if specified in options
    if (!options_.profile.empty())
    {
      log_trace("Setting profile: " + options_.profile);
      av_opt_set(codecContext_->priv_data, "profile", options_.profile.c_str(), 0);
    }

    log_trace("Audio encoder configured: " + std::to_string(options_.channels) + " channels, " +
              std::to_string(options_.sampleRate) + " Hz, bitrate=" + std::to_string(options_.audioBitrate));

    return true;
  }

  void Encoder::applyAdvancedOptions()
  {
    // Apply any additional options from extraOpts
    if (!options_.extraOpts.empty())
    {
      log_trace("Applying extra options: " + options_.extraOpts);
      // Note: This would require parsing the extraOpts string and applying individual options
      // For now, this is a placeholder for future advanced option support
    }
  }

  bool Encoder::encode(const AVFrame *inputFrame, std::vector<EncodedPacketInfo> &outputPackets)
  {
    if (disposed_ || !codecContext_)
    {
      log_error("Cannot encode with disposed or uninitialized Encoder");
      return false;
    }

    outputPackets.clear();

    // Send frame to encoder
    int ret = avcodec_send_frame(codecContext_, inputFrame);
    if (ret < 0)
    {
      log_warn("encode: Failed to send frame to encoder: " + av_error_to_string(ret));
      return false;
    }

    // Receive and process encoded packets
    return receiveEncodedPackets(outputPackets);
  }

  bool Encoder::encodeWithTimestamp(const AVFrame *inputFrame, int64_t pts, std::vector<EncodedPacketInfo> &outputPackets)
  {
    if (disposed_ || !codecContext_)
    {
      log_error("Cannot encode with disposed or uninitialized Encoder");
      return false;
    }

    outputPackets.clear();

    // Create frame copy with timestamp
    AVFrame *frameWithTimestamp = createFrameWithTimestamp(inputFrame, pts);
    if (!frameWithTimestamp)
    {
      return false;
    }

    // Send frame to encoder
    int ret = avcodec_send_frame(codecContext_, frameWithTimestamp);
    av_frame_free(&frameWithTimestamp);

    if (ret < 0)
    {
      log_warn("encodeWithTimestamp: Failed to send frame to encoder: " + av_error_to_string(ret));
      return false;
    }

    // Receive and process encoded packets
    return receiveEncodedPackets(outputPackets);
  }

  AVFrame *Encoder::createFrameWithTimestamp(const AVFrame *inputFrame, int64_t pts)
  {
    AVFrame *frameWithTimestamp = av_frame_alloc();
    if (!frameWithTimestamp)
    {
      log_error("Failed to allocate frame for timestamp setting");
      return nullptr;
    }

    // Copy frame data and properties
    int ret = av_frame_ref(frameWithTimestamp, inputFrame);
    if (ret < 0)
    {
      log_error("Failed to reference frame: " + av_error_to_string(ret));
      av_frame_free(&frameWithTimestamp);
      return nullptr;
    }

    // Set the timestamp in encoder timebase
    frameWithTimestamp->pts = pts;
    log_trace("Setting frame PTS to " + std::to_string(pts) +
              " (timebase " + std::to_string(codecContext_->time_base.num) + "/" + std::to_string(codecContext_->time_base.den) + ")");

    return frameWithTimestamp;
  }

  bool Encoder::receiveEncodedPackets(std::vector<EncodedPacketInfo> &outputPackets)
  {
    while (true)
    {
      int ret = avcodec_receive_packet(codecContext_, tempPacket_);
      if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF)
      {
        // No more packets available right now
        break;
      }
      else if (ret < 0)
      {
        log_warn("Failed to receive packet from encoder: " + av_error_to_string(ret));
        break;
      }

      // Handle encoder delay compensation
      handleEncoderDelay(tempPacket_);

      // Extract packet information
      EncodedPacketInfo packetInfo;
      extractPacketInfo(tempPacket_, packetInfo);
      outputPackets.push_back(packetInfo);

      // Update statistics
      framesEncoded_++;
      bytesEncoded_ += tempPacket_->size;

      // Unref the packet for reuse
      av_packet_unref(tempPacket_);
    }

    return true;
  }

  void Encoder::handleEncoderDelay(AVPacket *packet)
  {
    // Handle encoder delay for audio (AAC typically has 1024 sample delay)
    if (options_.mediaType == AVMEDIA_TYPE_AUDIO && options_.codecId == AV_CODEC_ID_AAC)
    {
      // Determine AAC encoder delay if not yet known
      if (aacEncoderDelay_ == -1)
      {
        // AAC-LC typically has 1024 samples of delay
        aacEncoderDelay_ = 1024;
        log_trace("Determined AAC encoder delay: " + std::to_string(aacEncoderDelay_) + " samples");
      }
      
      // For gapless concatenation, we need to preserve the encoder delay information
      // instead of just offsetting to 0. The muxer will handle proper timing.
      if (packet->pts < 0)
      {
        log_trace("AAC encoder delay causing negative PTS: " + std::to_string(packet->pts) + 
                  " (delay=" + std::to_string(aacEncoderDelay_) + " samples)");
        packet->pts = 0;
      }
      if (packet->dts < 0)
      {
        log_trace("AAC encoder delay causing negative DTS: " + std::to_string(packet->dts) + 
                  " (delay=" + std::to_string(aacEncoderDelay_) + " samples)");
        packet->dts = 0;
      }
    }
  }

  bool Encoder::flush(std::vector<EncodedPacketInfo> &outputPackets)
  {
    if (disposed_ || !codecContext_)
    {
      log_error("Cannot flush disposed or uninitialized Encoder");
      return false;
    }

    log_trace("Flushing encoder");

    // Send null frame to signal end of stream
    return encode(nullptr, outputPackets);
  }

  void Encoder::extractPacketInfo(const AVPacket *packet, EncodedPacketInfo &packetInfo)
  {
    packetInfo.pts = packet->pts;
    packetInfo.dts = packet->dts;
    packetInfo.mediaType = options_.mediaType;

    // Calculate duration properly for video packets
    if (options_.mediaType == AVMEDIA_TYPE_VIDEO)
    {
      // For video, calculate duration from frame rate: duration = timebase_den / frame_rate
      if (options_.frameRate.num > 0 && options_.frameRate.den > 0 && codecContext_->time_base.den > 0)
      {
        // duration = (timebase_den * frame_rate_den) / frame_rate_num
        packetInfo.duration = (int64_t)codecContext_->time_base.den * options_.frameRate.den / options_.frameRate.num;
      }
      else
      {
        // Fallback: use packet duration if available, otherwise assume 30fps
        packetInfo.duration = packet->duration > 0 ? packet->duration : codecContext_->time_base.den / 30;
      }
    }
    else
    {
      // For audio, use packet duration (should be set correctly by encoder)
      packetInfo.duration = packet->duration;
    }

    // Set stream index based on media type (encoder doesn't set this correctly)
    // Video = stream 0, Audio = stream 1 (standard convention)
    packetInfo.streamIndex = (options_.mediaType == AVMEDIA_TYPE_VIDEO) ? 0 : 1;

    packetInfo.isKeyFrame = (packet->flags & AV_PKT_FLAG_KEY) != 0;
    packetInfo.size = packet->size;
    packetInfo.sourcePacket = packet;

    // Copy packet data
    packetInfo.data.resize(packet->size);
    std::memcpy(packetInfo.data.data(), packet->data, packet->size);

    if (options_.mediaType == AVMEDIA_TYPE_VIDEO)
    {
      log_trace("Encoded video packet: size=" + std::to_string(packetInfo.size) +
                ", keyframe=" + (packetInfo.isKeyFrame ? "yes" : "no") +
                ", pts=" + std::to_string(packetInfo.pts) +
                ", dts=" + std::to_string(packetInfo.dts) +
                ", duration=" + std::to_string(packetInfo.duration));
    }
    else if (options_.mediaType == AVMEDIA_TYPE_AUDIO)
    {
      log_trace("Encoded audio packet: size=" + std::to_string(packetInfo.size) +
                ", pts=" + std::to_string(packetInfo.pts) +
                ", duration=" + std::to_string(packetInfo.duration));
    }
  }

  std::string Encoder::codecName() const
  {
    if (codec_)
    {
      return std::string(codec_->name);
    }
    return "unknown";
  }

  std::vector<uint8_t> Encoder::getExtradata() const
  {
    std::vector<uint8_t> extradata;

    if (codecContext_ && codecContext_->extradata && codecContext_->extradata_size > 0)
    {
      extradata.resize(codecContext_->extradata_size);
      std::memcpy(extradata.data(), codecContext_->extradata, codecContext_->extradata_size);
    }

    return extradata;
  }

  AVCodecParameters *Encoder::getCodecParameters() const
  {
    if (!codecContext_)
    {
      return nullptr;
    }

    AVCodecParameters *params = avcodec_parameters_alloc();
    if (!params)
    {
      return nullptr;
    }

    int ret = avcodec_parameters_from_context(params, codecContext_);
    if (ret < 0)
    {
      avcodec_parameters_free(&params);
      return nullptr;
    }

    return params; // Caller must free with avcodec_parameters_free
  }

  void Encoder::dispose()
  {
    if (disposed_)
    {
      return;
    }

    log_trace("Disposing Encoder");
    log_trace("Statistics: " + std::to_string(framesEncoded_) + " frames encoded, " + std::to_string(bytesEncoded_) + " bytes");
    cleanup();
    disposed_ = true;
  }

  void Encoder::cleanup()
  {
    if (codecContext_)
    {
      avcodec_free_context(&codecContext_);
      codecContext_ = nullptr;
    }

    if (tempPacket_)
    {
      av_packet_free(&tempPacket_);
      tempPacket_ = nullptr;
    }

    // codec_ is a const pointer managed by FFmpeg, don't free it
    codec_ = nullptr;
  }

  bool Encoder::encodeFrame(uintptr_t inputFramePtr, std::vector<EncodedPacketInfo> &outputPackets)
  {
    if (disposed_ || !codecContext_)
    {
      log_error("Cannot encode with disposed or uninitialized Encoder");
      return false;
    }

    outputPackets.clear();

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

    log_trace("Encoding frame pointer " + std::to_string(inputFramePtr) +
              " (" + std::to_string(inputFrame->width) + "x" + std::to_string(inputFrame->height) + ")");

    // Use the existing encode method
    return encode(inputFrame, outputPackets);
  }

  bool Encoder::encodeFrameInfo(const FrameInfo &frameInfo, std::vector<EncodedPacketInfo> &outputPackets)
  {
    if (frameInfo.framePtr == 0)
    {
      log_error("FrameInfo has invalid frame pointer");
      return false;
    }

    log_trace("Encoding FrameInfo with frame pointer " + std::to_string(frameInfo.framePtr));
    return encodeFrame(frameInfo.framePtr, outputPackets);
  }

  bool Encoder::encodeFrameInfo(const FrameInfo &frameInfo, AVRational sourceTimeBase, std::vector<EncodedPacketInfo> &outputPackets)
  {
    if (frameInfo.framePtr == 0)
    {
      log_error("FrameInfo has invalid frame pointer");
      return false;
    }

    // Get frame from pointer
    AVFrame *inputFrame = reinterpret_cast<AVFrame *>(frameInfo.framePtr);
    if (!inputFrame)
    {
      log_error("Failed to get frame from pointer: " + std::to_string(frameInfo.framePtr));
      return false;
    }

    // Convert timestamp from source timebase to encoder timebase
    int64_t encoderPts = av_rescale_q(frameInfo.pts, sourceTimeBase, codecContext_->time_base);

    log_trace("Converting timestamp from " + std::to_string(frameInfo.pts) +
              " (timebase " + std::to_string(sourceTimeBase.num) + "/" + std::to_string(sourceTimeBase.den) + ")" +
              " to " + std::to_string(encoderPts) +
              " (timebase " + std::to_string(codecContext_->time_base.num) + "/" + std::to_string(codecContext_->time_base.den) + ")");

    return encodeWithTimestamp(inputFrame, encoderPts, outputPackets);
  }

} // namespace playback