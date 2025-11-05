#include "ValidateRemoteSource.h"
#include <memory>
#include <iostream>
#include <vector>
#include <sstream>
#include <iomanip>

extern "C"
{
#include <libavformat/avformat.h>
#include <libavutil/avutil.h>
#include <libavutil/pixdesc.h>
#include <libavcodec/avcodec.h>
#include <libavutil/rational.h>
}

namespace playback
{
  // Custom deleters for FFmpeg resources
  struct AVFormatContextDeleter
  {
    void operator()(AVFormatContext *ctx)
    {
      if (ctx)
        avformat_close_input(&ctx);
    }
  };

  // Convenience typedefs for smart pointers
  using FormatContextPtr = std::unique_ptr<AVFormatContext, AVFormatContextDeleter>;

  // Stream information structure
  struct StreamInfo
  {
    int index;
    std::string codec_name;
    std::string codec_type;
    int codec_id;
    int profile;
    int level;
    int width;
    int height;
    int channels;
    int sample_rate;
    int64_t bit_rate;
    AVRational time_base;
    AVRational frame_rate;
    double duration;
    std::string pixel_format;
    std::string mime_codec_string; // WebCodecs/MSE compatible codec string
  };

  // Function to generate WebCodecs/MSE compatible codec strings
  std::string GenerateCodecString(AVCodecParameters *codec_params)
  {
    if (!codec_params)
      return "unknown";

    std::stringstream codecString;

    switch (codec_params->codec_id)
    {
    // Video codecs
    case AV_CODEC_ID_H264:
    {
      // Format: avc1.PPCCLL (PP=profile, CC=constraints, LL=level)
      uint8_t profile = codec_params->profile;
      uint8_t level = codec_params->level;

      codecString << "avc1.";

      // Handle the profile (different H.264 profiles have different hex values)
      if (profile == FF_PROFILE_H264_BASELINE)
      {
        codecString << "42";
      }
      else if (profile == FF_PROFILE_H264_MAIN)
      {
        codecString << "4D";
      }
      else if (profile == FF_PROFILE_H264_HIGH)
      {
        codecString << "64";
      }
      else if (profile == FF_PROFILE_H264_HIGH_10)
      {
        codecString << "6E";
      }
      else
      {
        // Default case - convert profile value to hex
        codecString << std::hex << std::setfill('0') << std::setw(2) << (int)profile;
      }

      // Constraints bits (using 00 as default)
      codecString << "00";

      // Level - convert to appropriate format (multiply by 10)
      if (level == 0)
      {
        codecString << "10"; // Default to level 1.0
      }
      else
      {
        codecString << std::hex << std::setfill('0') << std::setw(2) << (int)level;
      }
      break;
    }

    case AV_CODEC_ID_HEVC:
      codecString << "hvc1.1.6.L93.B0"; // Example HEVC string
      break;

    case AV_CODEC_ID_VP8:
      codecString << "vp8";
      break;

    case AV_CODEC_ID_VP9:
      codecString << "vp09.00.10.08"; // VP9 Profile 0, Level 1.0, Bit depth 8
      break;

    case AV_CODEC_ID_AV1:
      codecString << "av01.0.04M.08"; // AV1 Profile 0, Level 4.0, Main tier, Bit depth 8
      break;

    // Audio codecs
    case AV_CODEC_ID_AAC:
    {
      codecString << "mp4a.40.";

      // Determine AAC profile
      if (codec_params->profile == FF_PROFILE_AAC_LOW)
      {
        codecString << "2"; // AAC-LC
      }
      else if (codec_params->profile == FF_PROFILE_AAC_HE)
      {
        codecString << "5"; // HE-AAC
      }
      else if (codec_params->profile == FF_PROFILE_AAC_HE_V2)
      {
        codecString << "29"; // HE-AAC v2
      }
      else if (codec_params->profile == FF_PROFILE_AAC_LD)
      {
        codecString << "23"; // AAC-LD
      }
      else if (codec_params->profile == FF_PROFILE_AAC_ELD)
      {
        codecString << "39"; // AAC-ELD
      }
      else
      {
        codecString << "2"; // Default to AAC-LC
      }
      break;
    }

    case AV_CODEC_ID_MP3:
      codecString << "mp3";
      break;

    case AV_CODEC_ID_OPUS:
      codecString << "opus";
      break;

    case AV_CODEC_ID_VORBIS:
      codecString << "vorbis";
      break;

    case AV_CODEC_ID_FLAC:
      codecString << "flac";
      break;

    default:
    {
      // Use FFmpeg's codec descriptor name as fallback
      const AVCodecDescriptor *desc = avcodec_descriptor_get(codec_params->codec_id);
      if (desc && desc->name)
      {
        codecString << desc->name;
      }
      else
      {
        codecString << "unknown";
      }
      break;
    }
    }

    return codecString.str();
  }

