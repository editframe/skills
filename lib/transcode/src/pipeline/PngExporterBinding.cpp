#include <napi.h>
#include "PngExporter.h"
#include "../logging.h"
#include "../ConstructorReferences.h"

namespace playback
{

  class PngExporterWrapper : public Napi::ObjectWrap<PngExporterWrapper>
  {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports)
    {
      Napi::Function func = DefineClass(env, "PngExporter", {
                                                                InstanceMethod("exportFrameToPng", &PngExporterWrapper::ExportFrameToPng),
                                                                InstanceMethod("dispose", &PngExporterWrapper::Dispose),
                                                            });

      // Get centralized constructor references and set safely
      ConstructorReferences *refs = ConstructorReferences::getInstance(env);
      refs->setPngExporterConstructor(func);

      exports.Set("PngExporter", func);
      return exports;
    }

    PngExporterWrapper(const Napi::CallbackInfo &info) : Napi::ObjectWrap<PngExporterWrapper>(info)
    {
      Napi::Env env = info.Env();

      try
      {
        exporter_ = std::make_unique<playback::PngExporter>();
      }
      catch (const std::exception &e)
      {
        Napi::Error::New(env, "Failed to create PngExporter: " + std::string(e.what())).ThrowAsJavaScriptException();
        return;
      }
    }

    Napi::Value ExportFrameToPng(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (!exporter_)
      {
        Napi::Error::New(env, "PngExporter is disposed").ThrowAsJavaScriptException();
        return env.Null();
      }

      if (info.Length() < 1 || !info[0].IsNumber())
      {
        Napi::TypeError::New(env, "Expected framePtr as first argument").ThrowAsJavaScriptException();
        return env.Null();
      }

      // Get frame pointer
      uintptr_t framePtr = static_cast<uintptr_t>(info[0].As<Napi::Number>().DoubleValue());

      // Optional width and height parameters
      int targetWidth = 0;
      int targetHeight = 0;

      if (info.Length() >= 2 && info[1].IsNumber())
      {
        targetWidth = info[1].As<Napi::Number>().Int32Value();
      }

      if (info.Length() >= 3 && info[2].IsNumber())
      {
        targetHeight = info[2].As<Napi::Number>().Int32Value();
      }

      // Export frame to PNG
      std::vector<uint8_t> pngData;
      bool success = exporter_->exportFrameToPng(framePtr, pngData, targetWidth, targetHeight);

      if (!success)
      {
        Napi::Error::New(env, "Failed to export frame to PNG").ThrowAsJavaScriptException();
        return env.Null();
      }

      // Create Node.js Buffer from PNG data
      Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, pngData.data(), pngData.size());
      return buffer;
    }

    Napi::Value Dispose(const Napi::CallbackInfo &info)
    {
      Napi::Env env = info.Env();

      if (exporter_)
      {
        exporter_->dispose();
        exporter_.reset();
      }

      return env.Undefined();
    }

  private:
    std::unique_ptr<playback::PngExporter> exporter_;
  };

  // Factory function to create PngExporter instances
  Napi::Value CreatePngExporterNative(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();

    // Get the constructor from centralized references
    ConstructorReferences *refs = ConstructorReferences::getInstance(env);
    if (!refs->pngExporterConstructor)
    {
      Napi::Error::New(env, "PngExporter constructor not available").ThrowAsJavaScriptException();
      return env.Null();
    }

    return refs->pngExporterConstructor->New({});
  }

  Napi::Object InitPngExporter(Napi::Env env, Napi::Object exports)
  {
    PngExporterWrapper::Init(env, exports);
    exports.Set("createPngExporterNative", Napi::Function::New(env, CreatePngExporterNative));
    return exports;
  }

} // namespace playback