package ffmpeg

/*
#cgo pkg-config: libavformat libavcodec libavutil
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
#include <stdlib.h>

typedef struct {
    int index;
    int64_t duration;
    double duration_ms;
    enum AVMediaType codec_type;
    enum AVCodecID codec_id;
    int width;
    int height;
    enum AVPixelFormat pix_fmt;
    AVRational frame_rate;
    int channels;
    int sample_rate;
    enum AVSampleFormat sample_fmt;
    AVRational time_base;
    uint8_t *extradata;
    int extradata_size;
} StreamInfo;

typedef struct {
    int64_t dts;
    double dts_ms;
    int64_t pos;
    int64_t size;
    int is_keyframe;
} SampleEntry;

typedef struct {
    int64_t start_byte;
    int64_t end_byte;
    SampleEntry *samples;
    int sample_count;
    double expanded_start_time_ms;
    double expanded_end_time_ms;
} ByteRangeInfo;

typedef struct {
    AVFormatContext *fmt_ctx;
    int nb_streams;
    StreamInfo *streams;
    double duration_ms;
} VideoSourceHandle;

typedef struct {
    AVIOContext *avio_ctx;
    uint8_t *buffer;
    size_t buffer_size;
    size_t position;
} CustomIOContext;

static int read_packet_callback(void *opaque, uint8_t *buf, int buf_size) {
    CustomIOContext *ctx = (CustomIOContext *)opaque;
    if (ctx->position >= ctx->buffer_size) {
        return AVERROR_EOF;
    }

    int bytes_to_read = buf_size;
    if (ctx->position + bytes_to_read > ctx->buffer_size) {
        bytes_to_read = ctx->buffer_size - ctx->position;
    }

    memcpy(buf, ctx->buffer + ctx->position, bytes_to_read);
    ctx->position += bytes_to_read;

    return bytes_to_read;
}

static int64_t seek_callback(void *opaque, int64_t offset, int whence) {
    CustomIOContext *ctx = (CustomIOContext *)opaque;

    int64_t new_pos = 0;
    switch (whence) {
        case SEEK_SET:
            new_pos = offset;
            break;
        case SEEK_CUR:
            new_pos = ctx->position + offset;
            break;
        case SEEK_END:
            new_pos = ctx->buffer_size + offset;
            break;
        case AVSEEK_SIZE:
            return ctx->buffer_size;
        default:
            return -1;
    }

    if (new_pos < 0 || new_pos > ctx->buffer_size) {
        return -1;
    }

    ctx->position = new_pos;
    return new_pos;
}

VideoSourceHandle* create_video_source_from_buffer(uint8_t *data, size_t data_size, char **error_msg) {
    VideoSourceHandle *handle = (VideoSourceHandle*)calloc(1, sizeof(VideoSourceHandle));
    if (!handle) {
        *error_msg = strdup("Failed to allocate handle");
        return NULL;
    }

    CustomIOContext *io_ctx = (CustomIOContext*)calloc(1, sizeof(CustomIOContext));
    if (!io_ctx) {
        free(handle);
        *error_msg = strdup("Failed to allocate IO context");
        return NULL;
    }

    io_ctx->buffer = data;
    io_ctx->buffer_size = data_size;
    io_ctx->position = 0;

    const int avio_buffer_size = 4096;
    uint8_t *avio_buffer = (uint8_t*)av_malloc(avio_buffer_size);
    if (!avio_buffer) {
        free(io_ctx);
        free(handle);
        *error_msg = strdup("Failed to allocate AVIO buffer");
        return NULL;
    }

    AVIOContext *avio_ctx = avio_alloc_context(
        avio_buffer,
        avio_buffer_size,
        0,
        io_ctx,
        read_packet_callback,
        NULL,
        seek_callback
    );

    if (!avio_ctx) {
        av_free(avio_buffer);
        free(io_ctx);
        free(handle);
        *error_msg = strdup("Failed to create AVIO context");
        return NULL;
    }

    handle->fmt_ctx = avformat_alloc_context();
    if (!handle->fmt_ctx) {
        avio_context_free(&avio_ctx);
        free(io_ctx);
        free(handle);
        *error_msg = strdup("Failed to allocate format context");
        return NULL;
    }

    handle->fmt_ctx->pb = avio_ctx;
    handle->fmt_ctx->flags |= AVFMT_FLAG_CUSTOM_IO;

    AVDictionary *options = NULL;
    av_dict_set(&options, "analyzeduration", "10000000", 0);
    av_dict_set(&options, "probesize", "10000000", 0);
    av_dict_set(&options, "fflags", "+genpts+igndts", 0);
    av_dict_set(&options, "err_detect", "ignore_err", 0);

    int ret = avformat_open_input(&handle->fmt_ctx, NULL, NULL, &options);
    if (ret < 0) {
        char err_buf[128];
        av_strerror(ret, err_buf, sizeof(err_buf));
        *error_msg = strdup(err_buf);
        av_dict_free(&options);
        avformat_close_input(&handle->fmt_ctx);
        avio_context_free(&avio_ctx);
        free(io_ctx);
        free(handle);
        return NULL;
    }

    ret = avformat_find_stream_info(handle->fmt_ctx, NULL);
    if (ret < 0) {
        char err_buf[128];
        av_strerror(ret, err_buf, sizeof(err_buf));
        fprintf(stderr, "[VideoSource] Stream info analysis had issues, but continuing: %s\n", err_buf);
    }

    av_dict_free(&options);

    handle->nb_streams = handle->fmt_ctx->nb_streams;
    handle->streams = (StreamInfo*)calloc(handle->nb_streams, sizeof(StreamInfo));

    if (!handle->streams) {
        *error_msg = strdup("Failed to allocate streams");
        avformat_close_input(&handle->fmt_ctx);
        avio_context_free(&avio_ctx);
        free(io_ctx);
        free(handle);
        return NULL;
    }

    if (handle->fmt_ctx->duration != AV_NOPTS_VALUE) {
        handle->duration_ms = (double)handle->fmt_ctx->duration / AV_TIME_BASE * 1000.0;
    } else {
        handle->duration_ms = 0;
    }

    for (unsigned int i = 0; i < handle->nb_streams; i++) {
        AVStream *stream = handle->fmt_ctx->streams[i];
        StreamInfo *info = &handle->streams[i];

        info->index = i;
        info->codec_type = stream->codecpar->codec_type;
        info->codec_id = stream->codecpar->codec_id;
        info->time_base = stream->time_base;
        info->extradata = NULL;
        info->extradata_size = 0;

        if (stream->duration != AV_NOPTS_VALUE) {
            info->duration = stream->duration;
            info->duration_ms = (double)stream->duration * av_q2d(stream->time_base) * 1000.0;
        } else {
            info->duration = 0;
            info->duration_ms = 0;
        }

        if (stream->codecpar->extradata_size > 0) {
            info->extradata = (uint8_t*)malloc(stream->codecpar->extradata_size);
            if (info->extradata) {
                memcpy(info->extradata, stream->codecpar->extradata, stream->codecpar->extradata_size);
                info->extradata_size = stream->codecpar->extradata_size;
            }
        }

        if (info->codec_type == AVMEDIA_TYPE_VIDEO) {
            info->width = stream->codecpar->width;
            info->height = stream->codecpar->height;
            info->pix_fmt = stream->codecpar->format;
            info->frame_rate = stream->avg_frame_rate;
        } else if (info->codec_type == AVMEDIA_TYPE_AUDIO) {
            info->channels = stream->codecpar->ch_layout.nb_channels;
            info->sample_rate = stream->codecpar->sample_rate;
            info->sample_fmt = stream->codecpar->format;
        }
    }

    return handle;
}

void free_video_source(VideoSourceHandle *handle) {
    if (!handle) return;

    if (handle->streams) {
        for (int i = 0; i < handle->nb_streams; i++) {
            if (handle->streams[i].extradata) {
                free(handle->streams[i].extradata);
            }
        }
        free(handle->streams);
    }

    if (handle->fmt_ctx) {
        avformat_close_input(&handle->fmt_ctx);
    }

    free(handle);
}

int detect_available_tracks(VideoSourceHandle *handle, int *has_audio, int *has_video) {
    if (!handle) return -1;

    *has_audio = 0;
    *has_video = 0;

    for (int i = 0; i < handle->nb_streams; i++) {
        if (handle->streams[i].codec_type == AVMEDIA_TYPE_VIDEO) {
            *has_video = 1;
        } else if (handle->streams[i].codec_type == AVMEDIA_TYPE_AUDIO) {
            *has_audio = 1;
        }
    }

    return 0;
}

int find_keyframe_aligned_byte_range(
    VideoSourceHandle *handle,
    int stream_index,
    double start_time_ms,
    double end_time_ms,
    ByteRangeInfo *out_range
) {
    if (!handle || !handle->fmt_ctx) return -1;
    if (stream_index < 0 || stream_index >= handle->nb_streams) return -1;

    AVStream *stream = handle->fmt_ctx->streams[stream_index];
    AVRational time_base = stream->time_base;

    int64_t start_pts = (int64_t)(start_time_ms / 1000.0 / av_q2d(time_base));
    int64_t end_pts = (int64_t)(end_time_ms / 1000.0 / av_q2d(time_base));

    int64_t leading_keyframe_ts = start_pts;
    int64_t trailing_keyframe_ts = end_pts;
    int found_leading = 0;
    int found_trailing = 0;

    int nb_index_entries = avformat_index_get_entries_count(stream);
    for (int i = 0; i < nb_index_entries; i++) {
        const AVIndexEntry *entry = avformat_index_get_entry(stream, i);
        if ((entry->flags & AVINDEX_KEYFRAME) && entry->timestamp <= start_pts) {
            leading_keyframe_ts = entry->timestamp;
            found_leading = 1;
        }
        if (entry->timestamp > start_pts) break;
    }

    for (int i = nb_index_entries - 1; i >= 0; i--) {
        const AVIndexEntry *entry = avformat_index_get_entry(stream, i);
        if ((entry->flags & AVINDEX_KEYFRAME) && entry->timestamp >= end_pts) {
            trailing_keyframe_ts = entry->timestamp;
            found_trailing = 1;
        }
        if (entry->timestamp < end_pts) break;
    }

    int64_t min_pos = INT64_MAX;
    int64_t max_pos = 0;
    int sample_count = 0;

    int capacity = 1000;
    SampleEntry *samples = (SampleEntry*)calloc(capacity, sizeof(SampleEntry));
    if (!samples) return -1;

    for (int i = 0; i < nb_index_entries; i++) {
        const AVIndexEntry *entry = avformat_index_get_entry(stream, i);

        int64_t entry_pts = entry->timestamp;
        if (entry_pts < leading_keyframe_ts) continue;
        if (entry_pts > trailing_keyframe_ts) break;

        if (sample_count >= capacity) {
            capacity *= 2;
            SampleEntry *new_samples = (SampleEntry*)realloc(samples, capacity * sizeof(SampleEntry));
            if (!new_samples) {
                free(samples);
                return -1;
            }
            samples = new_samples;
        }

        samples[sample_count].dts = entry_pts;
        samples[sample_count].dts_ms = entry_pts * av_q2d(time_base) * 1000.0;
        samples[sample_count].pos = entry->pos;
        samples[sample_count].size = entry->size;
        samples[sample_count].is_keyframe = (entry->flags & AVINDEX_KEYFRAME) ? 1 : 0;

        if (entry->pos < min_pos) min_pos = entry->pos;
        if (entry->pos + entry->size > max_pos) max_pos = entry->pos + entry->size;

        sample_count++;
    }

    out_range->start_byte = min_pos;
    out_range->end_byte = max_pos;
    out_range->samples = samples;
    out_range->sample_count = sample_count;
    out_range->expanded_start_time_ms = leading_keyframe_ts * av_q2d(time_base) * 1000.0;
    out_range->expanded_end_time_ms = trailing_keyframe_ts * av_q2d(time_base) * 1000.0;

    return 0;
}

void free_byte_range_info(ByteRangeInfo *info) {
    if (!info) return;
    if (info->samples) {
        free(info->samples);
        info->samples = NULL;
    }
}
*/
import "C"
import (
	"fmt"
	"unsafe"
)

