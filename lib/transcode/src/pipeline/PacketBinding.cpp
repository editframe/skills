#include <napi.h>
#include "Packet.h"
#include "../logging.h"
#include "../ConstructorReferences.h"

extern "C"
{
#include <libavcodec/avcodec.h>
}

namespace playback
{

  class PacketWrapper : public Napi::ObjectWrap<PacketWrapper>
  {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports)
    {
      Napi::Function func = DefineClass(env, "Packet", {
                                                           InstanceMethod("setPts", &PacketWrapper::SetPts),
                                                           InstanceMethod("setDts", &PacketWrapper::SetDts),
                                                           InstanceMethod("setDuration", &PacketWrapper::SetDuration),
                                                           InstanceMethod("setStreamIndex", &PacketWrapper::SetStreamIndex),
                                                           InstanceMethod("setKeyFrame", &PacketWrapper::SetKeyFrame),
                                                           InstanceMethod("setPos", &PacketWrapper::SetPos),
                                                           InstanceMethod("setData", &PacketWrapper::SetData),
                                                           InstanceMethod("clone", &PacketWrapper::Clone),
                                                           InstanceMethod("dispose", &PacketWrapper::Dispose),
                                                           InstanceAccessor("data", &PacketWrapper::GetData, nullptr),
                                                           InstanceAccessor("size", &PacketWrapper::GetSize, nullptr),
                                                           InstanceAccessor("pts", &PacketWrapper::GetPts, nullptr),
                                                           InstanceAccessor("dts", &PacketWrapper::GetDts, nullptr),
                                                           InstanceAccessor("duration", &PacketWrapper::GetDuration, nullptr),
                                                           InstanceAccessor("streamIndex", &PacketWrapper::GetStreamIndex, nullptr),
                                                           InstanceAccessor("isKeyFrame", &PacketWrapper::GetIsKeyFrame, nullptr),
                                                           InstanceAccessor("pos", &PacketWrapper::GetPos, nullptr),
                                                           InstanceAccessor("isValid", &PacketWrapper::GetIsValid, nullptr),
                                                       });

      // Get centralized constructor references and set safely
      ConstructorReferences *refs = ConstructorReferences::getInstance(env);
      refs->setPacketConstructor(func);

      exports.Set("Packet", func);
      return exports;
    }

    PacketWrapper(const Napi::CallbackInfo &info)
        : Napi::ObjectWrap<PacketWrapper>(info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsObject())
      {
        Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
        return;
      }

      Napi::Object options = info[0].As<Napi::Object>();

      PacketOptions packetOptions;

      // Extract packet data (required)
      if (!options.Has("data") || !options.Get("data").IsTypedArray())
      {
        Napi::TypeError::New(env, "data is required and must be a Uint8Array").ThrowAsJavaScriptException();
        return;
      }

      Napi::TypedArray typedArray = options.Get("data").As<Napi::TypedArray>();
      Napi::ArrayBuffer buffer = typedArray.ArrayBuffer();
      size_t byteOffset = typedArray.ByteOffset();
      size_t byteLength = typedArray.ByteLength();

      const uint8_t *data = static_cast<const uint8_t *>(buffer.Data()) + byteOffset;
      packetOptions.data.assign(data, data + byteLength);

      // Extract timing information (optional)
      if (options.Has("pts") && options.Get("pts").IsNumber())
      {
        packetOptions.pts = static_cast<int64_t>(options.Get("pts").As<Napi::Number>().DoubleValue());
      }
      if (options.Has("dts") && options.Get("dts").IsNumber())
      {
        packetOptions.dts = static_cast<int64_t>(options.Get("dts").As<Napi::Number>().DoubleValue());
      }
      if (options.Has("duration") && options.Get("duration").IsNumber())
      {
        packetOptions.duration = static_cast<int64_t>(options.Get("duration").As<Napi::Number>().DoubleValue());
      }

