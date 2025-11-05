#include "DecodeAsyncWorker.h"
#include "../logging.h"

namespace playback
{

  DecodeAsyncWorker::DecodeAsyncWorker(Napi::Function &callback, Decoder *decoder, AVPacket *inputPacket)
      : Napi::AsyncWorker(callback), decoder_(decoder), inputPacket_(nullptr), success_(false)
  {
    // std::cerr << "[DecodeAsyncWorker] Worker created" << std::endl;

    if (inputPacket)
    {
      // Deep copy the input packet for background thread use
      inputPacket_ = av_packet_alloc();
      if (inputPacket_ && av_packet_ref(inputPacket_, inputPacket) == 0)
      {
        // Successfully copied
      }
      else
      {
        playback::error("[DecodeAsyncWorker] Failed to copy input packet");
        if (inputPacket_)
        {
          av_packet_free(&inputPacket_);
          inputPacket_ = nullptr;
        }
      }
    }
  }

  DecodeAsyncWorker::~DecodeAsyncWorker()
  {
    // std::cerr << "[DecodeAsyncWorker] Worker destroyed" << std::endl;
    if (inputPacket_)
    {
      av_packet_free(&inputPacket_);
    }
  }

  void DecodeAsyncWorker::Execute()
  {
    // std::cerr << "[DecodeAsyncWorker] Execute() starting in background thread" << std::endl;

    if (!decoder_)
    {
      SetError("Decoder is null");
      return;
    }

    if (!inputPacket_)
    {
      SetError("Input packet is null");
      return;
    }

    // This is the CPU-intensive operation that we want off the main thread
    success_ = decoder_->decode(inputPacket_, outputFrames_);

    if (!success_)
    {
      // std::cerr << "[DecodeAsyncWorker] Decode operation failed" << std::endl;
      SetError("Failed to decode packet");
      return;
    }

    // std::cerr << "[DecodeAsyncWorker] Successfully decoded " << outputFrames_.size() << " frames" << std::endl;
  }

  void DecodeAsyncWorker::OnOK()
  {
    // playback::debug("[DecodeAsyncWorker] OnOK() executing on main thread");

    Napi::Env env = Env();

    try
    {
      // Convert frames to JavaScript array
      Napi::Array jsFrames = Napi::Array::New(env, outputFrames_.size());

      for (size_t i = 0; i < outputFrames_.size(); ++i)
      {
        jsFrames[i] = convertFrameToJS(env, outputFrames_[i]);
      }

      // Pass to callback: callback(error, result)
      // error = null (success), result = frames array
      Callback().Call({env.Null(), jsFrames});
    }
    catch (const std::exception &e)
    {
      playback::error("[DecodeAsyncWorker] OnOK() exception: " + std::string(e.what()));
      Napi::Error error = Napi::Error::New(env, std::string("Failed to convert frames: ") + e.what());
      Callback().Call({error.Value(), env.Null()});
    }
  }

  void DecodeAsyncWorker::OnError(const Napi::Error &error)
  {
    playback::error("[DecodeAsyncWorker] Error: " + error.Message());
    Napi::AsyncWorker::OnError(error);
  }

  Napi::Object DecodeAsyncWorker::convertFrameToJS(Napi::Env env, const FrameInfo &frameInfo)
  {
    Napi::Object frameObj = Napi::Object::New(env);

    // Frame pointer for accessing actual frame data
    frameObj.Set("framePtr", Napi::Number::New(env, static_cast<double>(frameInfo.framePtr)));

    // Basic frame properties
    frameObj.Set("width", Napi::Number::New(env, frameInfo.width));
    frameObj.Set("height", Napi::Number::New(env, frameInfo.height));
    frameObj.Set("format", Napi::Number::New(env, frameInfo.format));
    frameObj.Set("pts", Napi::Number::New(env, static_cast<double>(frameInfo.pts)));
    frameObj.Set("dts", Napi::Number::New(env, static_cast<double>(frameInfo.dts)));
    // Media type - convert enum to string like the synchronous version
    std::string mediaType;
    switch (frameInfo.mediaType)
    {
    case AVMEDIA_TYPE_VIDEO:
      mediaType = "video";
      break;
    case AVMEDIA_TYPE_AUDIO:
      mediaType = "audio";
      break;
    default:
      mediaType = "unknown";
      break;
    }
    frameObj.Set("mediaType", Napi::String::New(env, mediaType));

    // Video properties
    if (frameInfo.mediaType == AVMEDIA_TYPE_VIDEO)
    {
      frameObj.Set("pixelFormat", Napi::Number::New(env, frameInfo.pixelFormat));
    }

    // Audio properties
    if (frameInfo.mediaType == AVMEDIA_TYPE_AUDIO)
    {
      frameObj.Set("channels", Napi::Number::New(env, frameInfo.channels));
      frameObj.Set("sampleRate", Napi::Number::New(env, frameInfo.sampleRate));
      frameObj.Set("samplesPerChannel", Napi::Number::New(env, frameInfo.samplesPerChannel));
      frameObj.Set("sampleFormat", Napi::Number::New(env, frameInfo.sampleFormat));
    }

    // Frame data planes (metadata only, matching synchronous version)
    Napi::Array planes = Napi::Array::New(env, frameInfo.data.size());
    for (size_t i = 0; i < frameInfo.data.size(); ++i)
    {
      Napi::Object plane = Napi::Object::New(env);
      plane.Set("linesize", Napi::Number::New(env, frameInfo.linesize[i]));
      // Note: We're not copying the actual data here for performance reasons
      // In a real implementation, you might want to copy or reference the data
      planes[i] = plane;
    }
    frameObj.Set("planes", planes);

    return frameObj;
  }

} // namespace playback