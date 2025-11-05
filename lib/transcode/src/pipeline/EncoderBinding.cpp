#include <napi.h>
#include "Encoder.h"
#include "../logging.h"
#include "../ConstructorReferences.h"
#include "../async/EncodeAsyncWorker.h"

extern "C"
{
#include <libavcodec/avcodec.h>
#include <libavutil/pixfmt.h>
#include <libavutil/samplefmt.h>
}

namespace playback
{

  class EncoderWrapper : public Napi::ObjectWrap<EncoderWrapper>
  {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports)
    {
      Napi::Function func = DefineClass(env, "Encoder", {
                                                            InstanceMethod("initialize", &EncoderWrapper::Initialize),
                                                            InstanceMethod("encodeAsync", &EncoderWrapper::EncodeFrameAsync),
                                                            InstanceMethod("encodeFrameInfo", &EncoderWrapper::EncodeFrameInfo),
                                                            InstanceMethod("getTimeBase", &EncoderWrapper::GetTimeBase),
                                                            InstanceMethod("getExtradata", &EncoderWrapper::GetExtradata),
                                                            InstanceMethod("getCodecParameters", &EncoderWrapper::GetCodecParameters),
                                                            InstanceMethod("flush", &EncoderWrapper::Flush),
                                                            InstanceMethod("dispose", &EncoderWrapper::Dispose),
                                                            InstanceAccessor("mediaType", &EncoderWrapper::GetMediaType, nullptr),
                                                            InstanceAccessor("codecId", &EncoderWrapper::GetCodecId, nullptr),
                                                            InstanceAccessor("codecName", &EncoderWrapper::GetCodecName, nullptr),
                                                            InstanceAccessor("isInitialized", &EncoderWrapper::GetIsInitialized, nullptr),
                                                            InstanceAccessor("framesEncoded", &EncoderWrapper::GetFramesEncoded, nullptr),
                                                            InstanceAccessor("bytesEncoded", &EncoderWrapper::GetBytesEncoded, nullptr),
                                                        });

      // Get centralized constructor references and set safely
      ConstructorReferences *refs = ConstructorReferences::getInstance(env);
      refs->setEncoderConstructor(func);

      exports.Set("Encoder", func);
      return exports;
    }

    EncoderWrapper(const Napi::CallbackInfo &info)
        : Napi::ObjectWrap<EncoderWrapper>(info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsObject())
      {
        Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
        return;
      }

