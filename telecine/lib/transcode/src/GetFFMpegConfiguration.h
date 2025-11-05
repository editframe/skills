#pragma once
#include <napi.h>

// Use Napi namespace to avoid name mangling issues
namespace playback
{
  Napi::Value GetFFmpegConfiguration(const Napi::CallbackInfo &info);
}