type VideoSource struct {
	handle *C.VideoSourceHandle
}

type StreamInfo struct {
	Index        int
	Duration     int64
	DurationMs   float64
	CodecType    string
	CodecID      int
	Width        int
	Height       int
	PixelFormat  int
	FrameRateNum int
	FrameRateDen int
	Channels     int
	SampleRate   int
	SampleFormat int
	TimeBaseNum  int
	TimeBaseDen  int
	Extradata    []byte
}

func CreateVideoSourceFromBuffer(data []byte) (*VideoSource, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("empty data buffer")
	}

	var errorMsg *C.char
	handle := C.create_video_source_from_buffer(
		(*C.uint8_t)(unsafe.Pointer(&data[0])),
		C.size_t(len(data)),
		&errorMsg,
	)

	if handle == nil {
		if errorMsg != nil {
			err := C.GoString(errorMsg)
			C.free(unsafe.Pointer(errorMsg))
			return nil, fmt.Errorf("failed to create video source: %s", err)
		}
		return nil, fmt.Errorf("failed to create video source: unknown error")
	}

	return &VideoSource{handle: handle}, nil
}

func (vs *VideoSource) GetDurationMs() float64 {
	if vs.handle == nil {
		return 0
	}
	return float64(vs.handle.duration_ms)
}

