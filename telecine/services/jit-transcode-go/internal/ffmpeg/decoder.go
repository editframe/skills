package ffmpeg

/*
#cgo pkg-config: libavcodec libavutil
#include "types.h"
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
#include <libavutil/channel_layout.h>
#include <libavutil/error.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    enum AVCodecID codec_id;
    enum AVMediaType media_type;
    int width;
    int height;
    enum AVPixelFormat pix_fmt;
    int channels;
    int sample_rate;
    enum AVSampleFormat sample_fmt;
    AVRational time_base;
    uint8_t *extradata;
    int extradata_size;
} DecoderOptions;

typedef struct {
    int64_t pts;
    int64_t dts;
    int width;
    int height;
    enum AVPixelFormat pix_fmt;
    int channels;
    int sample_rate;
    int nb_samples;
    enum AVSampleFormat sample_fmt;
    enum AVMediaType media_type;
    AVFrame *frame;
} FrameInfo;

DecoderHandle* create_decoder(DecoderOptions opts, char **error_msg) {
    DecoderHandle *handle = (DecoderHandle*)calloc(1, sizeof(DecoderHandle));
    if (!handle) {
        *error_msg = strdup("Failed to allocate decoder handle");
        return NULL;
    }

    handle->codec = avcodec_find_decoder(opts.codec_id);
    if (!handle->codec) {
        *error_msg = strdup("Decoder not found");
        free(handle);
        return NULL;
    }

    handle->codec_ctx = avcodec_alloc_context3(handle->codec);
    if (!handle->codec_ctx) {
        *error_msg = strdup("Failed to allocate codec context");
        free(handle);
        return NULL;
    }

    if (opts.width > 0 && opts.height > 0) {
        handle->codec_ctx->width = opts.width;
        handle->codec_ctx->height = opts.height;
    }

    if (opts.pix_fmt != AV_PIX_FMT_NONE) {
        handle->codec_ctx->pix_fmt = opts.pix_fmt;
    }

    if (opts.channels > 0) {
        av_channel_layout_default(&handle->codec_ctx->ch_layout, opts.channels);
    }

    if (opts.sample_rate > 0) {
        handle->codec_ctx->sample_rate = opts.sample_rate;
    }

    if (opts.sample_fmt != AV_SAMPLE_FMT_NONE) {
        handle->codec_ctx->sample_fmt = opts.sample_fmt;
    }

    if (opts.extradata && opts.extradata_size > 0) {
        handle->codec_ctx->extradata = av_malloc(opts.extradata_size + AV_INPUT_BUFFER_PADDING_SIZE);
        if (!handle->codec_ctx->extradata) {
            *error_msg = strdup("Failed to allocate extradata");
            avcodec_free_context(&handle->codec_ctx);
            free(handle);
            return NULL;
        }
        memcpy(handle->codec_ctx->extradata, opts.extradata, opts.extradata_size);
        memset(handle->codec_ctx->extradata + opts.extradata_size, 0, AV_INPUT_BUFFER_PADDING_SIZE);
        handle->codec_ctx->extradata_size = opts.extradata_size;
    }

    if (opts.time_base.den > 0) {
        handle->codec_ctx->time_base = opts.time_base;
    } else if (opts.media_type == AVMEDIA_TYPE_AUDIO) {
        handle->codec_ctx->time_base = (AVRational){1, opts.sample_rate > 0 ? opts.sample_rate : 48000};
    } else if (opts.media_type == AVMEDIA_TYPE_VIDEO) {
        handle->codec_ctx->time_base = (AVRational){1, 90000};
    }

    int ret = avcodec_open2(handle->codec_ctx, handle->codec, NULL);
    if (ret < 0) {
        char err_buf[128];
        av_strerror(ret, err_buf, sizeof(err_buf));
        *error_msg = strdup(err_buf);
        if (handle->codec_ctx->extradata) {
            av_free(handle->codec_ctx->extradata);
        }
        avcodec_free_context(&handle->codec_ctx);
        free(handle);
        return NULL;
    }

    handle->frame = av_frame_alloc();
    if (!handle->frame) {
        *error_msg = strdup("Failed to allocate frame");
        avcodec_free_context(&handle->codec_ctx);
        free(handle);
        return NULL;
    }

    handle->next_pts = 0;

    return handle;
}

int decode_packet(DecoderHandle *handle, AVPacket *pkt, FrameInfo **out_frames, int *out_count) {
    if (!handle || !handle->codec_ctx) {
        return -1;
    }

    *out_frames = NULL;
    *out_count = 0;

    int ret = avcodec_send_packet(handle->codec_ctx, pkt);
    if (ret < 0 && ret != AVERROR(EAGAIN)) {
        return ret;
    }

    int capacity = 10;
    FrameInfo *frames = (FrameInfo*)calloc(capacity, sizeof(FrameInfo));
    int count = 0;

    while (1) {
        ret = avcodec_receive_frame(handle->codec_ctx, handle->frame);
        if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) {
            break;
        } else if (ret < 0) {
            free(frames);
            return ret;
        }

        if (count >= capacity) {
            capacity *= 2;
            FrameInfo *new_frames = (FrameInfo*)realloc(frames, capacity * sizeof(FrameInfo));
            if (!new_frames) {
                free(frames);
                return AVERROR(ENOMEM);
            }
            frames = new_frames;
        }

        AVFrame *frame_copy = av_frame_clone(handle->frame);
        if (!frame_copy) {
            free(frames);
            return AVERROR(ENOMEM);
        }

        FrameInfo *info = &frames[count];
        info->pts = handle->frame->pts != AV_NOPTS_VALUE ? handle->frame->pts : handle->next_pts++;
        info->dts = handle->frame->pkt_dts;
        info->media_type = handle->codec_ctx->codec_type;
        info->frame = frame_copy;

        if (handle->codec_ctx->codec_type == AVMEDIA_TYPE_VIDEO) {
            info->width = handle->frame->width;
            info->height = handle->frame->height;
            info->pix_fmt = handle->frame->format;
        } else if (handle->codec_ctx->codec_type == AVMEDIA_TYPE_AUDIO) {
            info->channels = handle->frame->ch_layout.nb_channels;
            info->sample_rate = handle->frame->sample_rate;
            info->nb_samples = handle->frame->nb_samples;
            info->sample_fmt = handle->frame->format;
        }

        count++;
        av_frame_unref(handle->frame);
    }

    *out_frames = frames;
    *out_count = count;

    return 0;
}

int flush_decoder(DecoderHandle *handle, FrameInfo **out_frames, int *out_count) {
    return decode_packet(handle, NULL, out_frames, out_count);
}

void free_decoder(DecoderHandle *handle) {
    if (!handle) return;

    if (handle->frame) {
        av_frame_free(&handle->frame);
        handle->frame = NULL;
    }

    if (handle->codec_ctx) {
        avcodec_free_context(&handle->codec_ctx);
        handle->codec_ctx = NULL;
    }

    free(handle);
}

void free_frame_info_array(FrameInfo *frames, int count) {
    if (!frames) return;

    for (int i = 0; i < count; i++) {
        if (frames[i].frame) {
            av_frame_free(&frames[i].frame);
        }
    }

    free(frames);
}
*/
import "C"
import (
	"fmt"
	"unsafe"
)

