package ffmpeg

/*
#cgo pkg-config: libavformat libavcodec libavutil
#include "types.h"
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/opt.h>
#include <libavutil/mathematics.h>
#include <stdlib.h>
#include <string.h>

static int write_packet_callback(void *opaque, uint8_t *buf, int buf_size) {
    AVIOBuffer *avio_buf = (AVIOBuffer *)opaque;
    
    if (avio_buf->position + buf_size > avio_buf->capacity) {
        size_t new_capacity = (avio_buf->position + buf_size) * 2;
        if (new_capacity < 1024 * 1024) {
            new_capacity = 1024 * 1024;
        }
        
        uint8_t *new_buffer = (uint8_t*)realloc(avio_buf->buffer, new_capacity);
        if (!new_buffer) {
            return AVERROR(ENOMEM);
        }
        
        avio_buf->buffer = new_buffer;
        avio_buf->capacity = new_capacity;
    }
    
    memcpy(avio_buf->buffer + avio_buf->position, buf, buf_size);
    avio_buf->position += buf_size;
    
    if (avio_buf->position > avio_buf->size) {
        avio_buf->size = avio_buf->position;
    }
    
    return buf_size;
}

static int64_t seek_callback(void *opaque, int64_t offset, int whence) {
    AVIOBuffer *avio_buf = (AVIOBuffer *)opaque;
    
    int64_t new_pos;
    switch (whence) {
        case SEEK_SET:
            new_pos = offset;
            break;
        case SEEK_CUR:
            new_pos = avio_buf->position + offset;
            break;
        case SEEK_END:
            new_pos = avio_buf->size + offset;
            break;
        case AVSEEK_SIZE:
            return avio_buf->size;
        default:
            return -1;
    }
    
    if (new_pos < 0) {
        return -1;
    }
    
    if (new_pos > avio_buf->capacity) {
        size_t new_capacity = new_pos * 2;
        uint8_t *new_buffer = (uint8_t*)realloc(avio_buf->buffer, new_capacity);
        if (!new_buffer) {
            return -1;
        }
        avio_buf->buffer = new_buffer;
        avio_buf->capacity = new_capacity;
    }
    
    avio_buf->position = new_pos;
    return new_pos;
}

typedef struct {
    const char *format;
    const char *mov_flags;
    int64_t fragment_duration;
} MuxerOptions;

MuxerHandle* create_muxer(MuxerOptions opts, char **error_msg) {
    MuxerHandle *handle = (MuxerHandle*)calloc(1, sizeof(MuxerHandle));
    if (!handle) {
        *error_msg = strdup("Failed to allocate muxer handle");
        return NULL;
    }
    
    handle->video_stream_index = -1;
    handle->audio_stream_index = -1;
    handle->last_video_dts = AV_NOPTS_VALUE;
    handle->last_audio_dts = AV_NOPTS_VALUE;
    handle->video_frame_count = 0;
    handle->audio_frame_count = 0;
    handle->video_frame_rate = (AVRational){0, 1};
    
    handle->avio_buf = (AVIOBuffer*)calloc(1, sizeof(AVIOBuffer));
    if (!handle->avio_buf) {
        *error_msg = strdup("Failed to allocate AVIO buffer");
        free(handle);
        return NULL;
    }
    
    handle->avio_buf->capacity = 1024 * 1024;
    handle->avio_buf->buffer = (uint8_t*)malloc(handle->avio_buf->capacity);
    if (!handle->avio_buf->buffer) {
        *error_msg = strdup("Failed to allocate buffer");
        free(handle->avio_buf);
        free(handle);
        return NULL;
    }
    
    const int avio_buffer_size = 4096;
    uint8_t *avio_buffer = (uint8_t*)av_malloc(avio_buffer_size);
    if (!avio_buffer) {
        *error_msg = strdup("Failed to allocate AVIO buffer");
        free(handle->avio_buf->buffer);
        free(handle->avio_buf);
        free(handle);
        return NULL;
    }
    
    handle->avio_ctx = avio_alloc_context(
        avio_buffer,
        avio_buffer_size,
        1,
        handle->avio_buf,
        NULL,
        write_packet_callback,
        seek_callback
    );
    
    if (!handle->avio_ctx) {
        *error_msg = strdup("Failed to create AVIO context");
        av_free(avio_buffer);
        free(handle->avio_buf->buffer);
        free(handle->avio_buf);
        free(handle);
        return NULL;
    }
    
    int ret = avformat_alloc_output_context2(&handle->fmt_ctx, NULL, opts.format, NULL);
    if (ret < 0) {
        char err_buf[128];
        av_strerror(ret, err_buf, sizeof(err_buf));
        *error_msg = strdup(err_buf);
        avio_context_free(&handle->avio_ctx);
        free(handle->avio_buf->buffer);
        free(handle->avio_buf);
        free(handle);
        return NULL;
    }
    
    handle->fmt_ctx->pb = handle->avio_ctx;
    handle->fmt_ctx->flags |= AVFMT_FLAG_CUSTOM_IO;
    
    if (opts.mov_flags) {
        av_dict_set(&handle->fmt_ctx->metadata, "movflags", opts.mov_flags, 0);
    }
    
    if (opts.fragment_duration > 0) {
        char frag_dur[32];
        snprintf(frag_dur, sizeof(frag_dur), "%ld", (long)opts.fragment_duration);
        av_dict_set(&handle->fmt_ctx->metadata, "frag_duration", frag_dur, 0);
    }
    
    return handle;
}

int add_video_stream_to_muxer(MuxerHandle *handle, EncoderHandle *encoder, AVRational time_base, AVRational frame_rate) {
    if (!handle || !encoder || !handle->fmt_ctx) {
        return -1;
    }
    
    AVStream *stream = avformat_new_stream(handle->fmt_ctx, NULL);
    if (!stream) {
        return AVERROR(ENOMEM);
    }
    
    handle->video_stream_index = stream->index;
    
    int ret = avcodec_parameters_from_context(stream->codecpar, encoder->codec_ctx);
    if (ret < 0) {
        return ret;
    }
    
    if (encoder->codec_ctx->extradata && encoder->codec_ctx->extradata_size > 0) {
        if (stream->codecpar->extradata) {
            av_free(stream->codecpar->extradata);
        }
        stream->codecpar->extradata = av_malloc(encoder->codec_ctx->extradata_size + AV_INPUT_BUFFER_PADDING_SIZE);
        if (stream->codecpar->extradata) {
            memcpy(stream->codecpar->extradata, encoder->codec_ctx->extradata, encoder->codec_ctx->extradata_size);
            memset(stream->codecpar->extradata + encoder->codec_ctx->extradata_size, 0, AV_INPUT_BUFFER_PADDING_SIZE);
            stream->codecpar->extradata_size = encoder->codec_ctx->extradata_size;
        }
    }
    
    stream->time_base = time_base;
    stream->avg_frame_rate = frame_rate;
    stream->r_frame_rate = frame_rate;
    
    handle->video_frame_rate = frame_rate;
    
    return 0;
}

int add_audio_stream_to_muxer(MuxerHandle *handle, EncoderHandle *encoder, AVRational time_base) {
    if (!handle || !encoder || !handle->fmt_ctx) {
        return -1;
    }
    
    AVStream *stream = avformat_new_stream(handle->fmt_ctx, NULL);
    if (!stream) {
        return AVERROR(ENOMEM);
    }
    
    handle->audio_stream_index = stream->index;
    
    int ret = avcodec_parameters_from_context(stream->codecpar, encoder->codec_ctx);
    if (ret < 0) {
        return ret;
    }
    
    stream->time_base = time_base;
    
    return 0;
}

int write_muxer_header(MuxerHandle *handle, const char *mov_flags) {
    if (!handle || !handle->fmt_ctx) {
        return -1;
    }
    
    AVDictionary *opts = NULL;
    
    if (mov_flags) {
        av_dict_set(&opts, "movflags", mov_flags, 0);
    }
    
    int ret = avformat_write_header(handle->fmt_ctx, &opts);
    av_dict_free(&opts);
    
    return ret;
}

int write_muxer_packet(MuxerHandle *handle, AVPacket *pkt, int stream_index, AVRational source_time_base) {
    if (!handle || !handle->fmt_ctx || !pkt) {
        return -1;
    }
    
    AVPacket *pkt_copy = av_packet_clone(pkt);
    if (!pkt_copy) {
        return AVERROR(ENOMEM);
    }
    
    pkt_copy->stream_index = stream_index;
    
    AVRational dst_time_base = handle->fmt_ctx->streams[stream_index]->time_base;
    
    if (stream_index == handle->video_stream_index && handle->video_frame_rate.num > 0) {
        int64_t frame_duration_ticks = av_rescale_q(1, av_inv_q(handle->video_frame_rate), dst_time_base);
        
        pkt_copy->dts = handle->video_frame_count * frame_duration_ticks;
        pkt_copy->pts = pkt_copy->dts + (2 * frame_duration_ticks);
        pkt_copy->duration = frame_duration_ticks;
        
        handle->video_frame_count++;
        handle->last_video_dts = pkt_copy->dts;
    } else {
        pkt_copy->pts = av_rescale_q(pkt->pts, source_time_base, dst_time_base);
        pkt_copy->dts = av_rescale_q(pkt->dts, source_time_base, dst_time_base);
        pkt_copy->duration = av_rescale_q(pkt->duration, source_time_base, dst_time_base);
        
        int64_t *last_dts = (stream_index == handle->video_stream_index) ? &handle->last_video_dts : &handle->last_audio_dts;
        
        if (*last_dts != AV_NOPTS_VALUE && pkt_copy->dts != AV_NOPTS_VALUE) {
            if (pkt_copy->dts <= *last_dts) {
                int64_t increment = (pkt_copy->duration > 0) ? pkt_copy->duration : 1;
                pkt_copy->dts = *last_dts + increment;
            }
        }
        
        if (pkt_copy->pts != AV_NOPTS_VALUE && pkt_copy->dts != AV_NOPTS_VALUE) {
            if (pkt_copy->pts < pkt_copy->dts) {
                pkt_copy->pts = pkt_copy->dts;
            }
        }
        
        if (pkt_copy->dts != AV_NOPTS_VALUE) {
            *last_dts = pkt_copy->dts;
        }
    }
    
    int ret = av_write_frame(handle->fmt_ctx, pkt_copy);
    
    av_packet_free(&pkt_copy);
    
    return ret;
}

int finalize_muxer(MuxerHandle *handle, uint8_t **out_data, size_t *out_size) {
    if (!handle || !handle->fmt_ctx) {
        return -1;
    }
    
    int ret = av_write_trailer(handle->fmt_ctx);
    if (ret < 0) {
        return ret;
    }
    
    avio_flush(handle->avio_ctx);
    
    *out_data = handle->avio_buf->buffer;
    *out_size = handle->avio_buf->size;
    
    return 0;
}

void free_muxer(MuxerHandle *handle) {
    if (!handle) return;
    
    if (handle->fmt_ctx) {
        handle->fmt_ctx->pb = NULL;
        avformat_free_context(handle->fmt_ctx);
    }
    
    if (handle->avio_ctx) {
        if (handle->avio_ctx->buffer) {
            av_free(handle->avio_ctx->buffer);
        }
        avio_context_free(&handle->avio_ctx);
    }
    
    if (handle->avio_buf) {
        if (handle->avio_buf->buffer) {
            free(handle->avio_buf->buffer);
        }
        free(handle->avio_buf);
    }
    
    free(handle);
}
*/
import "C"
import (
	"fmt"
	"unsafe"
)

