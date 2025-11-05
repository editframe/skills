#pragma once
#include <napi.h>

// Use Napi namespace to avoid name mangling issues
namespace playback
{
  // Initialize the module
  Napi::Object Init(Napi::Env env, Napi::Object exports);

  // Function declarations
  Napi::Value GetFFmpegVersion(const Napi::CallbackInfo &info);
  Napi::Value GetFFmpegConfiguration(const Napi::CallbackInfo &info);
  Napi::Value GetKeyframes(const Napi::CallbackInfo &info);
  Napi::Value ValidateRemoteSource(const Napi::CallbackInfo &info);
  Napi::Value StreamTranscode(const Napi::CallbackInfo &info);
  Napi::Value StreamTranscodeWorkerJS(const Napi::CallbackInfo &info);
}
