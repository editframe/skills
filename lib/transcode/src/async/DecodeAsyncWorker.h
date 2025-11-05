#pragma once

#include <napi.h>
#include "../pipeline/Decoder.h"
#include <memory>
#include <vector>

extern "C"
{
#include <libavformat/avformat.h>
}

namespace playback
{

  /**
   * AsyncWorker for decoding packets to frames without blocking main thread
   *
   * Handles CPU-intensive video/audio decoding operations in background thread
   */
  class DecodeAsyncWorker : public Napi::AsyncWorker
  {
  public:
    /**
     * Constructor
     * @param callback JavaScript callback function to call with results
     * @param decoder Decoder instance to use for decoding
     * @param inputPacket AVPacket to decode (will be copied)
     */
    DecodeAsyncWorker(Napi::Function &callback, Decoder *decoder, AVPacket *inputPacket);

    /**
     * Destructor - cleanup any allocated resources
     */
    virtual ~DecodeAsyncWorker();

    /**
     * Execute method - runs in background thread
     * NO Node-API access allowed here
     */
    void Execute() override;

    /**
     * OnOK method - runs on main thread when Execute() succeeds
     * Convert C++ results back to JavaScript objects
     */
    void OnOK() override;

    /**
     * OnError method - runs on main thread when Execute() fails
     */
    void OnError(const Napi::Error &error) override;

  private:
    // Input parameters (set in constructor, used in Execute)
    Decoder *decoder_;
    AVPacket *inputPacket_;

    // Output results (set in Execute, used in OnOK)
    std::vector<FrameInfo> outputFrames_;
    bool success_;

    // Helper method to convert FrameInfo to JavaScript object
    Napi::Object convertFrameToJS(Napi::Env env, const FrameInfo &frameInfo);
  };

} // namespace playback