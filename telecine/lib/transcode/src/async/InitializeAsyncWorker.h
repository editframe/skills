#pragma once

#include <napi.h>
#include "../pipeline/VideoSource.h"

namespace playback
{

  /**
   * Async worker for VideoSource initialization
   * Prevents blocking the main thread during FFmpeg format opening and stream analysis
   */
  class InitializeAsyncWorker : public Napi::AsyncWorker
  {
  public:
    InitializeAsyncWorker(Napi::Function &callback, VideoSource *videoSource);
    ~InitializeAsyncWorker();

    void Execute() override;
    void OnOK() override;
    void OnError(const Napi::Error &error) override;

  private:
    VideoSource *videoSource_;
    bool initSuccess_;
    std::string errorMessage_;
  };

} // namespace playback