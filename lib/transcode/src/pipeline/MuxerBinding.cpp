#include "Muxer.h"
#include "../logging.h"
#include "../ConstructorReferences.h"
#include "../async/WritePacketAsyncWorker.h"
#include <napi.h>
#include <memory>
#include <map>

class MuxerWrapper : public Napi::ObjectWrap<MuxerWrapper>
{
public:
  static Napi::Function Init(Napi::Env env, Napi::Object exports);
  MuxerWrapper(const Napi::CallbackInfo &info);
  ~MuxerWrapper();

private:
  std::unique_ptr<playback::Muxer> muxer_;

  // Methods
  Napi::Value Initialize(const Napi::CallbackInfo &info);
  Napi::Value AddVideoStream(const Napi::CallbackInfo &info);
  Napi::Value AddAudioStream(const Napi::CallbackInfo &info);
  Napi::Value AddVideoStreamFromEncoder(const Napi::CallbackInfo &info);
  Napi::Value AddAudioStreamFromEncoder(const Napi::CallbackInfo &info);
  Napi::Value WriteHeader(const Napi::CallbackInfo &info);
  Napi::Value WritePacket(const Napi::CallbackInfo &info);
  Napi::Value WritePacketAsync(const Napi::CallbackInfo &info);
  Napi::Value FinalizeStream(const Napi::CallbackInfo &info);
  Napi::Value Dispose(const Napi::CallbackInfo &info);

  // Getters
  Napi::Value GetIsInitialized(const Napi::CallbackInfo &info);
  Napi::Value GetHasVideoStream(const Napi::CallbackInfo &info);
  Napi::Value GetHasAudioStream(const Napi::CallbackInfo &info);
  Napi::Value GetFormat(const Napi::CallbackInfo &info);
  Napi::Value GetFilename(const Napi::CallbackInfo &info);
  Napi::Value GetStats(const Napi::CallbackInfo &info);

  // Helper methods
  static playback::MuxerOptions extractMuxerOptions(const Napi::Object &options);
  static playback::InputPacketInfo extractPacketInfo(const Napi::Object &packet);
  static Napi::Object createStatsObject(Napi::Env env, const playback::MuxerStats &stats);
  static std::optional<AVRational> extractRational(const Napi::Object &obj, const std::string &key);

  struct VideoStreamParams
  {
    int codecId;
    int width;
    int height;
    AVRational timeBase;
    AVRational frameRate;
    int bitrate = 0;
    int pixelFormat = 0;
    uint8_t *extradata = nullptr;
    int extradataSize = 0;
  };

  struct AudioStreamParams
  {
    int codecId;
    int channels;
    int sampleRate;
    AVRational timeBase;
    int bitrate = 0;
    int sampleFormat = 8; // AV_SAMPLE_FMT_FLTP
    uint8_t *extradata = nullptr;
    int extradataSize = 0;
  };

  VideoStreamParams extractVideoStreamParams(Napi::Env env, const Napi::Object &options)
  {
    VideoStreamParams params;

    // Extract required parameters
    params.codecId = options.Get("codecId").As<Napi::Number>().Int32Value();
    params.width = options.Get("width").As<Napi::Number>().Int32Value();
    params.height = options.Get("height").As<Napi::Number>().Int32Value();

    // Extract timebase and framerate
    auto timeBase = extractRational(options, "timeBase");
    auto frameRate = extractRational(options, "frameRate");

    if (!timeBase.has_value() || !frameRate.has_value())
    {
      Napi::TypeError::New(env, "timeBase and frameRate are required").ThrowAsJavaScriptException();
      return params; // Error already thrown
    }

    params.timeBase = timeBase.value();
    params.frameRate = frameRate.value();

    // Extract optional parameters
    if (options.Has("bitrate"))
    {
      params.bitrate = options.Get("bitrate").As<Napi::Number>().Int32Value();
    }

    if (options.Has("pixelFormat"))
    {
      params.pixelFormat = options.Get("pixelFormat").As<Napi::Number>().Int32Value();
    }

    // Extract extradata
    if (options.Has("extradata"))
    {
      Napi::Uint8Array extradataArray = options.Get("extradata").As<Napi::Uint8Array>();
      params.extradata = extradataArray.Data();
      params.extradataSize = static_cast<int>(extradataArray.ByteLength());
    }

    return params;
  }

