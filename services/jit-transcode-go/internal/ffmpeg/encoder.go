package ffmpeg

/*
#cgo pkg-config: libavcodec libavutil
#include "types.h"
#include <libavcodec/avcodec.h>
#include <libavutil/opt.h>
#include <libavutil/channel_layout.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    enum AVMediaType media_type;
    enum AVCodecID codec_id;
    
    int width;
    int height;
    enum AVPixelFormat pix_fmt;
    AVRational frame_rate;
    AVRational time_base;
    int64_t video_bitrate;
    int gop_size;
    int max_b_frames;
    const char *preset;
    const char *profile;
    
    int channels;
    int sample_rate;
    enum AVSampleFormat sample_fmt;
    int64_t audio_bitrate;
} EncoderOptions;

EncoderHandle* create_encoder(EncoderOptions opts, char **error_msg) {
    EncoderHandle *handle = (EncoderHandle*)calloc(1, sizeof(EncoderHandle));
    if (!handle) {
        *error_msg = strdup("Failed to allocate encoder handle");
        return NULL;
    }
    
    handle->codec = avcodec_find_encoder(opts.codec_id);
    if (!handle->codec) {
        *error_msg = strdup("Encoder not found");
        free(handle);
        return NULL;
    }
    
    handle->codec_ctx = avcodec_alloc_context3(handle->codec);
    if (!handle->codec_ctx) {
        *error_msg = strdup("Failed to allocate codec context");
        free(handle);
        return NULL;
    }
    
    if (opts.media_type == AVMEDIA_TYPE_VIDEO) {
        if (opts.width <= 0 || opts.height <= 0) {
            *error_msg = strdup("Invalid video dimensions");
            avcodec_free_context(&handle->codec_ctx);
            free(handle);
            return NULL;
        }
        
        handle->codec_ctx->codec_type = AVMEDIA_TYPE_VIDEO;
        handle->codec_ctx->width = opts.width;
        handle->codec_ctx->height = opts.height;
        handle->codec_ctx->pix_fmt = opts.pix_fmt;
        handle->codec_ctx->framerate = opts.frame_rate;
        handle->codec_ctx->time_base = opts.time_base;
        handle->codec_ctx->bit_rate = opts.video_bitrate;
        handle->codec_ctx->gop_size = opts.gop_size;
        handle->codec_ctx->max_b_frames = opts.max_b_frames;
    } else if (opts.media_type == AVMEDIA_TYPE_AUDIO) {
        if (opts.channels <= 0 || opts.sample_rate <= 0) {
            *error_msg = strdup("Invalid audio parameters");
            avcodec_free_context(&handle->codec_ctx);
            free(handle);
            return NULL;
        }
        
        handle->codec_ctx->codec_type = AVMEDIA_TYPE_AUDIO;
        handle->codec_ctx->sample_rate = opts.sample_rate;
        handle->codec_ctx->sample_fmt = opts.sample_fmt;
        handle->codec_ctx->time_base = (AVRational){1, opts.sample_rate};
        handle->codec_ctx->bit_rate = opts.audio_bitrate;
        
        av_channel_layout_default(&handle->codec_ctx->ch_layout, opts.channels);
        
        if (opts.codec_id == AV_CODEC_ID_AAC) {
            handle->codec_ctx->profile = FF_PROFILE_AAC_LOW;
            av_opt_set_int(handle->codec_ctx->priv_data, "aac_pns", 0, 0);
        }
        
        if (opts.preset) {
            av_opt_set(handle->codec_ctx->priv_data, "preset", opts.preset, 0);
        }
        
        if (opts.profile) {
            if (strcmp(opts.profile, "high") == 0) {
                handle->codec_ctx->profile = FF_PROFILE_H264_HIGH;
            } else if (strcmp(opts.profile, "main") == 0) {
                handle->codec_ctx->profile = FF_PROFILE_H264_MAIN;
            } else if (strcmp(opts.profile, "baseline") == 0) {
                handle->codec_ctx->profile = FF_PROFILE_H264_BASELINE;
            }
            av_opt_set(handle->codec_ctx->priv_data, "profile", opts.profile, 0);
        }
    }
    
    handle->codec_ctx->flags |= AV_CODEC_FLAG_GLOBAL_HEADER;
    
    AVDictionary *codec_opts = NULL;
    
    int ret = avcodec_open2(handle->codec_ctx, handle->codec, &codec_opts);
    av_dict_free(&codec_opts);
    if (ret < 0) {
        char err_buf[128];
        av_strerror(ret, err_buf, sizeof(err_buf));
        *error_msg = strdup(err_buf);
        avcodec_free_context(&handle->codec_ctx);
        free(handle);
        return NULL;
    }
    
    handle->temp_pkt = av_packet_alloc();
    if (!handle->temp_pkt) {
        *error_msg = strdup("Failed to allocate packet");
        avcodec_free_context(&handle->codec_ctx);
        free(handle);
        return NULL;
    }
    
    return handle;
}

int encode_frame(EncoderHandle *handle, AVFrame *frame, AVPacket ***out_packets, int *out_count) {
    if (!handle || !handle->codec_ctx) {
        return -1;
    }
    
    *out_packets = NULL;
    *out_count = 0;
    
    int ret = avcodec_send_frame(handle->codec_ctx, frame);
    if (ret < 0) {
        return ret;
    }
    
    int capacity = 10;
    AVPacket **packets = (AVPacket**)calloc(capacity, sizeof(AVPacket*));
    int count = 0;
    
    while (1) {
        AVPacket *pkt = av_packet_alloc();
        if (!pkt) {
            for (int i = 0; i < count; i++) {
                av_packet_free(&packets[i]);
            }
            free(packets);
            return AVERROR(ENOMEM);
        }
        
        ret = avcodec_receive_packet(handle->codec_ctx, pkt);
        if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) {
            av_packet_free(&pkt);
            break;
        } else if (ret < 0) {
            av_packet_free(&pkt);
            for (int i = 0; i < count; i++) {
                av_packet_free(&packets[i]);
            }
            free(packets);
            return ret;
        }
        
        if (count >= capacity) {
            capacity *= 2;
            AVPacket **new_packets = (AVPacket**)realloc(packets, capacity * sizeof(AVPacket*));
            if (!new_packets) {
                av_packet_free(&pkt);
                for (int i = 0; i < count; i++) {
                    av_packet_free(&packets[i]);
                }
                free(packets);
                return AVERROR(ENOMEM);
            }
            packets = new_packets;
        }
        
        packets[count] = pkt;
        count++;
    }
    
    *out_packets = packets;
    *out_count = count;
    
    return 0;
}

int flush_encoder(EncoderHandle *handle, AVPacket ***out_packets, int *out_count) {
    return encode_frame(handle, NULL, out_packets, out_count);
}

void get_codec_parameters(EncoderHandle *handle, uint8_t **out_extradata, int *out_extradata_size) {
    if (!handle || !handle->codec_ctx) {
        *out_extradata = NULL;
        *out_extradata_size = 0;
        return;
    }
    
    *out_extradata = handle->codec_ctx->extradata;
    *out_extradata_size = handle->codec_ctx->extradata_size;
}

void free_encoder(EncoderHandle *handle) {
    if (!handle) return;
    
    if (handle->temp_pkt) {
        av_packet_free(&handle->temp_pkt);
    }
    
    if (handle->codec_ctx) {
        avcodec_free_context(&handle->codec_ctx);
    }
    
    free(handle);
}

void free_packet_array(AVPacket **packets, int count) {
    if (!packets) return;
    
    for (int i = 0; i < count; i++) {
        if (packets[i]) {
            av_packet_free(&packets[i]);
        }
    }
    
    free(packets);
}
*/
import "C"
import (
	"fmt"
	"unsafe"
)

