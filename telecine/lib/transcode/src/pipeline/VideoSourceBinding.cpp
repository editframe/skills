#include <napi.h>
#include "VideoSource.h"
#include "../logging.h"
#include "../ConstructorReferences.h"
#include "../async/ReadPacketAsyncWorker.h"
#include "../async/InitializeAsyncWorker.h"

namespace playback
{

  class VideoSourceWrapper : public Napi::ObjectWrap<VideoSourceWrapper>
  {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports)
    {
      Napi::Function func = DefineClass(env, "VideoSource", {
                                                                InstanceMethod("initializeAsync", &VideoSourceWrapper::InitializeAsync),
                                                                InstanceMethod("seek", &VideoSourceWrapper::Seek),
                                                                InstanceMethod("readPacketAsync", &VideoSourceWrapper::ReadPacketAsync),
                                                                InstanceMethod("findByteRangeForTimeRange", &VideoSourceWrapper::FindByteRangeForTimeRange),
                                                                InstanceMethod("getSampleTableEntries", &VideoSourceWrapper::GetSampleTableEntries),
                                                                InstanceMethod("findKeyframeAlignedData", &VideoSourceWrapper::FindKeyframeAlignedData),
                                                                InstanceMethod("dispose", &VideoSourceWrapper::Dispose),
                                                                InstanceAccessor("url", &VideoSourceWrapper::GetUrl, nullptr),
                                                                InstanceAccessor("durationMs", &VideoSourceWrapper::GetDurationMs, nullptr),
                                                                InstanceAccessor("streams", &VideoSourceWrapper::GetStreams, nullptr),
                                                                InstanceAccessor("canReadPackets", &VideoSourceWrapper::GetCanReadPackets, nullptr),
                                                                InstanceAccessor("hasIndexEntries", &VideoSourceWrapper::GetHasIndexEntries, nullptr),
                                                            });

      // Get centralized constructor references and set safely
      ConstructorReferences *refs = ConstructorReferences::getInstance(env);
      refs->setVideoSourceConstructor(func);

      exports.Set("VideoSource", func);
      return exports;
    }

    VideoSourceWrapper(const Napi::CallbackInfo &info)
        : Napi::ObjectWrap<VideoSourceWrapper>(info)
    {

      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsObject())
      {
        Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
        return;
      }

      Napi::Object options = info[0].As<Napi::Object>();

      VideoSourceOptions sourceOptions;

      // Extract URL
      if (!options.Has("url") || !options.Get("url").IsString())
      {
        Napi::TypeError::New(env, "url is required and must be a string").ThrowAsJavaScriptException();
        return;
      }
      sourceOptions.url = options.Get("url").As<Napi::String>().Utf8Value();

      // Extract useSyntheticMp4 flag
      if (options.Has("useSyntheticMp4") && options.Get("useSyntheticMp4").IsBoolean())
      {
        sourceOptions.useSyntheticMp4 = options.Get("useSyntheticMp4").As<Napi::Boolean>().Value();
      }

      // Extract synthetic MP4 buffer if provided
      if (options.Has("syntheticMp4") && !options.Get("syntheticMp4").IsNull())
      {
        Napi::Value mp4Value = options.Get("syntheticMp4");
        if (mp4Value.IsTypedArray())
        {
          Napi::TypedArray typedArray = mp4Value.As<Napi::TypedArray>();
          Napi::ArrayBuffer buffer = typedArray.ArrayBuffer();
          size_t byteOffset = typedArray.ByteOffset();
          size_t byteLength = typedArray.ByteLength();

          const uint8_t *data = static_cast<const uint8_t *>(buffer.Data()) + byteOffset;
          sourceOptions.syntheticMp4.assign(data, data + byteLength);
          sourceOptions.useSyntheticMp4 = true;
        }
      }

      // Extract useSegmentData flag
      if (options.Has("useSegmentData") && options.Get("useSegmentData").IsBoolean())
      {
        sourceOptions.useSegmentData = options.Get("useSegmentData").As<Napi::Boolean>().Value();
      }

