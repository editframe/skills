#pragma once

#include <napi.h>
#include "../pipeline/Encoder.h"

#include <memory>
#include <vector>

extern "C"
{
#include <libavformat/avformat.h>
}

namespace playback
{

  /**
   * AsyncWorker for encoding frames to packets without blocking main thread
   *
   * Handles CPU-intensive video/audio encoding operations in background thread
   */
  class EncodeAsyncWorker : public Napi::AsyncWorker
  {
  public:
    /**
     * Constructor
     * @param callback JavaScript callback function to call with results
     * @param encoder Encoder instance to use for encoding
     * @param inputFrame AVFrame to encode (will be copied)
     */
    EncodeAsyncWorker(Napi::Function &callback, Encoder *encoder, const AVFrame *inputFrame);

    /**
     * Destructor - cleanup any allocated resources
     */
    virtual ~EncodeAsyncWorker();

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
    Encoder *encoder_;
    AVFrame *inputFrame_;

    // Output results (set in Execute, used in OnOK)
    std::vector<EncodedPacketInfo> outputPackets_;
    bool success_;

    // Helper method to convert EncodedPacketInfo to JavaScript object
    Napi::Object convertPacketToJS(Napi::Env env, const EncodedPacketInfo &packetInfo);
  };

} // namespace playback