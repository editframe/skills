#pragma once
#include <napi.h>
#include <string>

// Use Napi namespace to avoid name mangling issues
namespace playback
{
  // Main entry point for the JavaScript side
  Napi::Value GetKeyframes(const Napi::CallbackInfo &info);

  // AsyncWorker implementation for keyframe extraction
  class AsyncKeyframesWorker : public Napi::AsyncWorker
  {
  public:
    AsyncKeyframesWorker(const std::string &url, Napi::Promise::Deferred deferred);
    virtual ~AsyncKeyframesWorker();

  protected:
    // Methods inherited from AsyncWorker
    void Execute() override;
    void OnOK() override;
    void OnError(const Napi::Error &error) override;

  private:
    std::string url_;
    Napi::Promise::Deferred deferred_;

    // Additional metadata
    std::string format_;
    double duration_ = 0.0;
    int width_ = 0;
    int height_ = 0;
    std::string codec_;
    double frameRate_ = 0.0;
    int keyframeCount_ = 0;
    std::string method_;

    // Will hold keyframe data
    struct Keyframe
    {
      int index;
      int64_t pts;
      double pts_seconds;
      int64_t pos;
      int size;
    };

    std::vector<Keyframe> keyframes_;
  };
}