      // Extract stream information (optional)
      if (options.Has("streamIndex") && options.Get("streamIndex").IsNumber())
      {
        packetOptions.streamIndex = options.Get("streamIndex").As<Napi::Number>().Int32Value();
      }

      // Extract packet flags (optional)
      if (options.Has("isKeyFrame") && options.Get("isKeyFrame").IsBoolean())
      {
        packetOptions.isKeyFrame = options.Get("isKeyFrame").As<Napi::Boolean>().Value();
      }

      // Extract position (optional)
      if (options.Has("pos") && options.Get("pos").IsNumber())
      {
        packetOptions.pos = static_cast<int64_t>(options.Get("pos").As<Napi::Number>().DoubleValue());
      }

      packet_ = std::make_unique<Packet>(packetOptions);
    }

    Napi::Value GetData(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!packet_ || !packet_->isValid())
      {
        return env.Null();
      }

      const uint8_t *data = packet_->data();
      size_t size = packet_->size();

      if (!data || size == 0)
      {
        return Napi::Uint8Array::New(env, 0);
      }

      // Create a copy of the data for JavaScript
      Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, size);
      memcpy(buffer.Data(), data, size);

      return Napi::Uint8Array::New(env, size, buffer, 0);
    }

    Napi::Value GetSize(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();
      return Napi::Number::New(env, packet_ ? packet_->size() : 0);
    }

    Napi::Value GetPts(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();
      return Napi::Number::New(env, packet_ ? packet_->pts() : AV_NOPTS_VALUE);
    }

    Napi::Value GetDts(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();
      return Napi::Number::New(env, packet_ ? packet_->dts() : AV_NOPTS_VALUE);
    }

    Napi::Value GetDuration(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();
      return Napi::Number::New(env, packet_ ? packet_->duration() : 0);
    }

    Napi::Value GetStreamIndex(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();
      return Napi::Number::New(env, packet_ ? packet_->streamIndex() : 0);
    }

    Napi::Value GetIsKeyFrame(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();
      return Napi::Boolean::New(env, packet_ ? packet_->isKeyFrame() : false);
    }

    Napi::Value GetPos(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();
      return Napi::Number::New(env, packet_ ? packet_->pos() : -1);
    }

    Napi::Value GetIsValid(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();
      return Napi::Boolean::New(env, packet_ ? packet_->isValid() : false);
    }

    Napi::Value SetPts(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsNumber())
      {
        Napi::TypeError::New(env, "Expected number argument").ThrowAsJavaScriptException();
        return env.Undefined();
      }

      if (packet_)
      {
        int64_t pts = static_cast<int64_t>(info[0].As<Napi::Number>().DoubleValue());
        packet_->setPts(pts);
      }

      return env.Undefined();
    }

    Napi::Value SetDts(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsNumber())
      {
        Napi::TypeError::New(env, "Expected number argument").ThrowAsJavaScriptException();
        return env.Undefined();
      }

      if (packet_)
      {
        int64_t dts = static_cast<int64_t>(info[0].As<Napi::Number>().DoubleValue());
        packet_->setDts(dts);
      }

      return env.Undefined();
    }

    Napi::Value SetDuration(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsNumber())
      {
        Napi::TypeError::New(env, "Expected number argument").ThrowAsJavaScriptException();
        return env.Undefined();
      }

      if (packet_)
      {
        int64_t duration = static_cast<int64_t>(info[0].As<Napi::Number>().DoubleValue());
        packet_->setDuration(duration);
      }

      return env.Undefined();
    }

    Napi::Value SetStreamIndex(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsNumber())
      {
        Napi::TypeError::New(env, "Expected number argument").ThrowAsJavaScriptException();
        return env.Undefined();
      }

      if (packet_)
      {
        int streamIndex = info[0].As<Napi::Number>().Int32Value();
        packet_->setStreamIndex(streamIndex);
      }

      return env.Undefined();
    }

    Napi::Value SetKeyFrame(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsBoolean())
      {
        Napi::TypeError::New(env, "Expected boolean argument").ThrowAsJavaScriptException();
        return env.Undefined();
      }

      if (packet_)
      {
        bool isKeyFrame = info[0].As<Napi::Boolean>().Value();
        packet_->setKeyFrame(isKeyFrame);
      }

      return env.Undefined();
    }

    Napi::Value SetPos(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsNumber())
      {
        Napi::TypeError::New(env, "Expected number argument").ThrowAsJavaScriptException();
        return env.Undefined();
      }

      if (packet_)
      {
        int64_t pos = static_cast<int64_t>(info[0].As<Napi::Number>().DoubleValue());
        packet_->setPos(pos);
      }

      return env.Undefined();
    }

    Napi::Value SetData(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsTypedArray())
      {
        Napi::TypeError::New(env, "Expected Uint8Array argument").ThrowAsJavaScriptException();
        return env.Undefined();
      }

      if (!packet_)
      {
        Napi::Error::New(env, "Packet is disposed").ThrowAsJavaScriptException();
        return env.Undefined();
      }

      Napi::TypedArray typedArray = info[0].As<Napi::TypedArray>();
      Napi::ArrayBuffer buffer = typedArray.ArrayBuffer();
      size_t byteOffset = typedArray.ByteOffset();
      size_t byteLength = typedArray.ByteLength();

      const uint8_t *data = static_cast<const uint8_t *>(buffer.Data()) + byteOffset;
      bool success = packet_->setData(data, byteLength);

      return Napi::Boolean::New(env, success);
    }

    Napi::Value Clone(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!packet_)
      {
        Napi::Error::New(env, "Packet is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      auto cloned = packet_->clone();
      if (!cloned)
      {
        Napi::Error::New(env, "Failed to clone packet").ThrowAsJavaScriptException();
        return env.Null();
      }

      // Get constructor and create new JavaScript wrapper
      ConstructorReferences *refs = ConstructorReferences::getInstance(env);
      Napi::Function constructor = refs->getPacketConstructor(env);

      // Create options object for the cloned packet
      Napi::Object options = Napi::Object::New(env);

      // Create Uint8Array for the data
      const uint8_t *data = cloned->data();
      size_t size = cloned->size();

      if (data && size > 0)
      {
        Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, size);
        memcpy(buffer.Data(), data, size);
        Napi::Uint8Array dataArray = Napi::Uint8Array::New(env, size, buffer, 0);
        options.Set("data", dataArray);
      }
      else
      {
        options.Set("data", Napi::Uint8Array::New(env, 0));
      }

      options.Set("pts", Napi::Number::New(env, cloned->pts()));
      options.Set("dts", Napi::Number::New(env, cloned->dts()));
      options.Set("duration", Napi::Number::New(env, cloned->duration()));
      options.Set("streamIndex", Napi::Number::New(env, cloned->streamIndex()));
      options.Set("isKeyFrame", Napi::Boolean::New(env, cloned->isKeyFrame()));
      options.Set("pos", Napi::Number::New(env, cloned->pos()));

      return constructor.New({options});
    }

    Napi::Value Dispose(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (packet_)
      {
        packet_->dispose();
        packet_.reset();
      }

      return env.Undefined();
    }

  private:
    std::unique_ptr<Packet> packet_;
  };

  Napi::Value CreatePacketNative(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject())
    {
      Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Get constructor and create new instance
    ConstructorReferences *refs = ConstructorReferences::getInstance(env);
    Napi::Function constructor = refs->getPacketConstructor(env);

    return constructor.New({info[0]});
  }

  Napi::Object InitPacket(Napi::Env env, Napi::Object exports)
  {
    PacketWrapper::Init(env, exports);
    exports.Set("createPacketNative", Napi::Function::New(env, CreatePacketNative));
    return exports;
  }

} // namespace playback