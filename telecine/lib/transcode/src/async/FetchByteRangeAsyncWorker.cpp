#include "FetchByteRangeAsyncWorker.h"
#include "../logging.h"
#include <chrono>
#include <iostream>

namespace playback
{

  FetchByteRangeAsyncWorker::FetchByteRangeAsyncWorker(Napi::Function &callback,
                                                       const std::string &url,
                                                       int64_t startByte,
                                                       int64_t endByte)
      : Napi::AsyncWorker(callback), url_(url), startByte_(startByte), endByte_(endByte),
        curlHandle_(nullptr), curlInitialized_(false), httpResponseCode_(0)
  {
    // std::cerr << "[FetchByteRangeAsyncWorker] Worker created for URL: " << url
    //           << " bytes " << startByte << "-" << endByte << std::endl;
  }

  FetchByteRangeAsyncWorker::~FetchByteRangeAsyncWorker()
  {
    cleanupCurl();
    // std::cerr << "[FetchByteRangeAsyncWorker] Worker destroyed" << std::endl;
  }

  void FetchByteRangeAsyncWorker::initializeCurl()
  {
    curlHandle_ = curl_easy_init();
    if (!curlHandle_)
    {
      SetError("Failed to initialize CURL");
      return;
    }

    // Basic CURL options
    curl_easy_setopt(curlHandle_, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curlHandle_, CURLOPT_TIMEOUT, 30L);
    curl_easy_setopt(curlHandle_, CURLOPT_USERAGENT, "playback/1.0");
    curl_easy_setopt(curlHandle_, CURLOPT_WRITEFUNCTION, CurlWriteCallback);
    curl_easy_setopt(curlHandle_, CURLOPT_WRITEDATA, this);

    curlInitialized_ = true;
  }

  void FetchByteRangeAsyncWorker::cleanupCurl()
  {
    if (curlHandle_)
    {
      curl_easy_cleanup(curlHandle_);
      curlHandle_ = nullptr;
    }
    curlInitialized_ = false;
  }

  void FetchByteRangeAsyncWorker::Execute()
  {
    // std::cerr << "[FetchByteRangeAsyncWorker] Execute() starting in background thread" << std::endl;

    // Clear any existing data
    fetchedData_.clear();

    // Initialize CURL
    initializeCurl();
    if (!curlInitialized_)
    {
      return; // Error already set
    }

    // Set URL
    curl_easy_setopt(curlHandle_, CURLOPT_URL, url_.c_str());

    // Create range header - adapted from FetchHttpByteRange.cpp
    std::string rangeHeader = "Range: bytes=" + std::to_string(startByte_) + "-" + std::to_string(endByte_);

    struct curl_slist *headers = nullptr;
    headers = curl_slist_append(headers, rangeHeader.c_str());
    curl_easy_setopt(curlHandle_, CURLOPT_HTTPHEADER, headers);

    // std::cerr << "[FetchByteRangeAsyncWorker] Fetching: " << url_ << " with " << rangeHeader << std::endl;

    // Start timing
    auto startTime = std::chrono::high_resolution_clock::now();

    // Perform the request
    CURLcode res = curl_easy_perform(curlHandle_);

    // End timing
    auto endTime = std::chrono::high_resolution_clock::now();
    auto durationMs = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime).count();

    // Clean up headers
    curl_slist_free_all(headers);

    // Check for CURL errors
    if (res != CURLE_OK)
    {
      SetError("CURL failed: " + std::string(curl_easy_strerror(res)));
      return;
    }

    // Check HTTP response code
    curl_easy_getinfo(curlHandle_, CURLINFO_RESPONSE_CODE, &httpResponseCode_);
    if (httpResponseCode_ != 206 && httpResponseCode_ != 200)
    {
      SetError("HTTP error: " + std::to_string(httpResponseCode_));
      return;
    }

    // std::cerr << "[FetchByteRangeAsyncWorker] Successfully fetched " << fetchedData_.size()
    //           << " bytes in " << durationMs << "ms (HTTP " << httpResponseCode_ << ")" << std::endl;
  }

  void FetchByteRangeAsyncWorker::OnOK()
  {
    // std::cerr << "[FetchByteRangeAsyncWorker] OnOK() executing on main thread" << std::endl;

    Napi::Env env = Env();

    // Create result object
    Napi::Object result = Napi::Object::New(env);
    result.Set("url", Napi::String::New(env, url_));
    result.Set("startByte", Napi::Number::New(env, static_cast<double>(startByte_)));
    result.Set("endByte", Napi::Number::New(env, static_cast<double>(endByte_)));
    result.Set("httpStatus", Napi::Number::New(env, httpResponseCode_));
    result.Set("size", Napi::Number::New(env, fetchedData_.size()));

    // Create buffer with the fetched data
    if (!fetchedData_.empty())
    {
      Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, fetchedData_.size());
      memcpy(buffer.Data(), fetchedData_.data(), fetchedData_.size());
      result.Set("data", Napi::Uint8Array::New(env, fetchedData_.size(), buffer, 0));
    }
    else
    {
      result.Set("data", env.Null());
    }

    // Call the JavaScript callback with (error, result)
    Callback().Call({env.Null(), result});
  }

  void FetchByteRangeAsyncWorker::OnError(const Napi::Error &error)
  {
    // std::cerr << "[FetchByteRangeAsyncWorker] OnError: " << error.Message() << std::endl;

    // Call the JavaScript callback with (error, null)
    Callback().Call({error.Value(), Env().Null()});
  }

  // Static CURL callback - adapted from FetchHttpByteRange.cpp
  size_t FetchByteRangeAsyncWorker::CurlWriteCallback(void *contents, size_t size, size_t nmemb, void *userp)
  {
    size_t realsize = size * nmemb;
    auto worker = static_cast<FetchByteRangeAsyncWorker *>(userp);

    // Append data to the buffer
    const uint8_t *data = static_cast<const uint8_t *>(contents);
    worker->fetchedData_.insert(worker->fetchedData_.end(), data, data + realsize);

    return realsize;
  }

} // namespace playback