  AudioStreamParams extractAudioStreamParams(Napi::Env env, const Napi::Object &options)
  {
    AudioStreamParams params;

    // Extract required parameters
    params.codecId = options.Get("codecId").As<Napi::Number>().Int32Value();
    params.channels = options.Get("channels").As<Napi::Number>().Int32Value();
    params.sampleRate = options.Get("sampleRate").As<Napi::Number>().Int32Value();

    // Extract timebase
    auto timeBase = extractRational(options, "timeBase");
    if (!timeBase.has_value())
    {
      Napi::TypeError::New(env, "timeBase is required").ThrowAsJavaScriptException();
      return params; // Error already thrown
    }

    params.timeBase = timeBase.value();

    // Extract optional parameters
    if (options.Has("bitrate"))
    {
      params.bitrate = options.Get("bitrate").As<Napi::Number>().Int32Value();
    }

    if (options.Has("sampleFormat"))
    {
      params.sampleFormat = options.Get("sampleFormat").As<Napi::Number>().Int32Value();
    }

    // Extract extradata
    if (options.Has("extradata"))
    {
      Napi::Uint8Array extradataArray = options.Get("extradata").As<Napi::Uint8Array>();
      params.extradata = extradataArray.Data();
      params.extradataSize = static_cast<int>(extradataArray.ByteLength());
    }

    return params;
  }
};

Napi::Function MuxerWrapper::Init(Napi::Env env, Napi::Object exports)
{
  Napi::Function func = DefineClass(env, "MuxerNative", {InstanceMethod("initialize", &MuxerWrapper::Initialize), InstanceMethod("addVideoStream", &MuxerWrapper::AddVideoStream), InstanceMethod("addAudioStream", &MuxerWrapper::AddAudioStream), InstanceMethod("addVideoStreamFromEncoder", &MuxerWrapper::AddVideoStreamFromEncoder), InstanceMethod("addAudioStreamFromEncoder", &MuxerWrapper::AddAudioStreamFromEncoder), InstanceMethod("writeHeader", &MuxerWrapper::WriteHeader), InstanceMethod("writePacketAsync", &MuxerWrapper::WritePacketAsync), InstanceMethod("finalize", &MuxerWrapper::FinalizeStream), InstanceMethod("dispose", &MuxerWrapper::Dispose), InstanceAccessor("isInitialized", &MuxerWrapper::GetIsInitialized, nullptr), InstanceAccessor("hasVideoStream", &MuxerWrapper::GetHasVideoStream, nullptr), InstanceAccessor("hasAudioStream", &MuxerWrapper::GetHasAudioStream, nullptr), InstanceAccessor("format", &MuxerWrapper::GetFormat, nullptr), InstanceAccessor("filename", &MuxerWrapper::GetFilename, nullptr), InstanceAccessor("stats", &MuxerWrapper::GetStats, nullptr)});

  return func;
}

