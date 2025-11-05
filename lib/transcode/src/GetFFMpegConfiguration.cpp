#include "GetFFMpegConfiguration.h"

extern "C"
{
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/avutil.h>
#include <libavutil/dict.h>
#include <libswscale/swscale.h>
}

namespace playback
{
  Napi::Value GetFFmpegConfiguration(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();

    Napi::Object config = Napi::Object::New(env);

    // Get configuration strings
    config.Set("avcodec", Napi::String::New(env, avcodec_configuration()));
    config.Set("avformat", Napi::String::New(env, avformat_configuration()));
    config.Set("avutil", Napi::String::New(env, avutil_configuration()));
    config.Set("swscale", Napi::String::New(env, swscale_configuration()));

    // Get supported codecs as an array
    const AVCodec *codec = nullptr;
    void *opaque = nullptr;
    Napi::Array codecList = Napi::Array::New(env);

    int i = 0;
    while ((codec = av_codec_iterate(&opaque)))
    {
      Napi::Object codecInfo = Napi::Object::New(env);
      codecInfo.Set("name", Napi::String::New(env, codec->name ? codec->name : ""));
      codecInfo.Set("longName", Napi::String::New(env, codec->long_name ? codec->long_name : ""));
      codecInfo.Set("type", Napi::String::New(env,
                                              codec->type == AVMEDIA_TYPE_VIDEO ? "video" : codec->type == AVMEDIA_TYPE_AUDIO  ? "audio"
                                                                                        : codec->type == AVMEDIA_TYPE_SUBTITLE ? "subtitle"
                                                                                                                               : "other"));
      codecInfo.Set("isEncoder", Napi::Boolean::New(env, av_codec_is_encoder(codec)));
      codecInfo.Set("isDecoder", Napi::Boolean::New(env, av_codec_is_decoder(codec)));

      codecList[i++] = codecInfo;
    }

    config.Set("codecs", codecList);

    return config;
  }

}