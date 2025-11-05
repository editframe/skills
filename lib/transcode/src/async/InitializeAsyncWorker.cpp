#include "InitializeAsyncWorker.h"
#include "../logging.h"
#include <iostream>

namespace playback
{

  InitializeAsyncWorker::InitializeAsyncWorker(Napi::Function &callback, VideoSource *videoSource)
      : Napi::AsyncWorker(callback), videoSource_(videoSource), initSuccess_(false)
  {
    // std::cerr << "[InitializeAsyncWorker] Worker created" << std::endl;
  }

  InitializeAsyncWorker::~InitializeAsyncWorker()
  {
    // std::cerr << "[InitializeAsyncWorker] Worker destroyed" << std::endl;
  }

  void InitializeAsyncWorker::Execute()
  {
    // std::cerr << "[InitializeAsyncWorker] Execute() starting in background thread" << std::endl;

    if (!videoSource_)
    {
      errorMessage_ = "VideoSource is null";
      return;
    }

    try
    {
      // This is the potentially blocking call that we're moving off the main thread
      initSuccess_ = videoSource_->initialize();

      if (initSuccess_)
      {
        // std::cerr << "[InitializeAsyncWorker] VideoSource initialized successfully" << std::endl;
      }
      else
      {
        errorMessage_ = "VideoSource initialization failed";
        // std::cerr << "[InitializeAsyncWorker] " << errorMessage_ << std::endl;
      }
    }
    catch (const std::exception &e)
    {
      errorMessage_ = std::string("Exception during initialization: ") + e.what();
      initSuccess_ = false;
      // std::cerr << "[InitializeAsyncWorker] " << errorMessage_ << std::endl;
    }
  }

  void InitializeAsyncWorker::OnOK()
  {
    // std::cerr << "[InitializeAsyncWorker] OnOK() executing on main thread" << std::endl;

    Napi::Env env = Env();
    Napi::HandleScope scope(env);

    if (!initSuccess_)
    {
      // Call the callback with error
      Napi::Error error = Napi::Error::New(env, errorMessage_.empty() ? "Initialization failed" : errorMessage_);
      Callback().Call({error.Value(), env.Null()});
    }
    else
    {
      // Call the callback with success
      Callback().Call({env.Null(), Napi::Boolean::New(env, true)});
    }
  }

  void InitializeAsyncWorker::OnError(const Napi::Error &error)
  {
    std::cerr << "[InitializeAsyncWorker] OnError() executing on main thread: " << error.Message() << std::endl;

    Napi::Env env = Env();
    Napi::HandleScope scope(env);

    // Call the callback with the error
    Callback().Call({error.Value(), env.Null()});
  }

} // namespace playback