MuxerWrapper::MuxerWrapper(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<MuxerWrapper>(info), muxer_(std::make_unique<playback::Muxer>())
{
}

MuxerWrapper::~MuxerWrapper()
{
  if (muxer_)
  {
    muxer_->dispose();
  }
}

Napi::Value MuxerWrapper::Initialize(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsObject())
  {
    Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
    return env.Null();
  }

  try
  {
    Napi::Object options = info[0].As<Napi::Object>();
    playback::MuxerOptions muxerOptions = extractMuxerOptions(options);

    bool success = muxer_->initialize(muxerOptions);
    return Napi::Boolean::New(env, success);
  }
  catch (const std::exception &e)
  {
    Napi::Error::New(env, std::string("Failed to initialize Muxer: ") + e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value MuxerWrapper::AddVideoStream(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsObject())
  {
    Napi::TypeError::New(env, "Expected video stream options object").ThrowAsJavaScriptException();
    return env.Null();
  }

  try
  {
    Napi::Object options = info[0].As<Napi::Object>();
    VideoStreamParams params = extractVideoStreamParams(env, options);

    bool success = muxer_->addVideoStream(params.codecId, params.width, params.height,
                                          params.frameRate, params.timeBase,
                                          params.bitrate, params.pixelFormat,
                                          params.extradata, params.extradataSize);
    return Napi::Boolean::New(env, success);
  }
  catch (const std::exception &e)
  {
    Napi::Error::New(env, std::string("Failed to add video stream: ") + e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value MuxerWrapper::AddAudioStream(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsObject())
  {
    Napi::TypeError::New(env, "Expected audio stream options object").ThrowAsJavaScriptException();
    return env.Null();
  }

  try
  {
    Napi::Object options = info[0].As<Napi::Object>();
    AudioStreamParams params = extractAudioStreamParams(env, options);

    bool success = muxer_->addAudioStream(params.codecId, params.channels, params.sampleRate,
                                          params.timeBase, params.bitrate, params.sampleFormat,
                                          params.extradata, params.extradataSize);
    return Napi::Boolean::New(env, success);
  }
  catch (const std::exception &e)
  {
    Napi::Error::New(env, std::string("Failed to add audio stream: ") + e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value MuxerWrapper::AddVideoStreamFromEncoder(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsObject())
  {
    Napi::TypeError::New(env, "Expected codec parameters object").ThrowAsJavaScriptException();
    return env.Null();
  }

  try
  {
    Napi::Object codecParamsObj = info[0].As<Napi::Object>();

    // Create AVCodecParameters from JavaScript object
    AVCodecParameters *codecpar = avcodec_parameters_alloc();
    if (!codecpar)
    {
      Napi::Error::New(env, "Failed to allocate codec parameters").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Extract codec parameters
    codecpar->codec_id = static_cast<AVCodecID>(codecParamsObj.Get("codecId").As<Napi::Number>().Int32Value());
    codecpar->codec_type = static_cast<AVMediaType>(codecParamsObj.Get("codecType").As<Napi::Number>().Int32Value());
    codecpar->width = codecParamsObj.Get("width").As<Napi::Number>().Int32Value();
    codecpar->height = codecParamsObj.Get("height").As<Napi::Number>().Int32Value();
    codecpar->format = codecParamsObj.Get("pixelFormat").As<Napi::Number>().Int32Value();
    codecpar->bit_rate = static_cast<int64_t>(codecParamsObj.Get("bitRate").As<Napi::Number>().DoubleValue());

    // Extract extradata
    if (codecParamsObj.Has("extradata"))
    {
      Napi::Uint8Array extradataArray = codecParamsObj.Get("extradata").As<Napi::Uint8Array>();
      if (extradataArray.ByteLength() > 0)
      {
        codecpar->extradata_size = static_cast<int>(extradataArray.ByteLength());
        codecpar->extradata = static_cast<uint8_t *>(av_malloc(codecpar->extradata_size));
        if (codecpar->extradata)
        {
          std::memcpy(codecpar->extradata, extradataArray.Data(), codecpar->extradata_size);
        }
      }
    }

    // Extract timebase and framerate from second and third parameters
    if (info.Length() < 3 || !info[1].IsObject() || !info[2].IsObject())
    {
      avcodec_parameters_free(&codecpar);
      Napi::TypeError::New(env, "Expected timeBase and frameRate objects").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Extract timebase and framerate directly from objects
    Napi::Object timeBaseObj = info[1].As<Napi::Object>();
    Napi::Object frameRateObj = info[2].As<Napi::Object>();

    if (!timeBaseObj.Has("num") || !timeBaseObj.Has("den") ||
        !frameRateObj.Has("num") || !frameRateObj.Has("den"))
    {
      avcodec_parameters_free(&codecpar);
      Napi::TypeError::New(env, "timeBase and frameRate must have 'num' and 'den' properties").ThrowAsJavaScriptException();
      return env.Null();
    }

    AVRational timeBase = {
        timeBaseObj.Get("num").As<Napi::Number>().Int32Value(),
        timeBaseObj.Get("den").As<Napi::Number>().Int32Value()};

    AVRational frameRate = {
        frameRateObj.Get("num").As<Napi::Number>().Int32Value(),
        frameRateObj.Get("den").As<Napi::Number>().Int32Value()};

    bool success = muxer_->addVideoStreamFromEncoder(codecpar, timeBase, frameRate);

    // Free the codec parameters (the muxer makes its own copy)
    avcodec_parameters_free(&codecpar);

    return Napi::Boolean::New(env, success);
  }
  catch (const std::exception &e)
  {
    Napi::Error::New(env, std::string("Failed to add video stream from encoder: ") + e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value MuxerWrapper::AddAudioStreamFromEncoder(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsObject())
  {
    Napi::TypeError::New(env, "Expected codec parameters object").ThrowAsJavaScriptException();
    return env.Null();
  }

  try
  {
    Napi::Object codecParamsObj = info[0].As<Napi::Object>();

    // Create AVCodecParameters from JavaScript object
    AVCodecParameters *codecpar = avcodec_parameters_alloc();
    if (!codecpar)
    {
      Napi::Error::New(env, "Failed to allocate codec parameters").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Extract codec parameters
    codecpar->codec_id = static_cast<AVCodecID>(codecParamsObj.Get("codecId").As<Napi::Number>().Int32Value());
    codecpar->codec_type = static_cast<AVMediaType>(codecParamsObj.Get("codecType").As<Napi::Number>().Int32Value());
    codecpar->sample_rate = codecParamsObj.Get("sampleRate").As<Napi::Number>().Int32Value();
    codecpar->format = codecParamsObj.Get("sampleFormat").As<Napi::Number>().Int32Value();
    codecpar->bit_rate = static_cast<int64_t>(codecParamsObj.Get("bitRate").As<Napi::Number>().DoubleValue());

    // Set channel layout
    int channels = codecParamsObj.Get("channels").As<Napi::Number>().Int32Value();
    av_channel_layout_default(&codecpar->ch_layout, channels);

    // Extract extradata
    if (codecParamsObj.Has("extradata"))
    {
      Napi::Uint8Array extradataArray = codecParamsObj.Get("extradata").As<Napi::Uint8Array>();
      if (extradataArray.ByteLength() > 0)
      {
        codecpar->extradata_size = static_cast<int>(extradataArray.ByteLength());
        codecpar->extradata = static_cast<uint8_t *>(av_malloc(codecpar->extradata_size));
        if (codecpar->extradata)
        {
          std::memcpy(codecpar->extradata, extradataArray.Data(), codecpar->extradata_size);
        }
      }
    }

    // Extract timebase from second parameter
    if (info.Length() < 2 || !info[1].IsObject())
    {
      avcodec_parameters_free(&codecpar);
      Napi::TypeError::New(env, "Expected timeBase object").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Extract timebase directly from object
    Napi::Object timeBaseObj = info[1].As<Napi::Object>();

    if (!timeBaseObj.Has("num") || !timeBaseObj.Has("den"))
    {
      avcodec_parameters_free(&codecpar);
      Napi::TypeError::New(env, "timeBase must have 'num' and 'den' properties").ThrowAsJavaScriptException();
      return env.Null();
    }

    AVRational timeBase = {
        timeBaseObj.Get("num").As<Napi::Number>().Int32Value(),
        timeBaseObj.Get("den").As<Napi::Number>().Int32Value()};

    bool success = muxer_->addAudioStreamFromEncoder(codecpar, timeBase);

    // Free the codec parameters (the muxer makes its own copy)
    avcodec_parameters_free(&codecpar);

    return Napi::Boolean::New(env, success);
  }
  catch (const std::exception &e)
  {
    Napi::Error::New(env, std::string("Failed to add audio stream from encoder: ") + e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value MuxerWrapper::WriteHeader(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  try
  {
    bool success = muxer_->writeHeader();
    return Napi::Boolean::New(env, success);
  }
  catch (const std::exception &e)
  {
    Napi::Error::New(env, std::string("Failed to write header: ") + e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value MuxerWrapper::WritePacketAsync(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsFunction())
  {
    Napi::TypeError::New(env, "Expected packet object and callback function").ThrowAsJavaScriptException();
    return env.Null();
  }

  try
  {
    Napi::Object packet = info[0].As<Napi::Object>();
    Napi::Function callback = info[1].As<Napi::Function>();

    playback::InputPacketInfo packetInfo = extractPacketInfo(packet);

    // Create and queue the async worker - this prevents main thread blocking
    playback::WritePacketAsyncWorker *worker = new playback::WritePacketAsyncWorker(callback, muxer_.get(), packetInfo);
    worker->Queue();

    return env.Undefined();
  }
  catch (const std::exception &e)
  {
    Napi::Error::New(env, std::string("Failed to queue async write packet: ") + e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value MuxerWrapper::FinalizeStream(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  try
  {
    bool success = muxer_->finalize();
    return Napi::Boolean::New(env, success);
  }
  catch (const std::exception &e)
  {
    Napi::Error::New(env, std::string("Failed to finalize: ") + e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value MuxerWrapper::Dispose(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  try
  {
    muxer_->dispose();
    return env.Undefined();
  }
  catch (const std::exception &e)
  {
    Napi::Error::New(env, std::string("Failed to dispose: ") + e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value MuxerWrapper::GetIsInitialized(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  return Napi::Boolean::New(env, muxer_->isInitialized());
}

Napi::Value MuxerWrapper::GetHasVideoStream(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  return Napi::Boolean::New(env, muxer_->hasVideoStream());
}

Napi::Value MuxerWrapper::GetHasAudioStream(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  return Napi::Boolean::New(env, muxer_->hasAudioStream());
}

Napi::Value MuxerWrapper::GetFormat(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  return Napi::String::New(env, muxer_->getFormat());
}

Napi::Value MuxerWrapper::GetFilename(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  return Napi::String::New(env, muxer_->getFilename());
}

Napi::Value MuxerWrapper::GetStats(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  return createStatsObject(env, muxer_->getStats());
}

playback::MuxerOptions MuxerWrapper::extractMuxerOptions(const Napi::Object &options)
{
  playback::MuxerOptions opts;

  // Required fields
  if (options.Has("format"))
  {
    opts.format = options.Get("format").As<Napi::String>().Utf8Value();
  }
  if (options.Has("filename"))
  {
    opts.filename = options.Get("filename").As<Napi::String>().Utf8Value();
  }

  // Video options
  if (options.Has("videoCodecId"))
  {
    opts.videoCodecId = options.Get("videoCodecId").As<Napi::Number>().Int32Value();
  }
  if (options.Has("videoWidth"))
  {
    opts.videoWidth = options.Get("videoWidth").As<Napi::Number>().Int32Value();
  }
  if (options.Has("videoHeight"))
  {
    opts.videoHeight = options.Get("videoHeight").As<Napi::Number>().Int32Value();
  }
  if (options.Has("videoFrameRate"))
  {
    opts.videoFrameRate = extractRational(options, "videoFrameRate");
  }
  if (options.Has("videoTimeBase"))
  {
    opts.videoTimeBase = extractRational(options, "videoTimeBase");
  }
  if (options.Has("videoBitrate"))
  {
    opts.videoBitrate = options.Get("videoBitrate").As<Napi::Number>().Int32Value();
  }
  if (options.Has("videoPixelFormat"))
  {
    opts.videoPixelFormat = options.Get("videoPixelFormat").As<Napi::Number>().Int32Value();
  }

  // Audio options
  if (options.Has("audioCodecId"))
  {
    opts.audioCodecId = options.Get("audioCodecId").As<Napi::Number>().Int32Value();
  }
  if (options.Has("audioChannels"))
  {
    opts.audioChannels = options.Get("audioChannels").As<Napi::Number>().Int32Value();
  }
  if (options.Has("audioSampleRate"))
  {
    opts.audioSampleRate = options.Get("audioSampleRate").As<Napi::Number>().Int32Value();
  }
  if (options.Has("audioSampleFormat"))
  {
    opts.audioSampleFormat = options.Get("audioSampleFormat").As<Napi::Number>().Int32Value();
  }
  if (options.Has("audioTimeBase"))
  {
    opts.audioTimeBase = extractRational(options, "audioTimeBase");
  }
  if (options.Has("audioBitrate"))
  {
    opts.audioBitrate = options.Get("audioBitrate").As<Napi::Number>().Int32Value();
  }

  // Container options
  if (options.Has("fastStart"))
  {
    opts.fastStart = options.Get("fastStart").As<Napi::Boolean>().Value();
  }
  if (options.Has("fragmentDuration"))
  {
    opts.fragmentDuration = options.Get("fragmentDuration").As<Napi::Number>().Int32Value();
  }
  if (options.Has("movFlags"))
  {
    opts.movFlags = options.Get("movFlags").As<Napi::String>().Utf8Value();
  }

  // Metadata
  if (options.Has("title"))
  {
    opts.title = options.Get("title").As<Napi::String>().Utf8Value();
  }
  if (options.Has("artist"))
  {
    opts.artist = options.Get("artist").As<Napi::String>().Utf8Value();
  }
  if (options.Has("album"))
  {
    opts.album = options.Get("album").As<Napi::String>().Utf8Value();
  }
  if (options.Has("comment"))
  {
    opts.comment = options.Get("comment").As<Napi::String>().Utf8Value();
  }
  if (options.Has("copyright"))
  {
    opts.copyright = options.Get("copyright").As<Napi::String>().Utf8Value();
  }
  if (options.Has("description"))
  {
    opts.description = options.Get("description").As<Napi::String>().Utf8Value();
  }

  return opts;
}

playback::InputPacketInfo MuxerWrapper::extractPacketInfo(const Napi::Object &packet)
{
  // Extract packet data
  Napi::Uint8Array dataArray = packet.Get("data").As<Napi::Uint8Array>();
  uint8_t *data = dataArray.Data();
  int size = static_cast<int>(dataArray.ByteLength());

  // Extract timing information
  int64_t pts = packet.Get("pts").As<Napi::Number>().Int64Value();
  int64_t dts = packet.Has("dts") ? packet.Get("dts").As<Napi::Number>().Int64Value() : pts;
  int streamIndex = packet.Get("streamIndex").As<Napi::Number>().Int32Value();

  // Extract optional fields
  int duration = packet.Has("duration") ? packet.Get("duration").As<Napi::Number>().Int32Value() : 0;
  int flags = packet.Has("flags") ? packet.Get("flags").As<Napi::Number>().Int32Value() : 0;

  // Extract source timebase (default to microseconds if not provided)
  AVRational sourceTimeBase = {1, 1000000}; // Default to microseconds
  if (packet.Has("sourceTimeBase"))
  {
    auto timeBaseOpt = extractRational(packet, "sourceTimeBase");
    if (timeBaseOpt.has_value())
    {
      sourceTimeBase = timeBaseOpt.value();
    }
  }

  return playback::InputPacketInfo(data, size, pts, dts, streamIndex, duration, flags, sourceTimeBase);
}

Napi::Object MuxerWrapper::createStatsObject(Napi::Env env, const playback::MuxerStats &stats)
{
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("videoPacketsWritten", Napi::Number::New(env, static_cast<double>(stats.videoPacketsWritten)));
  obj.Set("audioPacketsWritten", Napi::Number::New(env, static_cast<double>(stats.audioPacketsWritten)));
  obj.Set("totalBytesWritten", Napi::Number::New(env, static_cast<double>(stats.totalBytesWritten)));
  obj.Set("videoDuration", Napi::Number::New(env, stats.videoDuration));
  obj.Set("audioDuration", Napi::Number::New(env, stats.audioDuration));
  obj.Set("isFinalized", Napi::Boolean::New(env, stats.isFinalized));
  return obj;
}

std::optional<AVRational> MuxerWrapper::extractRational(const Napi::Object &obj, const std::string &key)
{
  if (!obj.Has(key))
  {
    return std::nullopt;
  }

  Napi::Value value = obj.Get(key);
  if (!value.IsObject())
  {
    return std::nullopt;
  }

  Napi::Object rational = value.As<Napi::Object>();
  if (!rational.Has("num") || !rational.Has("den"))
  {
    return std::nullopt;
  }

  AVRational result;
  result.num = rational.Get("num").As<Napi::Number>().Int32Value();
  result.den = rational.Get("den").As<Napi::Number>().Int32Value();
  return result;
}

namespace playback
{
  // Factory function for creating Muxer instances
  Napi::Value CreateMuxerNative(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();

    // Get the constructor from centralized references
    ConstructorReferences *refs = ConstructorReferences::getInstance(env);
    if (!refs->muxerConstructor)
    {
      Napi::Error::New(env, "Muxer constructor not available").ThrowAsJavaScriptException();
      return env.Null();
    }

    return refs->muxerConstructor->New({});
  }

  // Module initialization function
  void InitMuxer(Napi::Env env, Napi::Object exports)
  {
    // Initialize the Muxer wrapper and store constructor safely
    Napi::Function constructor = MuxerWrapper::Init(env, exports);

    // Get centralized constructor references and set safely
    ConstructorReferences *refs = ConstructorReferences::getInstance(env);
    refs->setMuxerConstructor(constructor);

    // Export factory function
    exports.Set("createMuxerNative", Napi::Function::New(env, CreateMuxerNative));
  }
}