type Encoder struct {
	handle *C.EncoderHandle
}

type Packet struct {
	Data      []byte
	PTS       int64
	DTS       int64
	Duration  int64
	IsKeyFrame bool
	cPacket   *C.AVPacket
}

type EncoderOptions struct {
	MediaType    string
	CodecID      int
	
	Width        int
	Height       int
	PixelFormat  int
	FrameRateNum int
	FrameRateDen int
	TimeBaseNum  int
	TimeBaseDen  int
	VideoBitrate int64
	GOPSize      int
	MaxBFrames   int
	Preset       string
	Profile      string
	
	Channels     int
	SampleRate   int
	SampleFormat int
	AudioBitrate int64
}

func CreateEncoder(opts EncoderOptions) (*Encoder, error) {
	cOpts := C.EncoderOptions{}
	cOpts.codec_id = C.enum_AVCodecID(opts.CodecID)
	
	switch opts.MediaType {
	case "video":
		cOpts.media_type = C.AVMEDIA_TYPE_VIDEO
	case "audio":
		cOpts.media_type = C.AVMEDIA_TYPE_AUDIO
	default:
		return nil, fmt.Errorf("invalid media type: %s", opts.MediaType)
	}
	
	cOpts.width = C.int(opts.Width)
	cOpts.height = C.int(opts.Height)
	cOpts.pix_fmt = C.enum_AVPixelFormat(opts.PixelFormat)
	cOpts.frame_rate = C.AVRational{num: C.int(opts.FrameRateNum), den: C.int(opts.FrameRateDen)}
	cOpts.time_base = C.AVRational{num: C.int(opts.TimeBaseNum), den: C.int(opts.TimeBaseDen)}
	cOpts.video_bitrate = C.int64_t(opts.VideoBitrate)
	cOpts.gop_size = C.int(opts.GOPSize)
	cOpts.max_b_frames = C.int(opts.MaxBFrames)
	
	if opts.Preset != "" {
		cOpts.preset = C.CString(opts.Preset)
		defer C.free(unsafe.Pointer(cOpts.preset))
	}
	
	if opts.Profile != "" {
		cOpts.profile = C.CString(opts.Profile)
		defer C.free(unsafe.Pointer(cOpts.profile))
	}
	
	cOpts.channels = C.int(opts.Channels)
	cOpts.sample_rate = C.int(opts.SampleRate)
	cOpts.sample_fmt = C.enum_AVSampleFormat(opts.SampleFormat)
	cOpts.audio_bitrate = C.int64_t(opts.AudioBitrate)
	
	var errorMsg *C.char
	handle := C.create_encoder(cOpts, &errorMsg)
	
	if handle == nil {
		if errorMsg != nil {
			err := C.GoString(errorMsg)
			C.free(unsafe.Pointer(errorMsg))
			return nil, fmt.Errorf("failed to create encoder: %s", err)
		}
		return nil, fmt.Errorf("failed to create encoder: unknown error")
	}
	
	return &Encoder{handle: handle}, nil
}