func (vs *VideoSource) GetStreams() []StreamInfo {
	if vs.handle == nil {
		return nil
	}

	streams := make([]StreamInfo, int(vs.handle.nb_streams))
	streamArray := (*[1 << 30]C.StreamInfo)(unsafe.Pointer(vs.handle.streams))[:vs.handle.nb_streams:vs.handle.nb_streams]

	for i := 0; i < int(vs.handle.nb_streams); i++ {
		cStream := streamArray[i]

		codecType := "unknown"
		switch cStream.codec_type {
		case C.AVMEDIA_TYPE_VIDEO:
			codecType = "video"
		case C.AVMEDIA_TYPE_AUDIO:
			codecType = "audio"
		}

		var extradata []byte
		if cStream.extradata_size > 0 && cStream.extradata != nil {
			extradata = C.GoBytes(unsafe.Pointer(cStream.extradata), cStream.extradata_size)
		}

		streams[i] = StreamInfo{
			Index:        int(cStream.index),
			Duration:     int64(cStream.duration),
			DurationMs:   float64(cStream.duration_ms),
			CodecType:    codecType,
			CodecID:      int(cStream.codec_id),
			Width:        int(cStream.width),
			Height:       int(cStream.height),
			PixelFormat:  int(cStream.pix_fmt),
			FrameRateNum: int(cStream.frame_rate.num),
			FrameRateDen: int(cStream.frame_rate.den),
			Channels:     int(cStream.channels),
			SampleRate:   int(cStream.sample_rate),
			SampleFormat: int(cStream.sample_fmt),
			TimeBaseNum:  int(cStream.time_base.num),
			TimeBaseDen:  int(cStream.time_base.den),
			Extradata:    extradata,
		}
	}

	return streams
}

