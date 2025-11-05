#include <napi.h>
#include "Filter.h"
#include "../logging.h"
#include "../ConstructorReferences.h"

extern "C"
{
#include <libavcodec/avcodec.h>
#include <libavutil/pixfmt.h>
#include <libavutil/samplefmt.h>
}

namespace playback
{

  class FilterWrapper : public Napi::ObjectWrap<FilterWrapper>
  {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports)
    {
      Napi::Function func = DefineClass(env, "Filter", {
                                                           InstanceMethod("initialize", &FilterWrapper::Initialize),
                                                           InstanceMethod("filter", &FilterWrapper::ProcessFrame),
                                                           InstanceMethod("filterFrame", &FilterWrapper::FilterFrame),
                                                           InstanceMethod("flush", &FilterWrapper::Flush),
                                                           InstanceMethod("dispose", &FilterWrapper::Dispose),
                                                           InstanceAccessor("mediaType", &FilterWrapper::GetMediaType, nullptr),
                                                           InstanceAccessor("filterDescription", &FilterWrapper::GetFilterDescription, nullptr),
                                                           InstanceAccessor("isInitialized", &FilterWrapper::GetIsInitialized, nullptr),
                                                       });

      // Get centralized constructor references and set safely
      ConstructorReferences *refs = ConstructorReferences::getInstance(env);
      refs->setFilterConstructor(func);

      exports.Set("Filter", func);
      return exports;
    }

    FilterWrapper(const Napi::CallbackInfo &info)
        : Napi::ObjectWrap<FilterWrapper>(info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsObject())
      {
        Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
        return;
      }