type Muxer struct {
	handle *C.MuxerHandle
	output []byte
}

type MuxerOptions struct {
	Format            string
	MovFlags          string
	FragmentDuration  int64
}

func CreateMuxer(opts MuxerOptions) (*Muxer, error) {
	cOpts := C.MuxerOptions{}
	
	cFormat := C.CString(opts.Format)
	defer C.free(unsafe.Pointer(cFormat))
	cOpts.format = cFormat
	
	if opts.MovFlags != "" {
		cMovFlags := C.CString(opts.MovFlags)
		defer C.free(unsafe.Pointer(cMovFlags))
		cOpts.mov_flags = cMovFlags
	}
	
	cOpts.fragment_duration = C.int64_t(opts.FragmentDuration)
	
	var errorMsg *C.char
	handle := C.create_muxer(cOpts, &errorMsg)
	
	if handle == nil {
		if errorMsg != nil {
			err := C.GoString(errorMsg)
			C.free(unsafe.Pointer(errorMsg))
			return nil, fmt.Errorf("failed to create muxer: %s", err)
		}
		return nil, fmt.Errorf("failed to create muxer: unknown error")
	}
	
	return &Muxer{handle: handle}, nil
}

func (m *Muxer) AddVideoStream(encoder *Encoder, timeBaseNum, timeBaseDen, frameRateNum, frameRateDen int) error {
	if m.handle == nil {
		return fmt.Errorf("muxer not initialized")
	}
	
	if encoder == nil || encoder.handle == nil {
		return fmt.Errorf("invalid encoder")
	}
	
	timeBase := C.AVRational{num: C.int(timeBaseNum), den: C.int(timeBaseDen)}
	frameRate := C.AVRational{num: C.int(frameRateNum), den: C.int(frameRateDen)}
	
	ret := C.add_video_stream_to_muxer(m.handle, encoder.handle, timeBase, frameRate)
	if ret < 0 {
		return fmt.Errorf("failed to add video stream: %d", ret)
	}
	
	return nil
}