func (e *Encoder) Encode(frame *Frame) ([]Packet, error) {
	if e.handle == nil {
		return nil, fmt.Errorf("encoder not initialized")
	}
	
	var cFrame *C.AVFrame
	if frame != nil {
		cFrame = frame.cFrame
	}
	
	var cPackets **C.AVPacket
	var count C.int
	
	ret := C.encode_frame(e.handle, cFrame, &cPackets, &count)
	if ret < 0 {
		return nil, fmt.Errorf("encode failed: %d", ret)
	}
	
	defer C.free_packet_array(cPackets, count)
	
	if count == 0 {
		return []Packet{}, nil
	}
	
	packetArray := (*[1 << 30]*C.AVPacket)(unsafe.Pointer(cPackets))[:count:count]
	packets := make([]Packet, 0, int(count))
	
	for i := 0; i < int(count); i++ {
		cPkt := packetArray[i]
		if cPkt == nil {
			continue
		}
		
		data := C.GoBytes(unsafe.Pointer(cPkt.data), cPkt.size)
		
		clonedPkt := C.av_packet_clone(cPkt)
		if clonedPkt == nil {
			continue
		}
		
		packets = append(packets, Packet{
			Data:      data,
			PTS:       int64(cPkt.pts),
			DTS:       int64(cPkt.dts),
			Duration:  int64(cPkt.duration),
			IsKeyFrame: (cPkt.flags & C.AV_PKT_FLAG_KEY) != 0,
			cPacket:   clonedPkt,
		})
	}
	
	return packets, nil
}

func (e *Encoder) Flush() ([]Packet, error) {
	if e.handle == nil {
		return nil, fmt.Errorf("encoder not initialized")
	}
	
	var cPackets **C.AVPacket
	var count C.int
	
	ret := C.flush_encoder(e.handle, &cPackets, &count)
	if ret < 0 {
		return nil, fmt.Errorf("flush failed: %d", ret)
	}
	
	defer C.free_packet_array(cPackets, count)
	
	if count == 0 {
		return []Packet{}, nil
	}
	
	packetArray := (*[1 << 30]*C.AVPacket)(unsafe.Pointer(cPackets))[:count:count]
	packets := make([]Packet, 0, int(count))
	
	for i := 0; i < int(count); i++ {
		cPkt := packetArray[i]
		if cPkt == nil {
			continue
		}
		
		data := C.GoBytes(unsafe.Pointer(cPkt.data), cPkt.size)
		
		clonedPkt := C.av_packet_clone(cPkt)
		if clonedPkt == nil {
			continue
		}
		
		packets = append(packets, Packet{
			Data:      data,
			PTS:       int64(cPkt.pts),
			DTS:       int64(cPkt.dts),
			Duration:  int64(cPkt.duration),
			IsKeyFrame: (cPkt.flags & C.AV_PKT_FLAG_KEY) != 0,
			cPacket:   clonedPkt,
		})
	}
	
	return packets, nil
}

func (e *Encoder) GetCodecParameters() ([]byte, error) {
	if e.handle == nil {
		return nil, fmt.Errorf("encoder not initialized")
	}
	
	var extradata *C.uint8_t
	var extradataSize C.int
	
	C.get_codec_parameters(e.handle, &extradata, &extradataSize)
	
	if extradata == nil || extradataSize == 0 {
		return []byte{}, nil
	}
	
	return C.GoBytes(unsafe.Pointer(extradata), extradataSize), nil
}

func (e *Encoder) Close() {
	if e.handle != nil {
		C.free_encoder(e.handle)
		e.handle = nil
	}
}

func (p *Packet) Close() {
	if p.cPacket != nil {
		C.av_packet_free(&p.cPacket)
		p.cPacket = nil
	}
}