      Napi::Object options = info[0].As<Napi::Object>();
      FilterOptions filterOptions = extractFilterOptions(env, options);
      filter_ = std::make_unique<playback::Filter>(filterOptions);
    }

    Napi::Value Initialize(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!filter_)
      {
        Napi::Error::New(env, "Filter is null").ThrowAsJavaScriptException();
        return env.Null();
      }

      bool success = filter_->initialize();
      return Napi::Boolean::New(env, success);
    }

    Napi::Value ProcessFrame(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!filter_)
      {
        Napi::Error::New(env, "Filter is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (info.Length() < 1 || !info[0].IsObject())
      {
        Napi::TypeError::New(env, "Expected frame object").ThrowAsJavaScriptException();
        return env.Null();
      }

      Napi::Object frameObj = info[0].As<Napi::Object>();

      // Create AVFrame from JavaScript object (simplified - in practice, this would need
      // more complex frame data handling or integration with Decoder output)
      AVFrame *frame = av_frame_alloc();
      if (!frame)
      {
        Napi::Error::New(env, "Failed to allocate frame").ThrowAsJavaScriptException();
        return env.Null();
      }

      // For now, create a minimal frame structure from JS object
      // In practice, this would be integrated with Decoder output
      if (frameObj.Has("width") && frameObj.Get("width").IsNumber())
      {
        frame->width = frameObj.Get("width").As<Napi::Number>().Int32Value();
      }
      if (frameObj.Has("height") && frameObj.Get("height").IsNumber())
      {
        frame->height = frameObj.Get("height").As<Napi::Number>().Int32Value();
      }
      if (frameObj.Has("format") && frameObj.Get("format").IsNumber())
      {
        frame->format = frameObj.Get("format").As<Napi::Number>().Int32Value();
      }
      if (frameObj.Has("pts") && frameObj.Get("pts").IsNumber())
      {
        frame->pts = static_cast<int64_t>(frameObj.Get("pts").As<Napi::Number>().DoubleValue());
      }

      // Filter the frame
      std::vector<FilteredFrameInfo> filteredFrames;
      bool success = filter_->filter(frame, filteredFrames);

      av_frame_free(&frame);

      if (!success)
      {
        // Return empty array instead of null when filtering fails
        return Napi::Array::New(env, 0);
      }

      // Convert filtered frames to JavaScript array
      Napi::Array jsFrames = Napi::Array::New(env, filteredFrames.size());
      for (size_t i = 0; i < filteredFrames.size(); ++i)
      {
        jsFrames[i] = convertFilteredFrameToJS(env, filteredFrames[i]);
      }

      return jsFrames;
    }

    Napi::Value Flush(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!filter_)
      {
        Napi::Error::New(env, "Filter is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      std::vector<FilteredFrameInfo> filteredFrames;
      bool success = filter_->flush(filteredFrames);

      if (!success)
      {
        // Return empty array instead of null when flushing fails
        return Napi::Array::New(env, 0);
      }

      // Convert filtered frames to JavaScript array
      Napi::Array jsFrames = Napi::Array::New(env, filteredFrames.size());
      for (size_t i = 0; i < filteredFrames.size(); ++i)
      {
        jsFrames[i] = convertFilteredFrameToJS(env, filteredFrames[i]);
      }

      return jsFrames;
    }

    Napi::Value GetMediaType(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!filter_)
      {
        return env.Null();
      }

      std::string mediaType;
      switch (filter_->mediaType())
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

    Napi::Value GetFilterDescription(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!filter_)
      {
        return env.Null();
      }

      return Napi::String::New(env, filter_->filterDescription());
    }

    Napi::Value GetIsInitialized(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!filter_)
      {
        return Napi::Boolean::New(env, false);
      }

      return Napi::Boolean::New(env, filter_->isInitialized());
    }

    Napi::Value Dispose(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (filter_)
      {
        filter_->dispose();
        filter_.reset();
      }

      return env.Undefined();
    }

    Napi::Value Filter(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!filter_)
      {
        Napi::Error::New(env, "Filter is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      // For now, return empty array - actual filtering needs frame data handling
      // TODO: Implement proper frame data handling in TypeScript bindings
      Napi::Array jsFrames = Napi::Array::New(env, 0);
      return jsFrames;
    }

    Napi::Value FilterFrame(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (info.Length() < 1 || !info[0].IsNumber())
      {
        Napi::TypeError::New(env, "Expected framePtr as number").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (!filter_)
      {
        Napi::Error::New(env, "Filter is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      // Get frame pointer from argument
      uintptr_t framePtr = static_cast<uintptr_t>(info[0].As<Napi::Number>().DoubleValue());

      std::vector<FilteredFrameInfo> frames;
      bool success = filter_->filterFrame(framePtr, frames);

      if (!success)
      {
        return Napi::Array::New(env, 0);
      }

      // Convert frames to JavaScript array using the same convertFrameToJS method
      Napi::Array jsFrames = Napi::Array::New(env, frames.size());
      for (size_t i = 0; i < frames.size(); ++i)
      {
        jsFrames[i] = convertFilteredFrameToJS(env, frames[i]);
      }

      return jsFrames;
    }

  private:
    std::unique_ptr<playback::Filter> filter_;

    Napi::Object convertFilteredFrameToJS(Napi::Env env, const FilteredFrameInfo &frameInfo)
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

      // Frame data planes (metadata only for now)
      Napi::Array planes = Napi::Array::New(env, frameInfo.data.size());
      for (size_t i = 0; i < frameInfo.data.size(); ++i)
      {
        Napi::Object plane = Napi::Object::New(env);
        plane.Set("linesize", Napi::Number::New(env, frameInfo.linesize[i]));
        planes[i] = plane;
      }
      frameObj.Set("planes", planes);

      return frameObj;
    }

    FilterOptions extractFilterOptions(Napi::Env env, const Napi::Object &options)
    {
      FilterOptions filterOptions;

      // Extract required parameters
      if (!extractRequiredParameters(env, options, filterOptions))
      {
        return filterOptions; // Error already thrown
      }

      // Extract input parameters
      extractInputParameters(options, filterOptions);

      // Extract output parameters
      extractOutputParameters(options, filterOptions);

      return filterOptions;
    }

    bool extractRequiredParameters(Napi::Env env, const Napi::Object &options, FilterOptions &filterOptions)
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
        filterOptions.mediaType = AVMEDIA_TYPE_VIDEO;
      }
      else if (mediaType == "audio")
      {
        filterOptions.mediaType = AVMEDIA_TYPE_AUDIO;
      }
      else
      {
        Napi::TypeError::New(env, "mediaType must be 'video' or 'audio'").ThrowAsJavaScriptException();
        return false;
      }

      // Extract filterDescription (required)
      if (!options.Has("filterDescription") || !options.Get("filterDescription").IsString())
      {
        Napi::TypeError::New(env, "filterDescription is required and must be a string").ThrowAsJavaScriptException();
        return false;
      }
      filterOptions.filterDescription = options.Get("filterDescription").As<Napi::String>().Utf8Value();

      return true;
    }

    void extractInputParameters(const Napi::Object &options, FilterOptions &filterOptions)
    {
      // Extract input video parameters
      if (options.Has("inputWidth") && options.Get("inputWidth").IsNumber())
      {
        filterOptions.inputWidth = options.Get("inputWidth").As<Napi::Number>().Int32Value();
      }
      if (options.Has("inputHeight") && options.Get("inputHeight").IsNumber())
      {
        filterOptions.inputHeight = options.Get("inputHeight").As<Napi::Number>().Int32Value();
      }
      if (options.Has("inputPixelFormat") && options.Get("inputPixelFormat").IsNumber())
      {
        filterOptions.inputPixelFormat = static_cast<AVPixelFormat>(options.Get("inputPixelFormat").As<Napi::Number>().Int32Value());
      }

      // Extract input audio parameters
      if (options.Has("inputChannels") && options.Get("inputChannels").IsNumber())
      {
        filterOptions.inputChannels = options.Get("inputChannels").As<Napi::Number>().Int32Value();
      }
      if (options.Has("inputSampleRate") && options.Get("inputSampleRate").IsNumber())
      {
        filterOptions.inputSampleRate = options.Get("inputSampleRate").As<Napi::Number>().Int32Value();
      }
      if (options.Has("inputSampleFormat") && options.Get("inputSampleFormat").IsNumber())
      {
        filterOptions.inputSampleFormat = static_cast<AVSampleFormat>(options.Get("inputSampleFormat").As<Napi::Number>().Int32Value());
      }

      // Extract input time base
      if (options.Has("inputTimeBase") && options.Get("inputTimeBase").IsObject())
      {
        Napi::Object timeBase = options.Get("inputTimeBase").As<Napi::Object>();
        if (timeBase.Has("num") && timeBase.Has("den"))
        {
          filterOptions.inputTimeBase.num = timeBase.Get("num").As<Napi::Number>().Int32Value();
          filterOptions.inputTimeBase.den = timeBase.Get("den").As<Napi::Number>().Int32Value();
        }
      }
    }

    void extractOutputParameters(const Napi::Object &options, FilterOptions &filterOptions)
    {
      // Extract output video parameters
      if (options.Has("outputWidth") && options.Get("outputWidth").IsNumber())
      {
        filterOptions.outputWidth = options.Get("outputWidth").As<Napi::Number>().Int32Value();
      }
      if (options.Has("outputHeight") && options.Get("outputHeight").IsNumber())
      {
        filterOptions.outputHeight = options.Get("outputHeight").As<Napi::Number>().Int32Value();
      }
      if (options.Has("outputPixelFormat") && options.Get("outputPixelFormat").IsNumber())
      {
        filterOptions.outputPixelFormat = static_cast<AVPixelFormat>(options.Get("outputPixelFormat").As<Napi::Number>().Int32Value());
      }

      // Extract output audio parameters
      if (options.Has("outputChannels") && options.Get("outputChannels").IsNumber())
      {
        filterOptions.outputChannels = options.Get("outputChannels").As<Napi::Number>().Int32Value();
      }
      if (options.Has("outputSampleRate") && options.Get("outputSampleRate").IsNumber())
      {
        filterOptions.outputSampleRate = options.Get("outputSampleRate").As<Napi::Number>().Int32Value();
      }
      if (options.Has("outputSampleFormat") && options.Get("outputSampleFormat").IsNumber())
      {
        filterOptions.outputSampleFormat = static_cast<AVSampleFormat>(options.Get("outputSampleFormat").As<Napi::Number>().Int32Value());
      }

      // Extract audio frame buffering options
      if (options.Has("enableAudioFrameBuffering") && options.Get("enableAudioFrameBuffering").IsBoolean())
      {
        filterOptions.enableAudioFrameBuffering = options.Get("enableAudioFrameBuffering").As<Napi::Boolean>().Value();
      }
      if (options.Has("targetAudioFrameSize") && options.Get("targetAudioFrameSize").IsNumber())
      {
        filterOptions.targetAudioFrameSize = options.Get("targetAudioFrameSize").As<Napi::Number>().Int32Value();
      }
    }
  };

  // Factory function to create Filter instances
  Napi::Value CreateFilterNative(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject())
    {
      Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Get the constructor from centralized references
    ConstructorReferences *refs = ConstructorReferences::getInstance(env);
    if (!refs->filterConstructor)
    {
      Napi::Error::New(env, "Filter constructor not available").ThrowAsJavaScriptException();
      return env.Null();
    }

    return refs->filterConstructor->New({info[0]});
  }

  Napi::Object InitFilter(Napi::Env env, Napi::Object exports)
  {
    FilterWrapper::Init(env, exports);
    exports.Set("createFilterNative", Napi::Function::New(env, CreateFilterNative));
    return exports;
  }

} // namespace playback