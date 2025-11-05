#include "WritePacketAsyncWorker.h"
#include "../logging.h"

namespace playback
{

  WritePacketAsyncWorker::WritePacketAsyncWorker(Napi::Function &callback, Muxer *muxer, const InputPacketInfo &packetInfo)
      : Napi::AsyncWorker(callback), muxer_(muxer), packetInfo_(packetInfo), success_(false)
  {
    // std::cerr << "[WritePacketAsyncWorker] Worker created" << std::endl;

    // Deep copy packet data for background thread use
    if (packetInfo.data && packetInfo.size > 0)
    {
      packetData_.resize(packetInfo.size);
      memcpy(packetData_.data(), packetInfo.data, packetInfo.size);

      // Update our copy to point to the copied data
      packetInfo_.data = packetData_.data();
    }
  }

  WritePacketAsyncWorker::~WritePacketAsyncWorker()
  {
    // std::cerr << "[WritePacketAsyncWorker] Worker destroyed" << std::endl;
  }

  void WritePacketAsyncWorker::Execute()
  {
    // std::cerr << "[WritePacketAsyncWorker] Execute() starting in background thread" << std::endl;

    if (!muxer_)
    {
      SetError("Muxer is null");
      return;
    }

    if (!packetInfo_.data || packetInfo_.size == 0)
    {
      SetError("Input packet data is null or empty");
      return;
    }

    // This is the file I/O operation that we want off the main thread
    success_ = muxer_->writePacket(packetInfo_);

    if (!success_)
    {
      // std::cerr << "[WritePacketAsyncWorker] Write packet operation failed" << std::endl;
      SetError("Failed to write packet to muxer");
      return;
    }

    // std::cerr << "[WritePacketAsyncWorker] Successfully wrote packet of size " << packetInfo_.size << std::endl;
  }

  void WritePacketAsyncWorker::OnOK()
  {
    // playback::debug("[WritePacketAsyncWorker] OnOK() executing on main thread");

    Napi::Env env = Env();

    try
    {
      // Pass success result to callback: callback(error, result)
      // error = null (success), result = boolean success
      Callback().Call({env.Null(), Napi::Boolean::New(env, success_)});
    }
    catch (const std::exception &e)
    {
      playback::error("[WritePacketAsyncWorker] OnOK() exception: " + std::string(e.what()));
      Napi::Error error = Napi::Error::New(env, std::string("Failed to call callback: ") + e.what());
      Callback().Call({error.Value(), env.Null()});
    }
  }

  void WritePacketAsyncWorker::OnError(const Napi::Error &error)
  {
    playback::error("[WritePacketAsyncWorker] Error: " + error.Message());
    Napi::AsyncWorker::OnError(error);
  }

} // namespace playback