#include "EncodeAsyncWorker.h"
#include "../logging.h"

namespace playback
{

  EncodeAsyncWorker::EncodeAsyncWorker(Napi::Function &callback, Encoder *encoder, const AVFrame *inputFrame)
      : Napi::AsyncWorker(callback), encoder_(encoder), inputFrame_(nullptr), success_(false)
  {
    // std::cerr << "[EncodeAsyncWorker] Worker created" << std::endl;

    if (inputFrame)
    {
      // Deep copy the input frame for background thread use
      inputFrame_ = av_frame_alloc();
      if (inputFrame_ && av_frame_ref(inputFrame_, inputFrame) == 0)
      {
        // Successfully copied
      }
      else
      {
        playback::error("[EncodeAsyncWorker] Failed to copy input frame");
        if (inputFrame_)
        {
          av_frame_free(&inputFrame_);
          inputFrame_ = nullptr;
        }
      }
    }
  }

  EncodeAsyncWorker::~EncodeAsyncWorker()
  {
    // std::cerr << "[EncodeAsyncWorker] Worker destroyed" << std::endl;
    if (inputFrame_)
    {
      av_frame_free(&inputFrame_);
    }
  }

  void EncodeAsyncWorker::Execute()
  {
    // std::cerr << "[EncodeAsyncWorker] Execute() starting in background thread" << std::endl;

    if (!encoder_)
    {
      SetError("Encoder is null");
      return;
    }

    // This is the CPU-intensive operation that we want off the main thread
    std::vector<EncodedPacketInfo> encodedPackets;
    success_ = encoder_->encode(inputFrame_, encodedPackets);

    if (!success_)
    {
      // std::cerr << "[EncodeAsyncWorker] Encode operation failed" << std::endl;
      SetError("Failed to encode frame");
      return;
    }

    // Move encoded packets to our output vector
    outputPackets_ = std::move(encodedPackets);

    // std::cerr << "[EncodeAsyncWorker] Successfully encoded " << outputPackets_.size() << " packets" << std::endl;
  }

  void EncodeAsyncWorker::OnOK()
  {
    // playback::debug("[EncodeAsyncWorker] OnOK() executing on main thread");

    Napi::Env env = Env();

    try
    {
      // Convert packets to JavaScript array
      Napi::Array jsPackets = Napi::Array::New(env, outputPackets_.size());

      for (size_t i = 0; i < outputPackets_.size(); ++i)
      {
        jsPackets[i] = convertPacketToJS(env, outputPackets_[i]);
      }

      // Pass to callback: callback(error, result)
      // error = null (success), result = packets array
      Callback().Call({env.Null(), jsPackets});
    }
    catch (const std::exception &e)
    {
      // playback::error("[EncodeAsyncWorker] OnOK() exception: " + std::string(e.what()));
      Napi::Error error = Napi::Error::New(env, std::string("Failed to convert packets: ") + e.what());
      Callback().Call({error.Value(), env.Null()});
    }
  }

  void EncodeAsyncWorker::OnError(const Napi::Error &error)
  {
    // playback::error("[EncodeAsyncWorker] Error: " + error.Message());
    Napi::AsyncWorker::OnError(error);
  }

  Napi::Object EncodeAsyncWorker::convertPacketToJS(Napi::Env env, const EncodedPacketInfo &packetInfo)
  {
    Napi::Object packetObj = Napi::Object::New(env);

    // Basic packet properties
    packetObj.Set("streamIndex", Napi::Number::New(env, packetInfo.streamIndex));
    packetObj.Set("pts", Napi::Number::New(env, static_cast<double>(packetInfo.pts)));
    packetObj.Set("dts", Napi::Number::New(env, static_cast<double>(packetInfo.dts)));
    packetObj.Set("duration", Napi::Number::New(env, static_cast<double>(packetInfo.duration)));
    packetObj.Set("size", Napi::Number::New(env, packetInfo.size));
    packetObj.Set("isKeyFrame", Napi::Boolean::New(env, packetInfo.isKeyFrame));
    packetObj.Set("mediaType", Napi::Number::New(env, packetInfo.mediaType));

    // Copy packet data to JavaScript ArrayBuffer
    if (!packetInfo.data.empty())
    {
      Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, packetInfo.data.size());
      memcpy(buffer.Data(), packetInfo.data.data(), packetInfo.data.size());
      packetObj.Set("data", Napi::Uint8Array::New(env, packetInfo.data.size(), buffer, 0));
    }
    else
    {
      packetObj.Set("data", env.Null());
    }

    return packetObj;
  }

} // namespace playback