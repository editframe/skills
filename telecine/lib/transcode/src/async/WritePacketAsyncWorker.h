#pragma once

#include <napi.h>
#include "../pipeline/Muxer.h"
#include <memory>

extern "C"
{
#include <libavformat/avformat.h>
}

namespace playback
{

  /**
   * AsyncWorker for writing packets to muxer without blocking main thread
   *
   * Handles file I/O operations in background thread
   */
  class WritePacketAsyncWorker : public Napi::AsyncWorker
  {
  public:
    /**
     * Constructor
     * @param callback JavaScript callback function to call with results
     * @param muxer Muxer instance to write packet to
     * @param packetInfo InputPacketInfo to write (will be copied)
     */
    WritePacketAsyncWorker(Napi::Function &callback, Muxer *muxer, const InputPacketInfo &packetInfo);

    /**
     * Destructor - cleanup any allocated resources
     */
    virtual ~WritePacketAsyncWorker();

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
    Muxer *muxer_;
    InputPacketInfo packetInfo_;
    std::vector<uint8_t> packetData_; // Copy of packet data for background thread

    // Output results (set in Execute, used in OnOK)
    bool success_;
  };

} // namespace playback