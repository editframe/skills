#include "GetKeyframes.h"
#include <string>
#include <vector>
#include <iostream>
#include <memory>

// Define MAX macro for use in the code
#ifndef MAX
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#endif

extern "C"
{
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/avutil.h>
#include <libavutil/dict.h>
#include <libswscale/swscale.h>
}

namespace playback
{
  // Custom deleter for AVFormatContext to ensure proper cleanup
  struct AVFormatContextDeleter
  {
    void operator()(AVFormatContext *ctx)
    {
      if (ctx)
        avformat_close_input(&ctx);
    }
  };

  // Custom deleter for AVDictionary
  struct AVDictionaryDeleter
  {
    void operator()(AVDictionary *dict)
    {
      if (dict)
        av_dict_free(&dict);
    }
  };

  // Custom deleter for AVPacket
  struct AVPacketDeleter
  {
    void operator()(AVPacket *pkt)
    {
      if (pkt)
        av_packet_free(&pkt);
    }
  };

  // Convenience typedefs for smart pointers
  using FormatContextPtr = std::unique_ptr<AVFormatContext, AVFormatContextDeleter>;
  using DictionaryPtr = std::unique_ptr<AVDictionary, AVDictionaryDeleter>;
  using PacketPtr = std::unique_ptr<AVPacket, AVPacketDeleter>;

