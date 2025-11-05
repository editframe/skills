#include "PngExporter.h"
#include "../FFmpegUtils.h"

extern "C"
{
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/imgutils.h>
#include <libavutil/opt.h>
#include <libswscale/swscale.h>
}

namespace playback
{

  PngExporter::PngExporter()
  {
    log_trace("Creating PngExporter");
  }

  PngExporter::~PngExporter()
  {
    dispose();
  }

  bool PngExporter::exportFrameToPng(uintptr_t framePtr, std::vector<uint8_t> &pngData)
  {
    return exportFrameToPng(framePtr, pngData, 0, 0);
  }

  bool PngExporter::exportFrameToPng(uintptr_t framePtr, std::vector<uint8_t> &pngData,
                                     int targetWidth, int targetHeight)
  {
    if (disposed_)
    {
      log_error("PngExporter is disposed");
      return false;
    }

    if (framePtr == 0)
    {
      log_error("Invalid frame pointer");
      return false;
    }

    // Get frame from pointer
    AVFrame *inputFrame = reinterpret_cast<AVFrame *>(framePtr);
    if (!inputFrame)
    {
      log_error("Failed to get frame from pointer: " + std::to_string(framePtr));
      return false;
    }

    // Validate that this is a video frame
    if (inputFrame->width <= 0 || inputFrame->height <= 0)
    {
      log_error("Invalid frame dimensions: " + std::to_string(inputFrame->width) + "x" + std::to_string(inputFrame->height));
      return false;
    }

    log_trace("Exporting frame pointer " + std::to_string(framePtr) + " (" +
              std::to_string(inputFrame->width) + "x" + std::to_string(inputFrame->height) + ") to PNG");

    // Determine target dimensions
    int outputWidth = (targetWidth > 0) ? targetWidth : inputFrame->width;
    int outputHeight = (targetHeight > 0) ? targetHeight : inputFrame->height;

    // Create RGB frame for PNG encoding
    AVFrame *rgbFrame = av_frame_alloc();
    if (!rgbFrame)
    {
      log_error("Failed to allocate RGB frame");
      return false;
    }

    rgbFrame->format = AV_PIX_FMT_RGB24;
    rgbFrame->width = outputWidth;
    rgbFrame->height = outputHeight;

    int ret = av_frame_get_buffer(rgbFrame, 32);
    if (ret < 0)
    {
      log_error("Failed to allocate RGB frame buffer: " + av_error_to_string(ret));
      av_frame_free(&rgbFrame);
      return false;
    }

    // Convert to RGB
    bool success = convertFrameToRGB(inputFrame, rgbFrame, targetWidth, targetHeight);
    if (!success)
    {
      log_error("Failed to convert frame to RGB");
      av_frame_free(&rgbFrame);
      return false;
    }

    // Encode to PNG
    success = encodeFrameToPng(rgbFrame, pngData);
    if (!success)
    {
      log_error("Failed to encode frame to PNG");
      av_frame_free(&rgbFrame);
      return false;
    }

    av_frame_free(&rgbFrame);
    log_trace("Successfully exported frame to PNG: " + std::to_string(pngData.size()) + " bytes");
    return true;
  }

  bool PngExporter::convertFrameToRGB(const AVFrame *inputFrame, AVFrame *rgbFrame,
                                      int targetWidth, int targetHeight)
  {
    // Determine scaling dimensions
    int outputWidth = (targetWidth > 0) ? targetWidth : inputFrame->width;
    int outputHeight = (targetHeight > 0) ? targetHeight : inputFrame->height;

    // Create scaling context
    SwsContext *swsContext = sws_getContext(
        inputFrame->width, inputFrame->height, static_cast<AVPixelFormat>(inputFrame->format),
        outputWidth, outputHeight, AV_PIX_FMT_RGB24,
        SWS_BILINEAR, nullptr, nullptr, nullptr);

    if (!swsContext)
    {
      log_error("Failed to create scaling context");
      return false;
    }

    // Perform scaling/conversion
    int ret = sws_scale(swsContext,
                        inputFrame->data, inputFrame->linesize, 0, inputFrame->height,
                        rgbFrame->data, rgbFrame->linesize);

    sws_freeContext(swsContext);

    if (ret < 0)
    {
      log_error("Failed to scale frame: " + av_error_to_string(ret));
      return false;
    }

    return true;
  }

  bool PngExporter::encodeFrameToPng(const AVFrame *rgbFrame, std::vector<uint8_t> &pngData)
  {
    // Find PNG encoder
    const AVCodec *pngCodec = avcodec_find_encoder(AV_CODEC_ID_PNG);
    if (!pngCodec)
    {
      log_error("PNG encoder not found");
      return false;
    }

    // Create codec context
    AVCodecContext *codecContext = avcodec_alloc_context3(pngCodec);
    if (!codecContext)
    {
      log_error("Failed to allocate PNG codec context");
      return false;
    }

    // Configure encoder
    codecContext->width = rgbFrame->width;
    codecContext->height = rgbFrame->height;
    codecContext->pix_fmt = AV_PIX_FMT_RGB24;
    codecContext->time_base = {1, 1};

    // Open encoder
    int ret = avcodec_open2(codecContext, pngCodec, nullptr);
    if (ret < 0)
    {
      log_error("Failed to open PNG encoder: " + av_error_to_string(ret));
      avcodec_free_context(&codecContext);
      return false;
    }

    // Create packet for encoded data
    AVPacket *packet = av_packet_alloc();
    if (!packet)
    {
      log_error("Failed to allocate packet");
      avcodec_free_context(&codecContext);
      return false;
    }

    // Send frame to encoder
    ret = avcodec_send_frame(codecContext, rgbFrame);
    if (ret < 0)
    {
      log_error("Failed to send frame to PNG encoder: " + av_error_to_string(ret));
      av_packet_free(&packet);
      avcodec_free_context(&codecContext);
      return false;
    }

    // Receive encoded packet
    ret = avcodec_receive_packet(codecContext, packet);
    if (ret < 0)
    {
      log_error("Failed to receive PNG packet: " + av_error_to_string(ret));
      av_packet_free(&packet);
      avcodec_free_context(&codecContext);
      return false;
    }

    // Copy packet data to output vector
    pngData.clear();
    pngData.resize(packet->size);
    std::memcpy(pngData.data(), packet->data, packet->size);

    // Cleanup
    av_packet_free(&packet);
    avcodec_free_context(&codecContext);

    return true;
  }

  void PngExporter::dispose()
  {
    if (disposed_)
    {
      return;
    }

    log_trace("Disposing PngExporter");
    cleanup();
    disposed_ = true;
  }

  void PngExporter::cleanup()
  {
    // No persistent resources to clean up in this implementation
  }

} // namespace playback