  Napi::Value ValidateRemoteSource(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();
    Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);

    std::cerr << "[ValidateRemoteSource] Starting validation" << std::endl;

    if (info.Length() < 1 || !info[0].IsString())
    {
      std::cerr << "[ValidateRemoteSource] Error: URL argument missing or invalid" << std::endl;
      Napi::TypeError::New(env, "URL argument expected").ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string url = info[0].As<Napi::String>().Utf8Value();
    std::cerr << "[ValidateRemoteSource] Validating URL: " << url << std::endl;

    AsyncValidateRemoteSourceWorker *worker = new AsyncValidateRemoteSourceWorker(url, deferred);
    worker->Queue();

    return deferred.Promise();
  }

  AsyncValidateRemoteSourceWorker::AsyncValidateRemoteSourceWorker(const std::string &url, Napi::Promise::Deferred deferred)
      : Napi::AsyncWorker(deferred.Env()), url_(url), deferred_(deferred)
  {
    valid_ = false;
    reason_ = "";
  }

  AsyncValidateRemoteSourceWorker::~AsyncValidateRemoteSourceWorker() {}

  void AsyncValidateRemoteSourceWorker::Execute()
  {
    std::cerr << "[AsyncValidateRemoteSourceWorker] Processing URL: " << url_ << std::endl;

    AVFormatContext *format_ctx_raw = nullptr;

    // Open the input file/URL
    int ret = avformat_open_input(&format_ctx_raw, url_.c_str(), nullptr, nullptr);
    if (ret < 0)
    {
      char error_buffer[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret, error_buffer, AV_ERROR_MAX_STRING_SIZE);
      std::string errorMsg = std::string("Could not open source: ") + error_buffer;

      std::cerr << "[AsyncValidateRemoteSourceWorker] " << errorMsg << std::endl;
      reason_ = errorMsg;
      return;
    }

    // Use smart pointer for RAII
    FormatContextPtr format_ctx(format_ctx_raw);
    std::cerr << "[AsyncValidateRemoteSourceWorker] Successfully opened input file" << std::endl;

    // Retrieve stream information
    ret = avformat_find_stream_info(format_ctx.get(), nullptr);
    if (ret < 0)
    {
      char error_buffer[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret, error_buffer, AV_ERROR_MAX_STRING_SIZE);
      std::string errorMsg = std::string("Could not find stream information: ") + error_buffer;

      std::cerr << "[AsyncValidateRemoteSourceWorker] " << errorMsg << std::endl;
      reason_ = "Could not find stream information";
      return;
    }

    std::cerr << "[AsyncValidateRemoteSourceWorker] Found stream info" << std::endl;

    // Validate if the source has video streams
    bool has_video = false;
    video_stream_index_ = -1;

    // Collect information about all streams
    for (unsigned int i = 0; i < format_ctx->nb_streams; i++)
    {
      AVStream *stream = format_ctx->streams[i];
      AVCodecParameters *codec_params = stream->codecpar;

      StreamInfo stream_info;
      stream_info.index = i;

      // Get codec details
      const AVCodecDescriptor *codec_desc = avcodec_descriptor_get(codec_params->codec_id);
      if (codec_desc)
      {
        stream_info.codec_name = codec_desc->name ? codec_desc->name : "unknown";
        stream_info.codec_type = av_get_media_type_string(codec_desc->type) ? av_get_media_type_string(codec_desc->type) : "unknown";
      }
      else
      {
        stream_info.codec_name = "unknown";
        stream_info.codec_type = "unknown";
      }

      stream_info.codec_id = codec_params->codec_id;
      stream_info.profile = codec_params->profile;
      stream_info.level = codec_params->level;
      stream_info.bit_rate = codec_params->bit_rate;
      stream_info.time_base = stream->time_base;

      // Calculate duration in seconds
      if (stream->duration != AV_NOPTS_VALUE && stream->time_base.den > 0)
      {
        stream_info.duration = stream->duration * av_q2d(stream->time_base);
      }
      else if (format_ctx->duration != AV_NOPTS_VALUE)
      {
        stream_info.duration = format_ctx->duration / (double)AV_TIME_BASE;
      }
      else
      {
        stream_info.duration = 0.0;
      }

      // Generate standardized codec string compatible with WebCodecs/MSE
      stream_info.mime_codec_string = GenerateCodecString(codec_params);

      // Media type specific information
      if (codec_params->codec_type == AVMEDIA_TYPE_VIDEO)
      {
        stream_info.width = codec_params->width;
        stream_info.height = codec_params->height;

        // Store pixel format as string
        if (codec_params->format != AV_PIX_FMT_NONE)
        {
          stream_info.pixel_format = av_get_pix_fmt_name((AVPixelFormat)codec_params->format);
        }
        else
        {
          stream_info.pixel_format = "unknown";
        }

        // Set frame rate
        if (stream->avg_frame_rate.num != 0 && stream->avg_frame_rate.den != 0)
        {
          stream_info.frame_rate = stream->avg_frame_rate;
        }
        else
        {
          stream_info.frame_rate = {0, 1};
        }

        has_video = true;
        if (video_stream_index_ < 0)
        {
          video_stream_index_ = i;
        }
      }
      else if (codec_params->codec_type == AVMEDIA_TYPE_AUDIO)
      {
        stream_info.channels = codec_params->ch_layout.nb_channels;
        stream_info.sample_rate = codec_params->sample_rate;
      }

      streams_info_.push_back(stream_info);
    }

    // Check if the source is seekable
    bool seekable = format_ctx->pb && (format_ctx->pb->seekable > 0);

    // Store file format and overall duration
    format_name_ = format_ctx->iformat->long_name ? format_ctx->iformat->long_name : "Unknown";
    if (format_ctx->duration != AV_NOPTS_VALUE)
    {
      duration_ = format_ctx->duration / (double)AV_TIME_BASE;
    }
    else
    {
      duration_ = 0.0;
    }

    // Store bitrate if available
    bit_rate_ = format_ctx->bit_rate;

    std::cerr << "[AsyncValidateRemoteSourceWorker] Has video: " << (has_video ? "yes" : "no")
              << ", Seekable: " << (seekable ? "yes" : "no") << std::endl;

    // Check validation conditions and set appropriate reasons
    if (!has_video)
    {
      reason_ = "Source does not contain video streams";
      std::cerr << "[AsyncValidateRemoteSourceWorker] " << reason_ << std::endl;
      return;
    }

    if (!seekable)
    {
      reason_ = "Source is not seekable";
      std::cerr << "[AsyncValidateRemoteSourceWorker] " << reason_ << std::endl;
      return;
    }

    // If we reached here, the source is valid
    valid_ = true;
    std::cerr << "[AsyncValidateRemoteSourceWorker] Validation successful" << std::endl;
  }

