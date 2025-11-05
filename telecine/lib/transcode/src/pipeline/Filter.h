#pragma once

#include <napi.h>
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <unordered_map>
#include <deque>
#include "../logging.h"
#include "../FFmpegUtils.h"
#include "Decoder.h" // For FrameInfo

extern "C"
{
  struct AVFilterGraph;
  struct AVFilterContext;
  struct AVFrame;
  enum AVPixelFormat;
  enum AVSampleFormat;
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersrc.h>
#include <libavfilter/buffersink.h>
#include <libavutil/avutil.h>
#include <libavutil/pixfmt.h>
#include <libavutil/samplefmt.h>
}

namespace playback
{
  struct FilterLogTag
  {
    static constexpr const char *prefix = "Filter";
  };

  // IMPLEMENTATION GUIDELINES: AudioFrameBuffer ensures AAC encoder gets exactly 1024 samples per frame
  // This prevents "nb_samples > frame_size" errors when resampling from 44.1kHz to other sample rates
  class AudioFrameBuffer
  {
  public:
    AudioFrameBuffer(int targetSamples, int channels, AVSampleFormat format, int sampleRate);
    ~AudioFrameBuffer();

    // Add samples from an input frame, may produce 0 or more output frames
    bool addFrame(const AVFrame* inputFrame, std::vector<AVFrame*>& outputFrames);
    
    // Flush remaining samples as a final frame (may be smaller than target)
    bool flush(std::vector<AVFrame*>& outputFrames);
    
    // Get the target frame size
    int getTargetSamples() const { return targetSamples_; }
    
  private:
    int targetSamples_;      // Target samples per output frame (1024 for AAC)
    int channels_;           // Number of audio channels
    AVSampleFormat format_;  // Sample format
    int sampleRate_;         // Sample rate
    
    // Buffer for accumulating samples
    std::vector<uint8_t> sampleBuffer_;
    int bufferedSamples_;    // Number of samples currently buffered
    int bytesPerSample_;     // Bytes per sample (calculated from format)
    int64_t nextOutputPts_;  // PTS for next output frame
    bool ptsInitialized_;    // Whether we've seen the first input PTS
    
    // Helper methods
    int getBytesPerSample(AVSampleFormat format) const;
    AVFrame* createOutputFrame(int numSamples, int64_t pts) const;
    void copyAndAdvanceBuffer(AVFrame* outputFrame, int samplesToCopy);
  };

  struct FilterOptions
  {
    // Input format specification
    AVMediaType mediaType = AVMEDIA_TYPE_UNKNOWN;

    // Video input properties
    int inputWidth = 0;
    int inputHeight = 0;
    AVPixelFormat inputPixelFormat = AV_PIX_FMT_NONE;
    AVRational inputFrameRate = {0, 1};
    AVRational inputTimeBase = {1, 25}; // Default to 25 FPS for video

    // Audio input properties
    int inputChannels = 0;
    int inputSampleRate = 0;
    AVSampleFormat inputSampleFormat = AV_SAMPLE_FMT_NONE;

    // Output format specification
    int outputWidth = 0;
    int outputHeight = 0;
    AVPixelFormat outputPixelFormat = AV_PIX_FMT_NONE;
    int outputChannels = 0;
    int outputSampleRate = 0;
    AVSampleFormat outputSampleFormat = AV_SAMPLE_FMT_NONE;

    // Filter graph description (e.g., "scale=1280:720" for video, "aresample=44100" for audio)
    std::string filterDescription;

    // IMPLEMENTATION GUIDELINES: Audio frame buffering for AAC compatibility
    // When enabled, ensures output frames have exactly the required number of samples
    bool enableAudioFrameBuffering = false;
    int targetAudioFrameSize = 1024; // AAC requires 1024 samples per frame
  };

  // Reuse FrameInfo from Decoder for consistency
  using FilteredFrameInfo = FrameInfo;

  class Filter : public LoggingMixin<FilterLogTag>
  {
  public:
    explicit Filter(const FilterOptions &options);
    ~Filter();

    // Disable copy/move for now - these are expensive resources
    Filter(const Filter &) = delete;
    Filter &operator=(const Filter &) = delete;
    Filter(Filter &&) = delete;
    Filter &operator=(Filter &&) = delete;

    // Core functionality
    bool initialize();

    // Legacy method (kept for compatibility)
    bool filter(const AVFrame *inputFrame, std::vector<FilteredFrameInfo> &outputFrames);

    // New method using frame pointers
    bool filterFrame(uintptr_t inputFramePtr, std::vector<FilteredFrameInfo> &outputFrames);

    bool flush(std::vector<FilteredFrameInfo> &outputFrames); // Get remaining frames from filter

    // Frame access by pointer (for other components)
    AVFrame *getFrame(uintptr_t framePtr);

    // Getters
    AVMediaType mediaType() const { return options_.mediaType; }
    std::string filterDescription() const { return options_.filterDescription; }
    bool isInitialized() const { return filterGraph_ != nullptr && !disposed_; }

    // Resource management - explicit cleanup
    void dispose();
    bool isDisposed() const { return disposed_; }

  private:
    FilterOptions options_;
    AVFilterGraph *filterGraph_ = nullptr;
    AVFilterContext *bufferSrcContext_ = nullptr;  // Input buffer
    AVFilterContext *bufferSinkContext_ = nullptr; // Output buffer
    AVFrame *tempFrame_ = nullptr;                 // Temporary frame for filtering

    // Temporary filter I/O connections
    AVFilterInOut *inputs_ = nullptr;
    AVFilterInOut *outputs_ = nullptr;

    // State
    bool disposed_ = false;

    // Frame storage for this filter instance
    using FrameDeleter = void (*)(AVFrame *);
    std::unordered_map<uintptr_t, std::unique_ptr<AVFrame, FrameDeleter>> frames_;

    // IMPLEMENTATION GUIDELINES: Audio frame buffering to ensure consistent frame sizes for AAC
    std::unique_ptr<AudioFrameBuffer> audioFrameBuffer_;

    // Helper methods
    bool createFilterGraph();
    bool createVideoFilterGraph();
    bool createAudioFilterGraph();
    bool setupFilterComponents(const AVFilter *bufferSrc, const AVFilter *bufferSink);
    bool createBufferSource(const AVFilter *bufferSrc, const char *args);
    bool createBufferSink(const AVFilter *bufferSink);
    bool configureAudioOutputParameters();
    bool parseAndConfigureGraph();
    void cleanupFilterInOuts();
    bool sendFrameAndReceiveResults(const AVFrame *inputFrame, std::vector<FilteredFrameInfo> &outputFrames);
    bool receiveFilteredFrames(std::vector<FilteredFrameInfo> &outputFrames);
    void extractFilteredFrameInfo(const AVFrame *frame, FilteredFrameInfo &frameInfo);
    uintptr_t createAndStoreFrameCopy(const AVFrame *frame);
    void cleanup();
    
    // IMPLEMENTATION GUIDELINES: Audio buffering helper methods
    bool processAudioFrameWithBuffering(const AVFrame *frame, std::vector<FilteredFrameInfo> &outputFrames);
    bool flushAudioFrameBuffer(std::vector<FilteredFrameInfo> &outputFrames);
  };

} // namespace playback