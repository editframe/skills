#include <napi.h>
#include "Decoder.h"
#include "../logging.h"
#include "../ConstructorReferences.h"
#include "../async/DecodeAsyncWorker.h"

extern "C"
{
#include <libavcodec/avcodec.h>
}

namespace playback
{

  class DecoderWrapper : public Napi::ObjectWrap<DecoderWrapper>
  {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports)
    {
      Napi::Function func = DefineClass(env, "Decoder", {
                                                            InstanceMethod("initialize", &DecoderWrapper::Initialize),
                                                            InstanceMethod("decodeAsync", &DecoderWrapper::DecodeAsync),
                                                            InstanceMethod("flush", &DecoderWrapper::Flush),
                                                            InstanceMethod("resetPtsTracking", &DecoderWrapper::ResetPtsTracking),
                                                            InstanceMethod("dispose", &DecoderWrapper::Dispose),
                                                            InstanceAccessor("codecId", &DecoderWrapper::GetCodecId, nullptr),
                                                            InstanceAccessor("codecName", &DecoderWrapper::GetCodecName, nullptr),
                                                            InstanceAccessor("mediaType", &DecoderWrapper::GetMediaType, nullptr),
                                                            InstanceAccessor("isInitialized", &DecoderWrapper::GetIsInitialized, nullptr),
                                                        });

      // Get centralized constructor references and set safely
      ConstructorReferences *refs = ConstructorReferences::getInstance(env);
      refs->setDecoderConstructor(func);

      exports.Set("Decoder", func);
      return exports;
    }

    DecoderWrapper(const Napi::CallbackInfo &info)
        : Napi::ObjectWrap<DecoderWrapper>(info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsObject())
      {
        Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
        return;
      }

