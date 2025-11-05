#pragma once
#include <napi.h>
#include <vector>

extern "C"
{
#include <libavutil/rational.h>
}

namespace playback
{
  // Forward declare the StreamInfo struct
  struct StreamInfo;

  Napi::Value ValidateRemoteSource(const Napi::CallbackInfo &info);

  class AsyncValidateRemoteSourceWorker : public Napi::AsyncWorker
  {
  public:
    AsyncValidateRemoteSourceWorker(const std::string &url, Napi::Promise::Deferred deferred);
    virtual ~AsyncValidateRemoteSourceWorker();

  protected:
    void Execute() override;
    void OnOK() override;
    void OnError(const Napi::Error &error) override;

  private:
    std::string url_;
    Napi::Promise::Deferred deferred_;
    bool valid_;         // Indicates if the source is valid
    std::string reason_; // Reason why the source is not valid, if applicable

    // Media information
    std::string format_name_;
    double duration_;
    int64_t bit_rate_;
    int video_stream_index_;
    std::vector<StreamInfo> streams_info_;
  };
}