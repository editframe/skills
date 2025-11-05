#pragma once
#include <string>
#include <memory>

extern "C"
{
#include <libavutil/error.h>
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
}

namespace playback
{
  // Convert FFmpeg error code to string
  std::string av_error_to_string(int errnum);

  // FFmpeg resource deleter for smart pointers
  struct FFmpegDeleter
  {
    void operator()(AVCodecContext *ctx);
    void operator()(AVFormatContext *ctx);
    void operator()(AVFrame *frame);
  };

  // Stream context structure
  struct StreamContext
  {
    std::unique_ptr<AVCodecContext, FFmpegDeleter> dec_ctx{nullptr};
    std::unique_ptr<AVCodecContext, FFmpegDeleter> enc_ctx{nullptr};
    std::unique_ptr<AVFrame, FFmpegDeleter> dec_frame{nullptr};
  };
}