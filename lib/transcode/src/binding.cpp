#include <napi.h>
#include "StreamTranscodeWorker.h"
#include <memory>
#include <vector>

// Function to parse options from JS object
playback::TranscodeOptions parseOptions(const Napi::Object &jsOptions, Napi::Env env)
{
  playback::TranscodeOptions options;

  // Parse options here
  if (jsOptions.Has("url") && jsOptions.Get("url").IsString())
  {
    options.url = jsOptions.Get("url").As<Napi::String>().Utf8Value();
  }

  if (jsOptions.Has("startTimeMs") && jsOptions.Get("startTimeMs").IsNumber())
  {
    options.startTimeMs = jsOptions.Get("startTimeMs").As<Napi::Number>().DoubleValue();
  }

  if (jsOptions.Has("durationMs") && jsOptions.Get("durationMs").IsNumber())
  {
    options.durationMs = jsOptions.Get("durationMs").As<Napi::Number>().DoubleValue();
  }

  if (jsOptions.Has("targetWidth") && jsOptions.Get("targetWidth").IsNumber())
  {
    options.targetWidth = jsOptions.Get("targetWidth").As<Napi::Number>().Int32Value();
  }

  if (jsOptions.Has("targetHeight") && jsOptions.Get("targetHeight").IsNumber())
  {
    options.targetHeight = jsOptions.Get("targetHeight").As<Napi::Number>().Int32Value();
  }

  if (jsOptions.Has("videoBitrate") && jsOptions.Get("videoBitrate").IsNumber())
  {
    options.videoBitrate = jsOptions.Get("videoBitrate").As<Napi::Number>().Int32Value();
  }

  if (jsOptions.Has("audioBitrate") && jsOptions.Get("audioBitrate").IsNumber())
  {
    options.audioBitrate = jsOptions.Get("audioBitrate").As<Napi::Number>().Int32Value();
  }

  if (jsOptions.Has("useFileIO") && jsOptions.Get("useFileIO").IsBoolean())
  {
    options.useFileIO = jsOptions.Get("useFileIO").As<Napi::Boolean>().Value();
  }

  // Initialize syntheticMp4 to nullptr by default
  options.syntheticMp4 = nullptr;

  return options;
}

Napi::Value StreamTranscode(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  // Check arguments
  if (info.Length() < 2)
  {
    Napi::TypeError::New(env, "Expected at least 2 arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Extract options from JavaScript object
  if (!info[0].IsObject())
  {
    Napi::TypeError::New(env, "First argument must be an options object").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parse TranscodeOptions
  playback::TranscodeOptions options = parseOptions(info[0].As<Napi::Object>(), env);

  // Get callback function
  if (!info[1].IsFunction())
  {
    Napi::TypeError::New(env, "Second argument must be a callback function").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Function callback = info[1].As<Napi::Function>();

  // Check for optional synthetic MP4 buffer and handle it using a vector
  std::vector<uint8_t> syntheticInitMp4;
  if (info.Length() > 2 && info[2].IsTypedArray())
  {
    Napi::TypedArray array = info[2].As<Napi::TypedArray>();
    Napi::Uint8Array uint8Array = array.As<Napi::Uint8Array>();

    // Copy buffer data to our vector
    size_t length = uint8Array.ByteLength();
    syntheticInitMp4.resize(length);
    std::memcpy(syntheticInitMp4.data(), uint8Array.Data(), length);
  }

  // Data callback function
  auto dataCallback = [env, callback](const std::vector<uint8_t> &data, bool isLastChunk, const std::string &error)
  {
    Napi::HandleScope scope(env);

    // Prepare arguments for the callback
    std::vector<napi_value> args(3);

    // If there's an error, pass it as first argument
    if (!error.empty())
    {
      args[0] = Napi::String::New(env, error);
      args[1] = env.Null();
      args[2] = Napi::Boolean::New(env, isLastChunk);
    }
    else
    {
      // Create a buffer from our data vector
      Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(
          env, data.data(), data.size());

      args[0] = env.Null(); // Error is null
      args[1] = buffer;     // Data buffer
      args[2] = Napi::Boolean::New(env, isLastChunk);
    }

    // Call the JavaScript callback
    callback.Call(args);
  };

  // Create and queue the worker - pass the vector for backward compatibility
  playback::StreamTranscodeWorker *worker = new playback::StreamTranscodeWorker(callback, options, dataCallback, syntheticInitMp4);
  worker->Queue();

  return env.Undefined();
}