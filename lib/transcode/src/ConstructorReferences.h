#pragma once

#include <napi.h>
#include <memory>

namespace playback
{

  /**
   * Centralized management of N-API constructor references
   * This class ensures proper cleanup and prevents memory leaks
   */
  struct ConstructorReferences
  {
    Napi::FunctionReference *videoSourceConstructor = nullptr;
    Napi::FunctionReference *decoderConstructor = nullptr;
    Napi::FunctionReference *filterConstructor = nullptr;
    Napi::FunctionReference *encoderConstructor = nullptr;
    Napi::FunctionReference *muxerConstructor = nullptr;
    Napi::FunctionReference *packetConstructor = nullptr;
    Napi::FunctionReference *pngExporterConstructor = nullptr;

    // Constructor
    ConstructorReferences() = default;

    // Destructor - properly clean up all references
    ~ConstructorReferences()
    {
      cleanup();
    }

    // Cleanup method to ensure all references are properly deleted
    void cleanup()
    {
      if (videoSourceConstructor)
      {
        delete videoSourceConstructor;
        videoSourceConstructor = nullptr;
      }
      if (decoderConstructor)
      {
        delete decoderConstructor;
        decoderConstructor = nullptr;
      }
      if (filterConstructor)
      {
        delete filterConstructor;
        filterConstructor = nullptr;
      }
      if (encoderConstructor)
      {
        delete encoderConstructor;
        encoderConstructor = nullptr;
      }
      if (muxerConstructor)
      {
        delete muxerConstructor;
        muxerConstructor = nullptr;
      }
      if (packetConstructor)
      {
        delete packetConstructor;
        packetConstructor = nullptr;
      }
      if (pngExporterConstructor)
      {
        delete pngExporterConstructor;
        pngExporterConstructor = nullptr;
      }
    }

    // Get or create the singleton instance
    static ConstructorReferences *getInstance(Napi::Env env)
    {
      ConstructorReferences *refs = env.GetInstanceData<ConstructorReferences>();
      if (!refs)
      {
        refs = new ConstructorReferences();
        // Use template syntax for N-API cleanup
        env.SetInstanceData<ConstructorReferences, cleanupCallback>(refs);
      }
      return refs;
    }

    // Static cleanup callback for N-API
    static void cleanupCallback(Napi::Env, ConstructorReferences *data)
    {
      if (data)
      {
        data->cleanup();
        delete data;
      }
    }

    // Set constructor reference safely (avoid double allocation)
    void setVideoSourceConstructor(Napi::Function constructor)
    {
      if (videoSourceConstructor)
      {
        delete videoSourceConstructor;
      }
      videoSourceConstructor = new Napi::FunctionReference();
      *videoSourceConstructor = Napi::Persistent(constructor);
    }

    void setDecoderConstructor(Napi::Function constructor)
    {
      if (decoderConstructor)
      {
        delete decoderConstructor;
      }
      decoderConstructor = new Napi::FunctionReference();
      *decoderConstructor = Napi::Persistent(constructor);
    }

    void setFilterConstructor(Napi::Function constructor)
    {
      if (filterConstructor)
      {
        delete filterConstructor;
      }
      filterConstructor = new Napi::FunctionReference();
      *filterConstructor = Napi::Persistent(constructor);
    }

    void setEncoderConstructor(Napi::Function constructor)
    {
      if (encoderConstructor)
      {
        delete encoderConstructor;
      }
      encoderConstructor = new Napi::FunctionReference();
      *encoderConstructor = Napi::Persistent(constructor);
    }

    void setMuxerConstructor(Napi::Function constructor)
    {
      if (muxerConstructor)
      {
        delete muxerConstructor;
      }
      muxerConstructor = new Napi::FunctionReference();
      *muxerConstructor = Napi::Persistent(constructor);
    }

    void setPacketConstructor(Napi::Function constructor)
    {
      if (packetConstructor)
      {
        delete packetConstructor;
      }
      packetConstructor = new Napi::FunctionReference();
      *packetConstructor = Napi::Persistent(constructor);
    }

    void setPngExporterConstructor(Napi::Function constructor)
    {
      if (pngExporterConstructor)
      {
        delete pngExporterConstructor;
      }
      pngExporterConstructor = new Napi::FunctionReference();
      *pngExporterConstructor = Napi::Persistent(constructor);
    }

    // Get constructor references
    Napi::Function getPacketConstructor(Napi::Env env)
    {
      if (packetConstructor)
      {
        return packetConstructor->Value();
      }
      Napi::TypeError::New(env, "Packet constructor not initialized").ThrowAsJavaScriptException();
      return Napi::Function();
    }
  };

} // namespace playback