  void AsyncValidateRemoteSourceWorker::OnOK()
  {
    Napi::Env env = Env();
    Napi::Object result = Napi::Object::New(env);
    result.Set("valid", Napi::Boolean::New(env, valid_));
    result.Set("url", Napi::String::New(env, url_));

    if (!valid_ && !reason_.empty())
    {
      result.Set("reason", Napi::String::New(env, reason_));
    }

    if (valid_)
    {
      // Add file level information
      result.Set("format", Napi::String::New(env, format_name_));
      result.Set("duration", Napi::Number::New(env, duration_));
      if (bit_rate_ > 0)
      {
        result.Set("bitRate", Napi::Number::New(env, bit_rate_));
      }

      // Add information about streams
      Napi::Array streams = Napi::Array::New(env);

      for (size_t i = 0; i < streams_info_.size(); i++)
      {
        Napi::Object stream = Napi::Object::New(env);
        const StreamInfo &info = streams_info_[i];

        stream.Set("index", Napi::Number::New(env, info.index));
        stream.Set("codecName", Napi::String::New(env, info.codec_name));
        stream.Set("codecType", Napi::String::New(env, info.codec_type));
        stream.Set("codecId", Napi::Number::New(env, info.codec_id));
        stream.Set("codecString", Napi::String::New(env, info.mime_codec_string));
        stream.Set("profile", Napi::Number::New(env, info.profile));
        stream.Set("level", Napi::Number::New(env, info.level));

        if (info.bit_rate > 0)
        {
          stream.Set("bitRate", Napi::Number::New(env, info.bit_rate));
        }

        // Create timebase object
        Napi::Object timeBase = Napi::Object::New(env);
        timeBase.Set("num", Napi::Number::New(env, info.time_base.num));
        timeBase.Set("den", Napi::Number::New(env, info.time_base.den));
        stream.Set("timeBase", timeBase);

        stream.Set("duration", Napi::Number::New(env, info.duration));

        // Add video-specific properties
        if (info.codec_type == "video")
        {
          stream.Set("width", Napi::Number::New(env, info.width));
          stream.Set("height", Napi::Number::New(env, info.height));
          stream.Set("pixelFormat", Napi::String::New(env, info.pixel_format));

          // Add framerate
          Napi::Object frameRate = Napi::Object::New(env);
          frameRate.Set("num", Napi::Number::New(env, info.frame_rate.num));
          frameRate.Set("den", Napi::Number::New(env, info.frame_rate.den));
          stream.Set("frameRate", frameRate);
        }
        // Add audio-specific properties
        else if (info.codec_type == "audio")
        {
          stream.Set("channels", Napi::Number::New(env, info.channels));
          stream.Set("sampleRate", Napi::Number::New(env, info.sample_rate));
        }

        streams[(uint32_t)i] = stream;
      }

      result.Set("streams", streams);

      // Add primary video stream index
      if (video_stream_index_ >= 0)
      {
        result.Set("primaryVideoStreamIndex", Napi::Number::New(env, video_stream_index_));
      }
    }

    std::cerr << "[AsyncValidateRemoteSourceWorker] Resolving promise with valid=" << (valid_ ? "true" : "false") << std::endl;
    deferred_.Resolve(result);
  }

  void AsyncValidateRemoteSourceWorker::OnError(const Napi::Error &error)
  {
    // This will now only be triggered for actual exceptions
    std::cerr << "[AsyncValidateRemoteSourceWorker] Error occurred: " << error.Message() << std::endl;

    Napi::Env env = Env();
    Napi::Object result = Napi::Object::New(env);
    result.Set("valid", Napi::Boolean::New(env, false));
    result.Set("url", Napi::String::New(env, url_));
    result.Set("error", error.Value());
    deferred_.Resolve(result); // Resolve with error data instead of rejecting
  }
}