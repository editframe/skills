#include "GetFFMpegVersion.h"

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
  Napi::Value GetFFmpegVersion(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();

    Napi::Object versions = Napi::Object::New(env);

    versions.Set("avcodec", Napi::String::New(env, avcodec_version() ? av_version_info() : "unknown"));
    versions.Set("avformat", Napi::Number::New(env, avformat_version()));
    versions.Set("avutil", Napi::Number::New(env, avutil_version()));
    versions.Set("swscale", Napi::Number::New(env, swscale_version()));

    return versions;
  }
}