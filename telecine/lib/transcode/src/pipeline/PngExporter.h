#pragma once

#include <napi.h>
#include <vector>
#include <memory>
#include "../logging.h"

extern "C"
{
  struct AVFrame;
  struct SwsContext;
}

namespace playback
{
  struct PngExporterLogTag
  {
    static constexpr const char *prefix = "PngExporter";
  };

  /**
   * PNG Exporter - Converts video frames to PNG format
   * Uses FFmpeg's PNG encoder to create PNG data from video frames
   */
  class PngExporter : public LoggingMixin<PngExporterLogTag>
  {
  public:
    PngExporter();
    ~PngExporter();

    /**
     * Export a frame as PNG data
     * @param framePtr Frame pointer
     * @param pngData Output vector to store PNG data
     * @return true if successful, false otherwise
     */
    bool exportFrameToPng(uintptr_t framePtr, std::vector<uint8_t> &pngData);

    /**
     * Export a frame as PNG data with optional scaling
     * @param framePtr Frame pointer
     * @param pngData Output vector to store PNG data
     * @param targetWidth Target width (0 = keep original)
     * @param targetHeight Target height (0 = keep original)
     * @return true if successful, false otherwise
     */
    bool exportFrameToPng(uintptr_t framePtr, std::vector<uint8_t> &pngData,
                          int targetWidth, int targetHeight);

    /**
     * Dispose resources
     */
    void dispose();

  private:
    bool disposed_ = false;

    // Helper methods
    bool convertFrameToRGB(const AVFrame *inputFrame, AVFrame *rgbFrame,
                           int targetWidth = 0, int targetHeight = 0);
    bool encodeFrameToPng(const AVFrame *rgbFrame, std::vector<uint8_t> &pngData);
    void cleanup();
  };

} // namespace playback