      // Extract segment data buffer if provided
      if (options.Has("segmentData") && !options.Get("segmentData").IsNull())
      {
        Napi::Value segmentValue = options.Get("segmentData");
        if (segmentValue.IsTypedArray())
        {
          Napi::TypedArray typedArray = segmentValue.As<Napi::TypedArray>();
          Napi::ArrayBuffer buffer = typedArray.ArrayBuffer();
          size_t byteOffset = typedArray.ByteOffset();
          size_t byteLength = typedArray.ByteLength();

          const uint8_t *data = static_cast<const uint8_t *>(buffer.Data()) + byteOffset;
          sourceOptions.segmentData.assign(data, data + byteLength);
          sourceOptions.useSegmentData = true;
        }
      }

      videoSource_ = std::make_unique<VideoSource>(sourceOptions);
    }

    Napi::Value InitializeAsync(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsFunction())
      {
        Napi::TypeError::New(env, "Expected callback function as first argument").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (!videoSource_)
      {
        Napi::Error::New(env, "VideoSource is null").ThrowAsJavaScriptException();
        return env.Null();
      }

      Napi::Function callback = info[0].As<Napi::Function>();

      // Create and queue the async worker - this prevents main thread blocking
      InitializeAsyncWorker *worker = new InitializeAsyncWorker(callback, videoSource_.get());
      worker->Queue();

      // std::cerr << "[VideoSourceWrapper] InitializeAsync worker queued" << std::endl;
      return env.Undefined();
    }

    Napi::Value Seek(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsNumber())
      {
        Napi::TypeError::New(env, "Expected timeMs as number").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (!videoSource_)
      {
        Napi::Error::New(env, "VideoSource is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      double timeMs = info[0].As<Napi::Number>().DoubleValue();
      bool success = videoSource_->seek(timeMs);
      return Napi::Boolean::New(env, success);
    }

    Napi::Value ReadPacketAsync(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsFunction())
      {
        Napi::TypeError::New(env, "Expected callback function as first argument").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (!videoSource_)
      {
        Napi::Error::New(env, "VideoSource is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      Napi::Function callback = info[0].As<Napi::Function>();

      // Create and queue the async worker - this prevents main thread blocking
      ReadPacketAsyncWorker *worker = new ReadPacketAsyncWorker(callback, videoSource_.get());
      worker->Queue();

      // std::cerr << "[VideoSourceWrapper] ReadPacketAsync worker queued" << std::endl;
      return env.Undefined();
    }

    Napi::Value GetUrl(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!videoSource_)
      {
        return env.Null();
      }

      return Napi::String::New(env, videoSource_->url());
    }

    Napi::Value GetDurationMs(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!videoSource_)
      {
        return env.Null();
      }

      return Napi::Number::New(env, videoSource_->durationMs());
    }

    Napi::Value GetStreams(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!videoSource_)
      {
        return env.Null();
      }

      const auto &streams = videoSource_->streams();
      Napi::Array jsStreams = Napi::Array::New(env, streams.size());

      for (size_t i = 0; i < streams.size(); ++i)
      {
        const VideoStreamInfo &stream = streams[i];
        Napi::Object streamObj = Napi::Object::New(env);

        streamObj.Set("index", Napi::Number::New(env, stream.index));
        streamObj.Set("duration", Napi::Number::New(env, static_cast<double>(stream.duration)));
        streamObj.Set("durationMs", Napi::Number::New(env, stream.durationMs));
        streamObj.Set("codecId", Napi::Number::New(env, stream.codecId));
        streamObj.Set("codecName", Napi::String::New(env, stream.codecName));

        // Convert codec type to string
        std::string codecType;
        switch (stream.codecType)
        {
        case AVMEDIA_TYPE_VIDEO:
          codecType = "video";
          break;
        case AVMEDIA_TYPE_AUDIO:
          codecType = "audio";
          break;
        case AVMEDIA_TYPE_SUBTITLE:
          codecType = "subtitle";
          break;
        default:
          codecType = "other";
          break;
        }
        streamObj.Set("codecType", Napi::String::New(env, codecType));

        // Time base
        Napi::Object timeBase = Napi::Object::New(env);
        timeBase.Set("num", Napi::Number::New(env, stream.timeBase.num));
        timeBase.Set("den", Napi::Number::New(env, stream.timeBase.den));
        streamObj.Set("timeBase", timeBase);

        // Video-specific properties
        if (stream.codecType == AVMEDIA_TYPE_VIDEO)
        {
          if (stream.width > 0)
            streamObj.Set("width", Napi::Number::New(env, stream.width));
          if (stream.height > 0)
            streamObj.Set("height", Napi::Number::New(env, stream.height));

          if (stream.frameRate.num > 0 && stream.frameRate.den > 0)
          {
            Napi::Object frameRate = Napi::Object::New(env);
            frameRate.Set("num", Napi::Number::New(env, stream.frameRate.num));
            frameRate.Set("den", Napi::Number::New(env, stream.frameRate.den));
            streamObj.Set("frameRate", frameRate);
          }
        }

        // Audio-specific properties
        if (stream.codecType == AVMEDIA_TYPE_AUDIO)
        {
          if (stream.channels > 0)
            streamObj.Set("channels", Napi::Number::New(env, stream.channels));
          if (stream.sampleRate > 0)
            streamObj.Set("sampleRate", Napi::Number::New(env, stream.sampleRate));
        }

        // Export extradata (codec-specific data like SPS/PPS for H.264)
        if (stream.codecParams && stream.codecParams->extradata_size > 0)
        {
          Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, stream.codecParams->extradata_size);
          memcpy(buffer.Data(), stream.codecParams->extradata, stream.codecParams->extradata_size);
          streamObj.Set("extradata", Napi::Uint8Array::New(env, stream.codecParams->extradata_size, buffer, 0));
        }

        jsStreams[i] = streamObj;
      }

      return jsStreams;
    }

    Napi::Value GetCanReadPackets(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!videoSource_)
      {
        return Napi::Boolean::New(env, false);
      }

      return Napi::Boolean::New(env, videoSource_->canReadPackets());
    }

    Napi::Value FindByteRangeForTimeRange(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber())
      {
        Napi::TypeError::New(env, "Expected startTimeMs and endTimeMs as numbers").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (!videoSource_)
      {
        Napi::Error::New(env, "VideoSource is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      double startTimeMs = info[0].As<Napi::Number>().DoubleValue();
      double endTimeMs = info[1].As<Napi::Number>().DoubleValue();

      int64_t startByte, endByte;
      double expandedStartTimeMs, expandedEndTimeMs;
      bool success = videoSource_->findByteRangeForTimeRange(startTimeMs, endTimeMs, &startByte, &endByte, &expandedStartTimeMs, &expandedEndTimeMs);

      if (!success)
      {
        Napi::TypeError::New(env, "Failed to find byte range for time range").ThrowAsJavaScriptException();
        return env.Null();
      }

      Napi::Object result = Napi::Object::New(env);
      result.Set("startByte", Napi::Number::New(env, static_cast<double>(startByte)));
      result.Set("endByte", Napi::Number::New(env, static_cast<double>(endByte)));
      result.Set("expandedStartTimeMs", Napi::Number::New(env, expandedStartTimeMs));
      result.Set("expandedEndTimeMs", Napi::Number::New(env, expandedEndTimeMs));

      return result;
    }

    Napi::Value GetSampleTableEntries(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber())
      {
        Napi::TypeError::New(env, "Expected streamIndex, startTimeMs, and endTimeMs as numbers").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (!videoSource_)
      {
        Napi::Error::New(env, "VideoSource is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      int streamIndex = info[0].As<Napi::Number>().Int32Value();
      double startTimeMs = info[1].As<Napi::Number>().DoubleValue();
      double endTimeMs = info[2].As<Napi::Number>().DoubleValue();

      std::vector<playback::SampleTableEntry> entries = videoSource_->getSampleTableEntries(streamIndex, startTimeMs, endTimeMs);

      Napi::Array jsEntries = Napi::Array::New(env, entries.size());

      for (size_t i = 0; i < entries.size(); ++i)
      {
        const playback::SampleTableEntry &entry = entries[i];
        Napi::Object entryObj = Napi::Object::New(env);

        entryObj.Set("dts", Napi::Number::New(env, static_cast<double>(entry.dts)));
        entryObj.Set("dtsMs", Napi::Number::New(env, entry.dtsMs));
        entryObj.Set("pos", Napi::Number::New(env, static_cast<double>(entry.pos)));
        entryObj.Set("size", Napi::Number::New(env, static_cast<double>(entry.size)));
        entryObj.Set("isKeyframe", Napi::Boolean::New(env, entry.isKeyframe));
        entryObj.Set("flags", Napi::Number::New(env, entry.flags));

        jsEntries[i] = entryObj;
      }

      return jsEntries;
    }

    Napi::Value FindKeyframeAlignedData(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber())
      {
        Napi::TypeError::New(env, "Expected streamIndex, startTimeMs, and endTimeMs as numbers").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (!videoSource_)
      {
        Napi::Error::New(env, "VideoSource is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      int streamIndex = info[0].As<Napi::Number>().Int32Value();
      double startTimeMs = info[1].As<Napi::Number>().DoubleValue();
      double endTimeMs = info[2].As<Napi::Number>().DoubleValue();

      playback::VideoSource::KeyframeAlignedResult result;
      bool success = videoSource_->findKeyframeAlignedData(streamIndex, startTimeMs, endTimeMs, &result);

      if (!success)
      {
        Napi::TypeError::New(env, "Failed to find keyframe aligned data").ThrowAsJavaScriptException();
        return env.Null();
      }

      // Convert sample table entries to JavaScript array
      Napi::Array jsEntries = Napi::Array::New(env, result.sampleTableEntries.size());

      for (size_t i = 0; i < result.sampleTableEntries.size(); ++i)
      {
        const playback::SampleTableEntry &entry = result.sampleTableEntries[i];
        Napi::Object entryObj = Napi::Object::New(env);

        entryObj.Set("dts", Napi::Number::New(env, static_cast<double>(entry.dts)));
        entryObj.Set("dtsMs", Napi::Number::New(env, entry.dtsMs));
        entryObj.Set("pos", Napi::Number::New(env, static_cast<double>(entry.pos)));
        entryObj.Set("size", Napi::Number::New(env, static_cast<double>(entry.size)));
        entryObj.Set("isKeyframe", Napi::Boolean::New(env, entry.isKeyframe));
        entryObj.Set("flags", Napi::Number::New(env, entry.flags));

        jsEntries[i] = entryObj;
      }

      // Return complete result with byte range and sample table entries
      Napi::Object resultObj = Napi::Object::New(env);
      resultObj.Set("startByte", Napi::Number::New(env, static_cast<double>(result.startByte)));
      resultObj.Set("endByte", Napi::Number::New(env, static_cast<double>(result.endByte)));
      resultObj.Set("expandedStartTimeMs", Napi::Number::New(env, result.expandedStartTimeMs));
      resultObj.Set("expandedEndTimeMs", Napi::Number::New(env, result.expandedEndTimeMs));
      resultObj.Set("sampleTableEntries", jsEntries);

      return resultObj;
    }

    Napi::Value GetHasIndexEntries(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!videoSource_)
      {
        return Napi::Boolean::New(env, false);
      }

      return Napi::Boolean::New(env, videoSource_->hasIndexEntries());
    }

    Napi::Value Dispose(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (videoSource_)
      {
        videoSource_->dispose();
        videoSource_.reset();
      }

      return env.Undefined();
    }

  private:
    std::unique_ptr<VideoSource> videoSource_;
  };

  // Factory function to create VideoSource instances
  Napi::Value CreateVideoSourceNative(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject())
    {
      Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Get the constructor from centralized references
    ConstructorReferences *refs = ConstructorReferences::getInstance(env);
    if (!refs->videoSourceConstructor)
    {
      Napi::Error::New(env, "VideoSource constructor not available").ThrowAsJavaScriptException();
      return env.Null();
    }

    return refs->videoSourceConstructor->New({info[0]});
  }

  Napi::Object InitVideoSource(Napi::Env env, Napi::Object exports)
  {
    VideoSourceWrapper::Init(env, exports);
    exports.Set("createVideoSourceNative", Napi::Function::New(env, CreateVideoSourceNative));
    return exports;
  }

} // namespace playback