  // Main entry point from JavaScript - modified to return a Promise
  Napi::Value GetKeyframes(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();
    std::cerr << "[GetKeyframes] Starting keyframe extraction" << std::endl;

    // Check for arguments
    if (info.Length() < 1 || !info[0].IsString())
    {
      std::cerr << "[GetKeyframes] Error: URL argument missing or invalid" << std::endl;
      Napi::TypeError::New(env, "URL expected as first argument").ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string url = info[0].As<Napi::String>().Utf8Value();
    std::cerr << "[GetKeyframes] Processing URL: " << url << std::endl;

    // Create a promise that will be resolved or rejected by the worker
    auto deferred = Napi::Promise::Deferred::New(env);

    // Create async worker with promise deferred
    AsyncKeyframesWorker *worker = new AsyncKeyframesWorker(url, deferred);
    worker->Queue();

    return deferred.Promise();
  }

  AsyncKeyframesWorker::AsyncKeyframesWorker(const std::string &url, Napi::Promise::Deferred deferred)
      : Napi::AsyncWorker(deferred.Env()), url_(url), deferred_(deferred) {}

  AsyncKeyframesWorker::~AsyncKeyframesWorker() {}

  void AsyncKeyframesWorker::Execute()
  {
    std::cerr << "[AsyncKeyframesWorker] Processing URL: " << url_ << std::endl;

    // Setup for HTTP range requests if needed
    DictionaryPtr options(nullptr);
    AVDictionary *optionsRaw = nullptr;
    av_dict_set(&optionsRaw, "seekable", "1", 0);
    options.reset(optionsRaw);

    // Open input file
    AVFormatContext *formatContextRaw = nullptr;
    int openResult = avformat_open_input(&formatContextRaw, url_.c_str(), nullptr, &optionsRaw);
    if (openResult != 0)
    {
      char errBuf[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(openResult, errBuf, AV_ERROR_MAX_STRING_SIZE);
      std::string errorMsg = "Failed to open input file: " + std::string(errBuf);
      std::cerr << "[AsyncKeyframesWorker] " << errorMsg << std::endl;
      SetError(errorMsg);
      return;
    }

    // Use smart pointer for RAII
    FormatContextPtr formatContext(formatContextRaw);
    std::cerr << "[AsyncKeyframesWorker] Successfully opened input file" << std::endl;

    // Find stream info
    int streamInfoResult = avformat_find_stream_info(formatContext.get(), nullptr);
    if (streamInfoResult < 0)
    {
      char errBuf[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(streamInfoResult, errBuf, AV_ERROR_MAX_STRING_SIZE);
      std::string errorMsg = "Failed to find stream info: " + std::string(errBuf);
      std::cerr << "[AsyncKeyframesWorker] " << errorMsg << std::endl;
      SetError(errorMsg);
      return;
    }
    std::cerr << "[AsyncKeyframesWorker] Found stream info" << std::endl;

    int videoStreamIndex = av_find_best_stream(formatContext.get(), AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    if (videoStreamIndex < 0)
    {
      std::string errorMsg = "No video stream found";
      std::cerr << "[AsyncKeyframesWorker] " << errorMsg << std::endl;
      SetError(errorMsg);
      return;
    }
    std::cerr << "[AsyncKeyframesWorker] Found video stream at index: " << videoStreamIndex << std::endl;

    // Get the video stream and its timebase
    AVStream *videoStream = formatContext->streams[videoStreamIndex];
    AVRational timeBase = videoStream->time_base;
    std::cerr << "[AsyncKeyframesWorker] Video timebase: " << timeBase.num << "/" << timeBase.den << std::endl;

    // Store basic video information
    format_ = formatContext->iformat->name;
    duration_ = formatContext->duration / (double)AV_TIME_BASE;

    // Add codec information
    AVCodecParameters *codecParams = videoStream->codecpar;
    width_ = codecParams->width;
    height_ = codecParams->height;
    codec_ = avcodec_get_name(codecParams->codec_id);
    std::cerr << "[AsyncKeyframesWorker] Video dimensions: " << width_ << "x" << height_
              << ", codec: " << codec_ << std::endl;

    // Get framerate
    if (videoStream->avg_frame_rate.num && videoStream->avg_frame_rate.den)
    {
      frameRate_ = av_q2d(videoStream->avg_frame_rate);
    }
    std::cerr << "[AsyncKeyframesWorker] Frame rate: " << frameRate_ << " fps" << std::endl;

    // Process keyframes using ISOBMFF containers
    if (formatContext->iformat && strcmp(formatContext->iformat->name, "mov,mp4,m4a,3gp,3g2,mj2") == 0)
    {
      std::cerr << "[AsyncKeyframesWorker] ISOBMFF container detected, attempting to use index" << std::endl;

      // Force FFmpeg to build an index from the sample table, but don't scan the whole file
      formatContext->max_analyze_duration = 0;

      // Create a packet
      PacketPtr packet(av_packet_alloc());

      // Get stream index entries count
      int nb_index_entries = avformat_index_get_entries_count(videoStream);

      if (nb_index_entries > 0)
      {
        std::cerr << "[AsyncKeyframesWorker] Found " << nb_index_entries << " index entries" << std::endl;

        // Loop through all index entries
        for (int i = 0; i < nb_index_entries; i++)
        {
          // In FFmpeg v6, avformat_index_get_entry returns a pointer, not an int
          const AVIndexEntry *entry = avformat_index_get_entry(videoStream, i);
          if (entry)
          {
            // Check if this is a keyframe
            if (entry->flags & AVINDEX_KEYFRAME)
            {
              double pts_seconds = entry->timestamp * av_q2d(timeBase);

              // Add keyframe to our vector
              Keyframe keyframe;
              keyframe.index = keyframes_.size();
              keyframe.pts = entry->timestamp;
              keyframe.pts_seconds = pts_seconds;
              keyframe.pos = entry->pos;
              keyframe.size = entry->size;

              keyframes_.push_back(keyframe);
            }
          }
        }

        if (!keyframes_.empty())
        {
          // We successfully got keyframes from the index
          std::cerr << "[AsyncKeyframesWorker] Extracted " << keyframes_.size() << " keyframes from index" << std::endl;
          method_ = "sample_table_index";
          keyframeCount_ = keyframes_.size();
          return;
        }

        std::cerr << "[AsyncKeyframesWorker] No keyframes found in index" << std::endl;
        SetError("No keyframes found in the index");
        return;
      }
      else
      {
        std::cerr << "[AsyncKeyframesWorker] No index entries found" << std::endl;
        SetError("No index entries found in the file");
        return;
      }
    }
    else
    {
      // File format not supported
      std::string formatName = formatContext->iformat ? formatContext->iformat->name : "unknown";
      std::string errorMsg = "Unsupported file format: " + formatName + ". Only ISOBMFF containers (MP4, MOV, etc.) are supported.";
      std::cerr << "[AsyncKeyframesWorker] " << errorMsg << std::endl;
      SetError(errorMsg);
      return;
    }

    // The code should never reach here, but just in case:
    SetError("Unknown error during keyframe extraction");
  }

  void AsyncKeyframesWorker::OnOK()
  {
    Napi::Env env = Env();

    // Create result object with video metadata
    Napi::Object result = Napi::Object::New(env);

    // Add basic video information
    result.Set("url", Napi::String::New(env, url_));
    result.Set("format", Napi::String::New(env, format_));
    result.Set("duration", Napi::Number::New(env, duration_));

    // Add codec information
    Napi::Object codecInfo = Napi::Object::New(env);
    codecInfo.Set("width", Napi::Number::New(env, width_));
    codecInfo.Set("height", Napi::Number::New(env, height_));
    codecInfo.Set("codec", Napi::String::New(env, codec_));
    codecInfo.Set("frameRate", Napi::Number::New(env, frameRate_));
    result.Set("codec", codecInfo);

    // Array to hold keyframe information
    Napi::Array keyframes = Napi::Array::New(env, keyframes_.size());

    // Fill keyframes array
    for (size_t i = 0; i < keyframes_.size(); i++)
    {
      const Keyframe &kf = keyframes_[i];
      Napi::Object keyframe = Napi::Object::New(env);

      keyframe.Set("index", Napi::Number::New(env, kf.index));
      keyframe.Set("pts", Napi::Number::New(env, kf.pts));
      keyframe.Set("pts_seconds", Napi::Number::New(env, kf.pts_seconds));
      keyframe.Set("pos", Napi::Number::New(env, kf.pos));
      keyframe.Set("size", Napi::Number::New(env, kf.size));

      keyframes[i] = keyframe;
    }

    // Add keyframes to result
    result.Set("keyframes", keyframes);
    result.Set("keyframeCount", Napi::Number::New(env, keyframeCount_));
    if (!method_.empty())
    {
      result.Set("method", Napi::String::New(env, method_));
    }

    // Resolve the promise with the result
    deferred_.Resolve(result);
  }

  void AsyncKeyframesWorker::OnError(const Napi::Error &error)
  {
    // Reject the promise with the error
    deferred_.Reject(error.Value());
  }
}