func (vs *VideoSource) DetectAvailableTracks() (hasAudio bool, hasVideo bool, err error) {
	if vs.handle == nil {
		return false, false, fmt.Errorf("video source not initialized")
	}

	var cHasAudio, cHasVideo C.int
	ret := C.detect_available_tracks(vs.handle, &cHasAudio, &cHasVideo)

	if ret != 0 {
		return false, false, fmt.Errorf("failed to detect tracks")
	}

	return cHasAudio != 0, cHasVideo != 0, nil
}

type SampleEntry struct {
	DTS        int64
	DTSMs      float64
	Pos        int64
	Size       int64
	IsKeyframe bool
}

type ByteRangeInfo struct {
	StartByte           int64
	EndByte             int64
	SampleCount         int
	ExpandedStartTimeMs float64
	ExpandedEndTimeMs   float64
	Samples             []SampleEntry
}

func (vs *VideoSource) FindKeyframeAlignedByteRange(streamIndex int, startTimeMs, endTimeMs float64) (*ByteRangeInfo, error) {
	if vs.handle == nil {
		return nil, fmt.Errorf("video source not initialized")
	}

	var cRangeInfo C.ByteRangeInfo
	ret := C.find_keyframe_aligned_byte_range(
		vs.handle,
		C.int(streamIndex),
		C.double(startTimeMs),
		C.double(endTimeMs),
		&cRangeInfo,
	)

	if ret != 0 {
		return nil, fmt.Errorf("failed to find byte range: %d", ret)
	}

	defer C.free_byte_range_info(&cRangeInfo)

	samples := make([]SampleEntry, int(cRangeInfo.sample_count))
	if cRangeInfo.sample_count > 0 && cRangeInfo.samples != nil {
		sampleArray := (*[1 << 30]C.SampleEntry)(unsafe.Pointer(cRangeInfo.samples))[:cRangeInfo.sample_count:cRangeInfo.sample_count]
		for i := 0; i < int(cRangeInfo.sample_count); i++ {
			samples[i] = SampleEntry{
				DTS:        int64(sampleArray[i].dts),
				DTSMs:      float64(sampleArray[i].dts_ms),
				Pos:        int64(sampleArray[i].pos),
				Size:       int64(sampleArray[i].size),
				IsKeyframe: sampleArray[i].is_keyframe != 0,
			}
		}
	}

	info := &ByteRangeInfo{
		StartByte:           int64(cRangeInfo.start_byte),
		EndByte:             int64(cRangeInfo.end_byte),
		SampleCount:         int(cRangeInfo.sample_count),
		ExpandedStartTimeMs: float64(cRangeInfo.expanded_start_time_ms),
		ExpandedEndTimeMs:   float64(cRangeInfo.expanded_end_time_ms),
		Samples:             samples,
	}

	return info, nil
}

func (vs *VideoSource) Close() {
	if vs.handle != nil {
		C.free_video_source(vs.handle)
		vs.handle = nil
	}
}