      Napi::Object options = info[0].As<Napi::Object>();
      EncoderOptions encoderOptions = extractEncoderOptions(env, options);
      encoder_ = std::make_unique<playback::Encoder>(encoderOptions);
    }

    Napi::Value Initialize(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        Napi::Error::New(env, "Encoder is null").ThrowAsJavaScriptException();
        return env.Null();
      }

      bool success = encoder_->initialize();
      return Napi::Boolean::New(env, success);
    }

    Napi::Value EncodeFrameAsync(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsFunction())
      {
        Napi::TypeError::New(env, "Expected frame object and callback function").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (!encoder_)
      {
        Napi::Error::New(env, "Encoder is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      Napi::Object frameObj = info[0].As<Napi::Object>();
      Napi::Function callback = info[1].As<Napi::Function>();

      // Create AVFrame from JavaScript object (simplified - in practice would convert frameObj to AVFrame)
      // For now, this is a placeholder that would need proper frame conversion
      AVFrame *frame = av_frame_alloc();
      if (!frame)
      {
        Napi::Error::New(env, "Failed to allocate frame").ThrowAsJavaScriptException();
        return env.Null();
      }

      // TODO: Convert frameObj to AVFrame properly
      // For now just set basic properties as placeholder
      // This would need to handle:
      // - frame data (video pixels or audio samples)
      // - format, width, height (video) or channels, sample_rate (audio)
      // - pts, dts, etc.

      // Create and queue the async worker - this prevents main thread blocking
      EncodeAsyncWorker *worker = new EncodeAsyncWorker(callback, encoder_.get(), frame);
      worker->Queue();

      av_frame_free(&frame); // Free the original, EncodeAsyncWorker makes its own copy

      return env.Undefined();
    }

    Napi::Value EncodeFrameInfo(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsObject())
      {
        Napi::TypeError::New(env, "Expected frame object with framePtr").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (!encoder_)
      {
        Napi::Error::New(env, "Encoder is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      Napi::Object frameObj = info[0].As<Napi::Object>();

      // Extract framePtr from the frame object
      if (!frameObj.Has("framePtr") || !frameObj.Get("framePtr").IsNumber())
      {
        Napi::TypeError::New(env, "Frame object must have framePtr property").ThrowAsJavaScriptException();
        return env.Null();
      }

      uintptr_t framePtr = static_cast<uintptr_t>(frameObj.Get("framePtr").As<Napi::Number>().DoubleValue());

      // Extract PTS if available
      int64_t pts = AV_NOPTS_VALUE;
      if (frameObj.Has("pts") && frameObj.Get("pts").IsNumber())
      {
        pts = static_cast<int64_t>(frameObj.Get("pts").As<Napi::Number>().DoubleValue());
      }

      // Create FrameInfo structure
      FrameInfo frameInfo;
      frameInfo.framePtr = framePtr;
      frameInfo.pts = pts;

      std::vector<EncodedPacketInfo> packets;
      bool success;

      // Check if sourceTimeBase is provided as second parameter
      if (info.Length() >= 2 && info[1].IsObject())
      {
        Napi::Object timeBaseObj = info[1].As<Napi::Object>();

        if (!timeBaseObj.Has("num") || !timeBaseObj.Has("den") ||
            !timeBaseObj.Get("num").IsNumber() || !timeBaseObj.Get("den").IsNumber())
        {
          Napi::TypeError::New(env, "sourceTimeBase must have 'num' and 'den' properties").ThrowAsJavaScriptException();
          return env.Null();
        }

        AVRational sourceTimeBase;
        sourceTimeBase.num = timeBaseObj.Get("num").As<Napi::Number>().Int32Value();
        sourceTimeBase.den = timeBaseObj.Get("den").As<Napi::Number>().Int32Value();

        // Use the encoder's encodeFrameInfo method with timebase conversion
        success = encoder_->encodeFrameInfo(frameInfo, sourceTimeBase, packets);
      }
      else
      {
        // Use the encoder's encodeFrameInfo method without timebase conversion
        success = encoder_->encodeFrameInfo(frameInfo, packets);
      }

      if (!success)
      {
        return Napi::Array::New(env, 0);
      }

      // Convert packets to JavaScript array
      Napi::Array jsPackets = Napi::Array::New(env, packets.size());
      for (size_t i = 0; i < packets.size(); ++i)
      {
        jsPackets[i] = convertPacketToJS(env, packets[i]);
      }

      return jsPackets;
    }

    Napi::Value Flush(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        Napi::Error::New(env, "Encoder is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      std::vector<EncodedPacketInfo> encodedPackets;
      bool success = encoder_->flush(encodedPackets);

      if (!success)
      {
        // Return empty array instead of null when flushing fails
        return Napi::Array::New(env, 0);
      }

      // Convert encoded packets to JavaScript array
      Napi::Array jsPackets = Napi::Array::New(env, encodedPackets.size());
      for (size_t i = 0; i < encodedPackets.size(); ++i)
      {
        jsPackets[i] = convertPacketToJS(env, encodedPackets[i]);
      }

      return jsPackets;
    }

    Napi::Value GetMediaType(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        return env.Null();
      }

      std::string mediaType;
      switch (encoder_->mediaType())
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

    Napi::Value GetCodecId(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        return env.Null();
      }

      return Napi::Number::New(env, encoder_->codecId());
    }

    Napi::Value GetCodecName(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        return env.Null();
      }

      return Napi::String::New(env, encoder_->codecName());
    }

    Napi::Value GetIsInitialized(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        return Napi::Boolean::New(env, false);
      }

      return Napi::Boolean::New(env, encoder_->isInitialized());
    }

    Napi::Value GetFramesEncoded(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        return Napi::Number::New(env, 0);
      }

      return Napi::Number::New(env, static_cast<double>(encoder_->getFramesEncoded()));
    }

    Napi::Value GetBytesEncoded(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        return Napi::Number::New(env, 0);
      }

      return Napi::Number::New(env, static_cast<double>(encoder_->getBytesEncoded()));
    }

    Napi::Value GetTimeBase(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        return env.Null();
      }

      AVRational timeBase = encoder_->getTimeBase();
      Napi::Object timeBaseObj = Napi::Object::New(env);
      timeBaseObj.Set("num", Napi::Number::New(env, timeBase.num));
      timeBaseObj.Set("den", Napi::Number::New(env, timeBase.den));

      return timeBaseObj;
    }

    Napi::Value GetExtradata(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        return Napi::Uint8Array::New(env, 0);
      }

      std::vector<uint8_t> extradata = encoder_->getExtradata();

      if (extradata.empty())
      {
        return Napi::Uint8Array::New(env, 0);
      }

      // Create ArrayBuffer and copy extradata
      Napi::ArrayBuffer arrayBuffer = Napi::ArrayBuffer::New(env, extradata.size());
      std::memcpy(arrayBuffer.Data(), extradata.data(), extradata.size());

      return Napi::Uint8Array::New(env, extradata.size(), arrayBuffer, 0);
    }

    Napi::Value GetCodecParameters(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!encoder_)
      {
        return env.Null();
      }

      AVCodecParameters *params = encoder_->getCodecParameters();
      if (!params)
      {
        return env.Null();
      }

      // Convert AVCodecParameters to JavaScript object
      Napi::Object paramsObj = Napi::Object::New(env);

      paramsObj.Set("codecId", Napi::Number::New(env, params->codec_id));
      paramsObj.Set("codecType", Napi::Number::New(env, params->codec_type));

      if (params->codec_type == AVMEDIA_TYPE_VIDEO)
      {
        paramsObj.Set("width", Napi::Number::New(env, params->width));
        paramsObj.Set("height", Napi::Number::New(env, params->height));
        paramsObj.Set("pixelFormat", Napi::Number::New(env, params->format));
      }
      else if (params->codec_type == AVMEDIA_TYPE_AUDIO)
      {
        paramsObj.Set("channels", Napi::Number::New(env, params->ch_layout.nb_channels));
        paramsObj.Set("sampleRate", Napi::Number::New(env, params->sample_rate));
        paramsObj.Set("sampleFormat", Napi::Number::New(env, params->format));
      }

      paramsObj.Set("bitRate", Napi::Number::New(env, static_cast<double>(params->bit_rate)));

      // Copy extradata
      if (params->extradata && params->extradata_size > 0)
      {
        Napi::ArrayBuffer arrayBuffer = Napi::ArrayBuffer::New(env, params->extradata_size);
        std::memcpy(arrayBuffer.Data(), params->extradata, params->extradata_size);
        paramsObj.Set("extradata", Napi::Uint8Array::New(env, params->extradata_size, arrayBuffer, 0));
      }
      else
      {
        paramsObj.Set("extradata", Napi::Uint8Array::New(env, 0));
      }

      // Free the parameters (caller responsibility)
      avcodec_parameters_free(&params);

      return paramsObj;
    }

    Napi::Value Dispose(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (encoder_)
      {
        encoder_->dispose();
        encoder_.reset();
      }

      return env.Undefined();
    }

  private:
    std::unique_ptr<playback::Encoder> encoder_;

    EncoderOptions extractEncoderOptions(Napi::Env env, const Napi::Object &options)
    {
      EncoderOptions encoderOptions;

      // Extract required parameters
      if (!extractRequiredParameters(env, options, encoderOptions))
      {
        return encoderOptions; // Error already thrown
      }

      // Extract media-specific parameters
      extractVideoParameters(options, encoderOptions);
      extractAudioParameters(options, encoderOptions);

      // Extract timing and quality parameters
      extractTimingParameters(options, encoderOptions);
      extractQualityParameters(options, encoderOptions);

      return encoderOptions;
    }

    bool extractRequiredParameters(Napi::Env env, const Napi::Object &options, EncoderOptions &encoderOptions)
    {
      // Extract mediaType (required)
      if (!options.Has("mediaType") || !options.Get("mediaType").IsString())
      {
        Napi::TypeError::New(env, "mediaType is required and must be a string").ThrowAsJavaScriptException();
        return false;
      }
      std::string mediaType = options.Get("mediaType").As<Napi::String>().Utf8Value();
      if (mediaType == "video")
      {
        encoderOptions.mediaType = AVMEDIA_TYPE_VIDEO;
      }
      else if (mediaType == "audio")
      {
        encoderOptions.mediaType = AVMEDIA_TYPE_AUDIO;
      }
      else
      {
        Napi::TypeError::New(env, "mediaType must be 'video' or 'audio'").ThrowAsJavaScriptException();
        return false;
      }

      // Extract codecId (required)
      if (!options.Has("codecId") || !options.Get("codecId").IsNumber())
      {
        Napi::TypeError::New(env, "codecId is required and must be a number").ThrowAsJavaScriptException();
        return false;
      }
      encoderOptions.codecId = options.Get("codecId").As<Napi::Number>().Int32Value();

      return true;
    }

    void extractVideoParameters(const Napi::Object &options, EncoderOptions &encoderOptions)
    {
      if (options.Has("width") && options.Get("width").IsNumber())
      {
        encoderOptions.width = options.Get("width").As<Napi::Number>().Int32Value();
      }
      if (options.Has("height") && options.Get("height").IsNumber())
      {
        encoderOptions.height = options.Get("height").As<Napi::Number>().Int32Value();
      }
      if (options.Has("pixelFormat") && options.Get("pixelFormat").IsNumber())
      {
        encoderOptions.pixelFormat = static_cast<AVPixelFormat>(options.Get("pixelFormat").As<Napi::Number>().Int32Value());
      }
      if (options.Has("videoBitrate") && options.Get("videoBitrate").IsNumber())
      {
        encoderOptions.videoBitrate = options.Get("videoBitrate").As<Napi::Number>().Int64Value();
      }
    }

    void extractAudioParameters(const Napi::Object &options, EncoderOptions &encoderOptions)
    {
      if (options.Has("channels") && options.Get("channels").IsNumber())
      {
        encoderOptions.channels = options.Get("channels").As<Napi::Number>().Int32Value();
      }
      if (options.Has("sampleRate") && options.Get("sampleRate").IsNumber())
      {
        encoderOptions.sampleRate = options.Get("sampleRate").As<Napi::Number>().Int32Value();
      }
      if (options.Has("sampleFormat") && options.Get("sampleFormat").IsNumber())
      {
        encoderOptions.sampleFormat = static_cast<AVSampleFormat>(options.Get("sampleFormat").As<Napi::Number>().Int32Value());
      }
      if (options.Has("audioBitrate") && options.Get("audioBitrate").IsNumber())
      {
        encoderOptions.audioBitrate = options.Get("audioBitrate").As<Napi::Number>().Int64Value();
      }
    }

    void extractTimingParameters(const Napi::Object &options, EncoderOptions &encoderOptions)
    {
      if (options.Has("frameRate") && options.Get("frameRate").IsObject())
      {
        Napi::Object frameRate = options.Get("frameRate").As<Napi::Object>();
        if (frameRate.Has("num") && frameRate.Has("den"))
        {
          encoderOptions.frameRate.num = frameRate.Get("num").As<Napi::Number>().Int32Value();
          encoderOptions.frameRate.den = frameRate.Get("den").As<Napi::Number>().Int32Value();
        }
      }
      if (options.Has("timeBase") && options.Get("timeBase").IsObject())
      {
        Napi::Object timeBase = options.Get("timeBase").As<Napi::Object>();
        if (timeBase.Has("num") && timeBase.Has("den"))
        {
          encoderOptions.timeBase.num = timeBase.Get("num").As<Napi::Number>().Int32Value();
          encoderOptions.timeBase.den = timeBase.Get("den").As<Napi::Number>().Int32Value();
        }
      }
    }

    void extractQualityParameters(const Napi::Object &options, EncoderOptions &encoderOptions)
    {
      if (options.Has("quality") && options.Get("quality").IsNumber())
      {
        encoderOptions.quality = options.Get("quality").As<Napi::Number>().Int32Value();
      }
      if (options.Has("preset") && options.Get("preset").IsString())
      {
        encoderOptions.preset = options.Get("preset").As<Napi::String>().Utf8Value();
      }
      if (options.Has("profile") && options.Get("profile").IsString())
      {
        encoderOptions.profile = options.Get("profile").As<Napi::String>().Utf8Value();
      }
      if (options.Has("maxBFrames") && options.Get("maxBFrames").IsNumber())
      {
        encoderOptions.maxBFrames = options.Get("maxBFrames").As<Napi::Number>().Int32Value();
      }
      if (options.Has("gopSize") && options.Get("gopSize").IsNumber())
      {
        encoderOptions.gopSize = options.Get("gopSize").As<Napi::Number>().Int32Value();
      }
    }

    Napi::Object convertPacketToJS(Napi::Env env, const EncodedPacketInfo &packetInfo)
    {
      Napi::Object packetObj = Napi::Object::New(env);

      packetObj.Set("pts", Napi::Number::New(env, static_cast<double>(packetInfo.pts)));
      packetObj.Set("dts", Napi::Number::New(env, static_cast<double>(packetInfo.dts)));
      packetObj.Set("duration", Napi::Number::New(env, static_cast<double>(packetInfo.duration)));
      packetObj.Set("size", Napi::Number::New(env, packetInfo.size));
      packetObj.Set("streamIndex", Napi::Number::New(env, packetInfo.streamIndex));
      packetObj.Set("isKeyFrame", Napi::Boolean::New(env, packetInfo.isKeyFrame));

      // Media type
      std::string mediaType;
      switch (packetInfo.mediaType)
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
      packetObj.Set("mediaType", Napi::String::New(env, mediaType));

      // Convert packet data to Uint8Array
      Napi::ArrayBuffer arrayBuffer = Napi::ArrayBuffer::New(env, packetInfo.data.size());
      std::memcpy(arrayBuffer.Data(), packetInfo.data.data(), packetInfo.data.size());
      packetObj.Set("data", Napi::Uint8Array::New(env, packetInfo.data.size(), arrayBuffer, 0));

      return packetObj;
    }
  };

  // Factory function to create Encoder instances
  Napi::Value CreateEncoderNative(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject())
    {
      Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Get the constructor from centralized references
    ConstructorReferences *refs = ConstructorReferences::getInstance(env);
    if (!refs->encoderConstructor)
    {
      Napi::Error::New(env, "Encoder constructor not available").ThrowAsJavaScriptException();
      return env.Null();
    }

    return refs->encoderConstructor->New({info[0]});
  }

  Napi::Object InitEncoder(Napi::Env env, Napi::Object exports)
  {
    EncoderWrapper::Init(env, exports);
    exports.Set("createEncoderNative", Napi::Function::New(env, CreateEncoderNative));
    return exports;
  }

} // namespace playback