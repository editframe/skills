#include "ReadPacketAsyncWorker.h"
#include "../logging.h"

namespace playback
{

  ReadPacketAsyncWorker::ReadPacketAsyncWorker(Napi::Function &callback, VideoSource *videoSource)
      : Napi::AsyncWorker(callback), videoSource_(videoSource), resultPacket_(nullptr), success_(false), isEOF_(false)
  {
    // playback::debug("[ReadPacketAsyncWorker] Worker created");
  }

  ReadPacketAsyncWorker::~ReadPacketAsyncWorker()
  {
    // Clean up any allocated packet if not consumed
    if (resultPacket_)
    {
      av_packet_free(&resultPacket_);
      resultPacket_ = nullptr;
    }
    // playback::debug("[ReadPacketAsyncWorker] Worker destroyed");
  }

  void ReadPacketAsyncWorker::Execute()
  {
    // CRITICAL: This method runs in a background thread
    // NO Node-API calls allowed here - only pure C++ code

    // std::cerr << "[ReadPacketAsyncWorker] Execute() starting in background thread" << std::endl;

    if (!videoSource_)
    {
      SetError("VideoSource is null");
      return;
    }

    // Allocate packet for reading
    resultPacket_ = av_packet_alloc();
    if (!resultPacket_)
    {
      SetError("Failed to allocate AVPacket");
      return;
    }

    // This is the critical operation that was blocking the main thread
    // Now it runs in background thread, allowing HTTP server to respond
    success_ = videoSource_->readPacket(resultPacket_);

    if (!success_)
    {
      // Could be EOF or actual error - VideoSource should have logged details
      // std::cerr << "[ReadPacketAsyncWorker] readPacket returned false (EOF or error)" << std::endl;

      // Free the packet since we didn't get data
      av_packet_free(&resultPacket_);
      resultPacket_ = nullptr;
      isEOF_ = true; // Assume EOF rather than error for now

      // Don't call SetError for EOF - it's a normal condition
      success_ = true; // Consider EOF as "successful" operation
    }
    else
    {
      // std::cerr << "[ReadPacketAsyncWorker] Successfully read packet of size " << resultPacket_->size << std::endl;
      isEOF_ = false;
    }
  }

  void ReadPacketAsyncWorker::OnOK()
  {
    // CRITICAL: This method runs on the main thread
    // Full Node-API access is available here

    // playback::debug("[ReadPacketAsyncWorker] OnOK() executing on main thread");

    Napi::Env env = Env();

    try
    {
      if (isEOF_ || !resultPacket_)
      {
        // EOF condition - pass null packet to indicate end of stream
        // playback::debug("[ReadPacketAsyncWorker] Returning EOF (null packet)");
        Callback().Call({env.Null(), env.Null()});
      }
      else
      {
        // Successfully read packet - convert to JavaScript object
        // playback::debug("[ReadPacketAsyncWorker] Converting packet to JavaScript object");
        Napi::Object jsPacket = convertPacketToJS(env, resultPacket_);

        // Pass to callback: callback(error, result)
        // error = null (success), result = packet object
        Callback().Call({env.Null(), jsPacket});
      }
    }
    catch (const std::exception &e)
    {
      // playback::error("[ReadPacketAsyncWorker] OnOK() exception: " + std::string(e.what()));
      // If we fail to convert, call callback with error
      Napi::Error error = Napi::Error::New(env, std::string("Failed to convert packet: ") + e.what());
      Callback().Call({error.Value(), env.Null()});
    }

    // Clean up packet now that we've used it
    if (resultPacket_)
    {
      av_packet_free(&resultPacket_);
      resultPacket_ = nullptr;
    }
  }

  void ReadPacketAsyncWorker::OnError(const Napi::Error &error)
  {
    // This runs on main thread when Execute() calls SetError()
    // playback::error("[ReadPacketAsyncWorker] Error: " + error.Message());

    // Clean up packet on error
    if (resultPacket_)
    {
      av_packet_free(&resultPacket_);
      resultPacket_ = nullptr;
    }

    // Call the default error handling (calls callback with error)
    Napi::AsyncWorker::OnError(error);
  }

  Napi::Object ReadPacketAsyncWorker::convertPacketToJS(Napi::Env env, AVPacket *packet)
  {
    if (!packet)
    {
      throw std::runtime_error("Packet is null");
    }

    Napi::Object packetObj = Napi::Object::New(env);

    // Basic packet properties
    packetObj.Set("streamIndex", Napi::Number::New(env, packet->stream_index));
    packetObj.Set("pts", Napi::Number::New(env, static_cast<double>(packet->pts)));
    packetObj.Set("dts", Napi::Number::New(env, static_cast<double>(packet->dts)));
    packetObj.Set("duration", Napi::Number::New(env, static_cast<double>(packet->duration)));
    packetObj.Set("size", Napi::Number::New(env, packet->size));
    packetObj.Set("isKeyFrame", Napi::Boolean::New(env, (packet->flags & AV_PKT_FLAG_KEY) != 0));

    // Copy packet data to JavaScript ArrayBuffer
    if (packet->data && packet->size > 0)
    {
      Napi::ArrayBuffer buffer = Napi::ArrayBuffer::New(env, packet->size);
      memcpy(buffer.Data(), packet->data, packet->size);
      packetObj.Set("data", Napi::Uint8Array::New(env, packet->size, buffer, 0));
    }
    else
    {
      packetObj.Set("data", env.Null());
    }

    return packetObj;
  }

} // namespace playback