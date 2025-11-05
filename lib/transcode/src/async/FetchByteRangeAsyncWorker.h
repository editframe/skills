#ifndef FETCHBYTERANGEASYNCWORKER_H
#define FETCHBYTERANGEASYNCWORKER_H

#include <napi.h>
#include <string>
#include <vector>
#include <curl/curl.h>

namespace playback
{

  class FetchByteRangeAsyncWorker : public Napi::AsyncWorker
  {
  public:
    FetchByteRangeAsyncWorker(Napi::Function &callback,
                              const std::string &url,
                              int64_t startByte,
                              int64_t endByte);

    ~FetchByteRangeAsyncWorker();

    void Execute() override;
    void OnOK() override;
    void OnError(const Napi::Error &error) override;

    // Static CURL callback
    static size_t CurlWriteCallback(void *contents, size_t size, size_t nmemb, void *userp);

  private:
    std::string url_;
    int64_t startByte_;
    int64_t endByte_;
    std::vector<uint8_t> fetchedData_;
    CURL *curlHandle_;
    bool curlInitialized_;
    long httpResponseCode_;

    void initializeCurl();
    void cleanupCurl();
  };

} // namespace playback

#endif // FETCHBYTERANGEASYNCWORKER_H