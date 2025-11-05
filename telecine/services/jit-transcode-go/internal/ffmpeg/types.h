#ifndef TELECINE_FFMPEG_TYPES_H
#define TELECINE_FFMPEG_TYPES_H

#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavfilter/avfilter.h>
#include <libavutil/avutil.h>

typedef struct
{
  AVCodecContext *codec_ctx;
  const AVCodec *codec;
  AVFrame *frame;
  int64_t next_pts;
} DecoderHandle;

typedef struct
{
  AVCodecContext *codec_ctx;
  const AVCodec *codec;
  AVPacket *temp_pkt;
} EncoderHandle;

typedef struct
{
  AVFilterGraph *filter_graph;
  AVFilterContext *buffersrc_ctx;
  AVFilterContext *buffersink_ctx;
} FilterHandle;

typedef struct
{
  uint8_t *buffer;
  size_t size;
  size_t position;
  size_t capacity;
} AVIOBuffer;

typedef struct
{
  AVFormatContext *fmt_ctx;
  AVIOContext *avio_ctx;
  AVIOBuffer *avio_buf;
  int video_stream_index;
  int audio_stream_index;
  int64_t last_video_dts;
  int64_t last_audio_dts;
  int64_t video_frame_count;
  int64_t audio_frame_count;
  AVRational video_frame_rate;
} MuxerHandle;

#endif
