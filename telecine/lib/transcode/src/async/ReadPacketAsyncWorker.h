#pragma once

#include <napi.h>
#include "../pipeline/VideoSource.h"

extern "C"
{
#include <libavformat/avformat.h>
}

namespace playback
{

  /**
   * AsyncWorker for reading packets from VideoSource without blocking main thread
   *
   * This is critical for preventing deadlocks when:
   * 1. HTTP server serves video files via range requests
   * 2. VideoSource tries to fetch the same files via HTTP
   * 3. Main thread would be blocked, preventing HTTP responses
   */
  class ReadPacketAsyncWorker : public Napi::AsyncWorker
  {
  public:
    /**
     * Constructor
     * @param callback JavaScript callback function to call with results
     * @param videoSource VideoSource instance to read packet from
     */
    ReadPacketAsyncWorker(Napi::Function &callback, VideoSource *videoSource);

    /**
     * Destructor - cleanup any allocated resources
     */
    virtual ~ReadPacketAsyncWorker();

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
     * Default implementation should be sufficient for most cases
     */
    void OnError(const Napi::Error &error) override;

  private:
    // Input parameters (set in constructor, used in Execute)
    VideoSource *videoSource_;

    // Output results (set in Execute, used in OnOK)
    AVPacket *resultPacket_;
    bool success_;
    bool isEOF_;

    // Helper method to convert AVPacket to JavaScript object
    Napi::Object convertPacketToJS(Napi::Env env, AVPacket *packet);
  };

} // namespace playback