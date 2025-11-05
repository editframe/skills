#include "FFmpegUtils.h"
#include "logging.h"

extern "C"
{
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/error.h>
#include <libavutil/avutil.h>
}

namespace playback
{
  std::string av_error_to_string(int errnum)
  {
    char errbuf[AV_ERROR_MAX_STRING_SIZE];
    av_strerror(errnum, errbuf, AV_ERROR_MAX_STRING_SIZE);
    return std::string(errbuf);
  }

  void FFmpegDeleter::operator()(AVCodecContext *ctx)
  {
    debug("DELETING AVCODEC CONTEXT");
    if (ctx)
    {
      avcodec_free_context(&ctx);
    }
  }

  void FFmpegDeleter::operator()(AVFormatContext *ctx)
  {
    debug("DELETING AVFORMAT CONTEXT");
    if (ctx)
    {
      avformat_close_input(&ctx);
    }
  }

  void FFmpegDeleter::operator()(AVFrame *frame)
  {
    debug("DELETING AVFRAME");
    if (frame)
    {
      av_frame_free(&frame);
    }
  }
}