      Napi::Object options = info[0].As<Napi::Object>();
      DecoderOptions decoderOptions = extractDecoderOptions(env, options);
      decoder_ = std::make_unique<Decoder>(decoderOptions);
    }

    Napi::Value Initialize(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!decoder_)
      {
        Napi::Error::New(env, "Decoder is null").ThrowAsJavaScriptException();
        return env.Null();
      }

      bool success = decoder_->initialize();
      return Napi::Boolean::New(env, success);
    }

    Napi::Value DecodeAsync(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsFunction())
      {
        Napi::TypeError::New(env, "Expected packet object and callback function").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (!decoder_)
      {
        Napi::Error::New(env, "Decoder is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      Napi::Object packetObj = info[0].As<Napi::Object>();
      Napi::Function callback = info[1].As<Napi::Function>();

      // Create AVPacket from JavaScript object (same as synchronous version)
      AVPacket *packet = av_packet_alloc();
      if (!packet)
      {
        Napi::Error::New(env, "Failed to allocate packet").ThrowAsJavaScriptException();
        return env.Null();
      }

      // Extract packet data
      if (packetObj.Has("data") && packetObj.Get("data").IsTypedArray())
      {
        Napi::TypedArray typedArray = packetObj.Get("data").As<Napi::TypedArray>();
        Napi::ArrayBuffer buffer = typedArray.ArrayBuffer();
        size_t byteLength = typedArray.ByteLength();

        packet->data = static_cast<uint8_t *>(av_malloc(byteLength));
        if (!packet->data)
        {
          av_packet_free(&packet);
          Napi::Error::New(env, "Failed to allocate packet data").ThrowAsJavaScriptException();
          return env.Null();
        }

        memcpy(packet->data, static_cast<const uint8_t *>(buffer.Data()) + typedArray.ByteOffset(), byteLength);
        packet->size = static_cast<int>(byteLength);
      }

      // Extract other packet properties
      if (packetObj.Has("pts") && packetObj.Get("pts").IsNumber())
      {
        packet->pts = static_cast<int64_t>(packetObj.Get("pts").As<Napi::Number>().DoubleValue());
      }
      if (packetObj.Has("dts") && packetObj.Get("dts").IsNumber())
      {
        packet->dts = static_cast<int64_t>(packetObj.Get("dts").As<Napi::Number>().DoubleValue());
      }
      if (packetObj.Has("streamIndex") && packetObj.Get("streamIndex").IsNumber())
      {
        packet->stream_index = packetObj.Get("streamIndex").As<Napi::Number>().Int32Value();
      }

      // Create and queue the async worker - this prevents main thread blocking
      DecodeAsyncWorker *worker = new DecodeAsyncWorker(callback, decoder_.get(), packet);
      worker->Queue();

      av_packet_free(&packet); // Free the original, DecodeAsyncWorker makes its own copy

      return env.Undefined();
    }

    Napi::Value Flush(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!decoder_)
      {
        Napi::Error::New(env, "Decoder is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      std::vector<FrameInfo> frames;
      bool success = decoder_->flush(frames);

      if (!success)
      {
        // Return empty array instead of null when flushing fails
        return Napi::Array::New(env, 0);
      }

      // Convert frames to JavaScript array
      Napi::Array jsFrames = Napi::Array::New(env, frames.size());
      for (size_t i = 0; i < frames.size(); ++i)
      {
        jsFrames[i] = convertFrameToJS(env, frames[i]);
      }

      return jsFrames;
    }

    Napi::Value GetCodecId(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!decoder_)
      {
        return env.Null();
      }

      return Napi::Number::New(env, static_cast<int>(decoder_->codecId()));
    }

    Napi::Value GetCodecName(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!decoder_)
      {
        return env.Null();
      }

      return Napi::String::New(env, decoder_->codecName());
    }

    Napi::Value GetMediaType(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!decoder_)
      {
        return env.Null();
      }

      std::string mediaType;
      switch (decoder_->mediaType())
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

      return Napi::String::New(env, mediaType);
    }

    Napi::Value GetIsInitialized(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!decoder_)
      {
        return Napi::Boolean::New(env, false);
      }

      return Napi::Boolean::New(env, decoder_->isInitialized());
    }

    Napi::Value ResetPtsTracking(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!decoder_)
      {
        Napi::Error::New(env, "Decoder is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      decoder_->resetPtsTracking();
      return env.Undefined();
    }

    Napi::Value Dispose(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (decoder_)
      {
        decoder_->dispose();
        decoder_.reset();
      }

      return env.Undefined();
    }

  private:
    std::unique_ptr<Decoder> decoder_;

    Napi::Object convertFrameToJS(Napi::Env env, const FrameInfo &frameInfo)
    {
      Napi::Object frameObj = Napi::Object::New(env);

      // Frame pointer for accessing actual frame data
      frameObj.Set("framePtr", Napi::Number::New(env, static_cast<double>(frameInfo.framePtr)));

      frameObj.Set("pts", Napi::Number::New(env, static_cast<double>(frameInfo.pts)));
      frameObj.Set("dts", Napi::Number::New(env, static_cast<double>(frameInfo.dts)));
      frameObj.Set("format", Napi::Number::New(env, frameInfo.format));

      // Media type
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
        frameObj.Set("width", Napi::Number::New(env, frameInfo.width));
        frameObj.Set("height", Napi::Number::New(env, frameInfo.height));
      }

      // Audio properties
      if (frameInfo.mediaType == AVMEDIA_TYPE_AUDIO)
      {
        frameObj.Set("channels", Napi::Number::New(env, frameInfo.channels));
        frameObj.Set("sampleRate", Napi::Number::New(env, frameInfo.sampleRate));
        frameObj.Set("samplesPerChannel", Napi::Number::New(env, frameInfo.samplesPerChannel));
      }

      // Frame data planes (legacy compatibility - metadata only)
      Napi::Array planes = Napi::Array::New(env, frameInfo.data.size());
      for (size_t i = 0; i < frameInfo.data.size(); ++i)
      {
        Napi::Object plane = Napi::Object::New(env);
        plane.Set("linesize", Napi::Number::New(env, frameInfo.linesize[i]));
        // Note: We're not copying the actual data here for performance reasons
        // Use framePtr to access actual frame data
        planes[i] = plane;
      }
      frameObj.Set("planes", planes);

      return frameObj;
    }

    DecoderOptions extractDecoderOptions(Napi::Env env, const Napi::Object &options)
    {
      DecoderOptions decoderOptions;

      // Extract codecId (required)
      if (!options.Has("codecId") || !options.Get("codecId").IsNumber())
      {
        Napi::TypeError::New(env, "codecId is required and must be a number").ThrowAsJavaScriptException();
        return decoderOptions;
      }
      decoderOptions.codecId = static_cast<AVCodecID>(options.Get("codecId").As<Napi::Number>().Int32Value());

      // Extract mediaType (optional, can be inferred from codec)
      extractMediaType(options, decoderOptions);

      // Extract video and audio parameters
      extractVideoParameters(options, decoderOptions);
      extractAudioParameters(options, decoderOptions);

      // Extract timeBase if provided
      extractTimeBase(options, decoderOptions);

      // Extract extradata if provided
      extractExtraData(options, decoderOptions);

      return decoderOptions;
    }

    void extractMediaType(const Napi::Object &options, DecoderOptions &decoderOptions)
    {
      if (options.Has("mediaType") && options.Get("mediaType").IsString())
      {
        std::string mediaType = options.Get("mediaType").As<Napi::String>().Utf8Value();
        if (mediaType == "video")
        {
          decoderOptions.mediaType = AVMEDIA_TYPE_VIDEO;
        }
        else if (mediaType == "audio")
        {
          decoderOptions.mediaType = AVMEDIA_TYPE_AUDIO;
        }
      }
    }

    void extractVideoParameters(const Napi::Object &options, DecoderOptions &decoderOptions)
    {
      if (options.Has("width") && options.Get("width").IsNumber())
      {
        decoderOptions.width = options.Get("width").As<Napi::Number>().Int32Value();
      }
      if (options.Has("height") && options.Get("height").IsNumber())
      {
        decoderOptions.height = options.Get("height").As<Napi::Number>().Int32Value();
      }
    }

    void extractAudioParameters(const Napi::Object &options, DecoderOptions &decoderOptions)
    {
      if (options.Has("channels") && options.Get("channels").IsNumber())
      {
        decoderOptions.channels = options.Get("channels").As<Napi::Number>().Int32Value();
      }
      if (options.Has("sampleRate") && options.Get("sampleRate").IsNumber())
      {
        decoderOptions.sampleRate = options.Get("sampleRate").As<Napi::Number>().Int32Value();
      }
    }

    void extractTimeBase(const Napi::Object &options, DecoderOptions &decoderOptions)
    {
      if (options.Has("timeBase") && options.Get("timeBase").IsObject())
      {
        Napi::Object timeBase = options.Get("timeBase").As<Napi::Object>();
        if (timeBase.Has("num") && timeBase.Has("den") &&
            timeBase.Get("num").IsNumber() && timeBase.Get("den").IsNumber())
        {
          decoderOptions.timeBase.num = timeBase.Get("num").As<Napi::Number>().Int32Value();
          decoderOptions.timeBase.den = timeBase.Get("den").As<Napi::Number>().Int32Value();
        }
      }
    }

    void extractExtraData(const Napi::Object &options, DecoderOptions &decoderOptions)
    {
      if (options.Has("extradata") && !options.Get("extradata").IsNull())
      {
        Napi::Value extradataValue = options.Get("extradata");
        if (extradataValue.IsTypedArray())
        {
          Napi::TypedArray typedArray = extradataValue.As<Napi::TypedArray>();
          Napi::ArrayBuffer buffer = typedArray.ArrayBuffer();
          size_t byteOffset = typedArray.ByteOffset();
          size_t byteLength = typedArray.ByteLength();

          const uint8_t *data = static_cast<const uint8_t *>(buffer.Data()) + byteOffset;
          decoderOptions.extradata.assign(data, data + byteLength);
        }
      }
    }
  };

  // Factory function to create Decoder instances
  Napi::Value CreateDecoderNative(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject())
    {
      Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Get the constructor from centralized references
    ConstructorReferences *refs = ConstructorReferences::getInstance(env);
    if (!refs->decoderConstructor)
    {
      Napi::Error::New(env, "Decoder constructor not available").ThrowAsJavaScriptException();
      return env.Null();
    }

    return refs->decoderConstructor->New({info[0]});
  }

  Napi::Object InitDecoder(Napi::Env env, Napi::Object exports)
  {
    DecoderWrapper::Init(env, exports);
    exports.Set("createDecoderNative", Napi::Function::New(env, CreateDecoderNative));
    return exports;
  }

} // namespace playback