func (m *Muxer) AddAudioStream(encoder *Encoder, timeBaseNum, timeBaseDen int) error {
	if m.handle == nil {
		return fmt.Errorf("muxer not initialized")
	}
	
	if encoder == nil || encoder.handle == nil {
		return fmt.Errorf("invalid encoder")
	}
	
	timeBase := C.AVRational{num: C.int(timeBaseNum), den: C.int(timeBaseDen)}
	
	ret := C.add_audio_stream_to_muxer(m.handle, encoder.handle, timeBase)
	if ret < 0 {
		return fmt.Errorf("failed to add audio stream: %d", ret)
	}
	
	return nil
}

func (m *Muxer) WriteHeader(movFlags string) error {
	if m.handle == nil {
		return fmt.Errorf("muxer not initialized")
	}
	
	var cMovFlags *C.char
	if movFlags != "" {
		cMovFlags = C.CString(movFlags)
		defer C.free(unsafe.Pointer(cMovFlags))
	}
	
	ret := C.write_muxer_header(m.handle, cMovFlags)
	if ret < 0 {
		return fmt.Errorf("failed to write header: %d", ret)
	}
	
	return nil
}

func (m *Muxer) WritePacket(packet *Packet, streamIndex int, sourceTimeBaseNum, sourceTimeBaseDen int) error {
	if m.handle == nil {
		return fmt.Errorf("muxer not initialized")
	}
	
	if packet == nil || packet.cPacket == nil {
		return fmt.Errorf("invalid packet")
	}
	
	sourceTimeBase := C.AVRational{num: C.int(sourceTimeBaseNum), den: C.int(sourceTimeBaseDen)}
	
	ret := C.write_muxer_packet(m.handle, packet.cPacket, C.int(streamIndex), sourceTimeBase)
	if ret < 0 {
		return fmt.Errorf("failed to write packet: %d", ret)
	}
	
	return nil
}

func (m *Muxer) Finalize() ([]byte, error) {
	if m.handle == nil {
		return nil, fmt.Errorf("muxer not initialized")
	}
	
	var cData *C.uint8_t
	var cSize C.size_t
	
	ret := C.finalize_muxer(m.handle, &cData, &cSize)
	if ret < 0 {
		return nil, fmt.Errorf("failed to finalize: %d", ret)
	}
	
	m.output = C.GoBytes(unsafe.Pointer(cData), C.int(cSize))
	
	return m.output, nil
}

func (m *Muxer) Close() {
	if m.handle != nil {
		C.free_muxer(m.handle)
		m.handle = nil
	}
}