type Decoder struct {
	handle *C.DecoderHandle
}

type Frame struct {
	PTS        int64
	DTS        int64
	Width      int
	Height     int
	Channels   int
	SampleRate int
	NBSamples  int
	MediaType  string
	cFrame     *C.AVFrame
}

type DecoderOptions struct {
	CodecID      int
	MediaType    string
	Width        int
	Height       int
	PixelFormat  int
	Channels     int
	SampleRate   int
	SampleFormat int
	TimeBaseNum  int
	TimeBaseDen  int
	Extradata    []byte
}

func CreateDecoder(opts DecoderOptions) (*Decoder, error) {
	cOpts := C.DecoderOptions{}
	cOpts.codec_id = C.enum_AVCodecID(opts.CodecID)

	switch opts.MediaType {
	case "video":
		cOpts.media_type = C.AVMEDIA_TYPE_VIDEO
	case "audio":
		cOpts.media_type = C.AVMEDIA_TYPE_AUDIO
	default:
		cOpts.media_type = C.AVMEDIA_TYPE_UNKNOWN
	}

	cOpts.width = C.int(opts.Width)
	cOpts.height = C.int(opts.Height)
	cOpts.pix_fmt = C.enum_AVPixelFormat(opts.PixelFormat)
	cOpts.channels = C.int(opts.Channels)
	cOpts.sample_rate = C.int(opts.SampleRate)
	cOpts.sample_fmt = C.enum_AVSampleFormat(opts.SampleFormat)
	cOpts.time_base = C.AVRational{num: C.int(opts.TimeBaseNum), den: C.int(opts.TimeBaseDen)}

	if len(opts.Extradata) > 0 {
		cOpts.extradata = (*C.uint8_t)(C.CBytes(opts.Extradata))
		cOpts.extradata_size = C.int(len(opts.Extradata))
		defer C.free(unsafe.Pointer(cOpts.extradata))
	}

	var errorMsg *C.char
	handle := C.create_decoder(cOpts, &errorMsg)

	if handle == nil {
		if errorMsg != nil {
			err := C.GoString(errorMsg)
			C.free(unsafe.Pointer(errorMsg))
			return nil, fmt.Errorf("failed to create decoder: %s", err)
		}
		return nil, fmt.Errorf("failed to create decoder: unknown error")
	}

	return &Decoder{handle: handle}, nil
}

