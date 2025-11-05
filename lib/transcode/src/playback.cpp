#include "playback.h"
#include "GetFFMpegVersion.h"
#include "GetFFMpegConfiguration.h"
#include "GetKeyframes.h"
#include "ValidateRemoteSource.h"
// #include "StreamTranscodeWorker.h" // Temporarily excluded for AsyncWorker testing

extern "C"
{
#include <libavutil/log.h>
}

// Forward declare pipeline component init functions
namespace playback
{
  Napi::Object InitVideoSource(Napi::Env env, Napi::Object exports);
  Napi::Object InitDecoder(Napi::Env env, Napi::Object exports);
  Napi::Object InitFilter(Napi::Env env, Napi::Object exports);
  Napi::Object InitEncoder(Napi::Env env, Napi::Object exports);
  void InitMuxer(Napi::Env env, Napi::Object exports);
  Napi::Object InitPacket(Napi::Env env, Napi::Object exports);
  Napi::Object InitPngExporter(Napi::Env env, Napi::Object exports);
}

namespace playback
{
  Napi::Object Init(Napi::Env env, Napi::Object exports)
  {
    av_log_set_level(AV_LOG_ERROR);
    exports.Set("getFFmpegVersion", Napi::Function::New(env, GetFFmpegVersion));
    exports.Set("getFFmpegConfiguration", Napi::Function::New(env, GetFFmpegConfiguration));
    exports.Set("getKeyframes", Napi::Function::New(env, GetKeyframes));
    exports.Set("validateRemoteSource", Napi::Function::New(env, ValidateRemoteSource));
    // exports.Set("streamTranscodeWorker", Napi::Function::New(env, StreamTranscodeWorkerJS)); // Temporarily excluded

    // Initialize the new modular pipeline components
    InitVideoSource(env, exports);
    InitDecoder(env, exports);
    InitFilter(env, exports);
    InitEncoder(env, exports);
    InitMuxer(env, exports);
    InitPacket(env, exports);
    InitPngExporter(env, exports);

    return exports;
  }
}