func (d *Decoder) Decode(packetData []byte, pts, dts int64) ([]Frame, error) {
	if d.handle == nil {
		return nil, fmt.Errorf("decoder not initialized")
	}

	pkt := C.av_packet_alloc()
	if pkt == nil {
		return nil, fmt.Errorf("failed to allocate packet")
	}
	defer C.av_packet_free(&pkt)

	if len(packetData) > 0 {
		pkt.data = (*C.uint8_t)(C.CBytes(packetData))
		pkt.size = C.int(len(packetData))
		defer C.free(unsafe.Pointer(pkt.data))

		pkt.pts = C.int64_t(pts)
		pkt.dts = C.int64_t(dts)
	}

	var cFrames *C.FrameInfo
	var count C.int

	ret := C.decode_packet(d.handle, pkt, &cFrames, &count)
	if ret < 0 {
		return nil, fmt.Errorf("decode failed: %d", ret)
	}

	defer C.free_frame_info_array(cFrames, count)

	if count == 0 {
		return []Frame{}, nil
	}

	frameArray := (*[1 << 30]C.FrameInfo)(unsafe.Pointer(cFrames))[:count:count]
	frames := make([]Frame, int(count))

	for i := 0; i < int(count); i++ {
		cFrame := frameArray[i]

		mediaType := "unknown"
		if cFrame.media_type == C.AVMEDIA_TYPE_VIDEO {
			mediaType = "video"
		} else if cFrame.media_type == C.AVMEDIA_TYPE_AUDIO {
			mediaType = "audio"
		}

		frames[i] = Frame{
			PTS:        int64(cFrame.pts),
			DTS:        int64(cFrame.dts),
			Width:      int(cFrame.width),
			Height:     int(cFrame.height),
			Channels:   int(cFrame.channels),
			SampleRate: int(cFrame.sample_rate),
			NBSamples:  int(cFrame.nb_samples),
			MediaType:  mediaType,
			cFrame:     C.av_frame_clone(cFrame.frame),
		}
	}

	return frames, nil
}

func (d *Decoder) Flush() ([]Frame, error) {
	if d.handle == nil {
		return nil, fmt.Errorf("decoder not initialized")
	}

	var cFrames *C.FrameInfo
	var count C.int

	ret := C.flush_decoder(d.handle, &cFrames, &count)
	if ret < 0 {
		return nil, fmt.Errorf("flush failed: %d", ret)
	}

	defer C.free_frame_info_array(cFrames, count)

	if count == 0 {
		return []Frame{}, nil
	}

	frameArray := (*[1 << 30]C.FrameInfo)(unsafe.Pointer(cFrames))[:count:count]
	frames := make([]Frame, int(count))

	for i := 0; i < int(count); i++ {
		cFrame := frameArray[i]

		mediaType := "unknown"
		if cFrame.media_type == C.AVMEDIA_TYPE_VIDEO {
			mediaType = "video"
		} else if cFrame.media_type == C.AVMEDIA_TYPE_AUDIO {
			mediaType = "audio"
		}

		frames[i] = Frame{
			PTS:        int64(cFrame.pts),
			DTS:        int64(cFrame.dts),
			Width:      int(cFrame.width),
			Height:     int(cFrame.height),
			Channels:   int(cFrame.channels),
			SampleRate: int(cFrame.sample_rate),
			NBSamples:  int(cFrame.nb_samples),
			MediaType:  mediaType,
			cFrame:     C.av_frame_clone(cFrame.frame),
		}
	}

	return frames, nil
}

func (d *Decoder) Close() {
	if d.handle != nil {
		C.free_decoder(d.handle)
		d.handle = nil
	}
}

func (f *Frame) Close() {
	if f.cFrame != nil {
		C.av_frame_free(&f.cFrame)
		f.cFrame = nil
	}
}
