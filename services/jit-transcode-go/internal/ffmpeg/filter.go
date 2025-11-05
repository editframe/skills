package ffmpeg

/*
#cgo pkg-config: libavfilter libavutil
#include "types.h"
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersrc.h>
#include <libavfilter/buffersink.h>
#include <libavutil/opt.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int input_width;
    int input_height;
    enum AVPixelFormat input_pix_fmt;
    AVRational input_time_base;
    AVRational input_frame_rate;
    
    int output_width;
    int output_height;
    enum AVPixelFormat output_pix_fmt;
    
    const char *filter_description;
} FilterOptions;

FilterHandle* create_filter(FilterOptions opts, char **error_msg) {
    FilterHandle *handle = (FilterHandle*)calloc(1, sizeof(FilterHandle));
    if (!handle) {
        *error_msg = strdup("Failed to allocate filter handle");
        return NULL;
    }
    
    handle->filter_graph = avfilter_graph_alloc();
    if (!handle->filter_graph) {
        *error_msg = strdup("Failed to allocate filter graph");
        free(handle);
        return NULL;
    }
    
    const AVFilter *buffersrc = avfilter_get_by_name("buffer");
    const AVFilter *buffersink = avfilter_get_by_name("buffersink");
    
    if (!buffersrc || !buffersink) {
        *error_msg = strdup("Failed to find buffer filters");
        avfilter_graph_free(&handle->filter_graph);
        free(handle);
        return NULL;
    }
    
    char args[512];
    snprintf(args, sizeof(args),
             "video_size=%dx%d:pix_fmt=%d:time_base=%d/%d:pixel_aspect=1/1",
             opts.input_width, opts.input_height, opts.input_pix_fmt,
             opts.input_time_base.num, opts.input_time_base.den);
    
    if (opts.input_frame_rate.den > 0) {
        char frame_rate_buf[64];
        snprintf(frame_rate_buf, sizeof(frame_rate_buf), ":frame_rate=%d/%d",
                 opts.input_frame_rate.num, opts.input_frame_rate.den);
        strncat(args, frame_rate_buf, sizeof(args) - strlen(args) - 1);
    }
    
    int ret = avfilter_graph_create_filter(&handle->buffersrc_ctx, buffersrc, "in",
                                           args, NULL, handle->filter_graph);
    if (ret < 0) {
        char err_buf[128];
        av_strerror(ret, err_buf, sizeof(err_buf));
        *error_msg = strdup(err_buf);
        avfilter_graph_free(&handle->filter_graph);
        free(handle);
        return NULL;
    }
    
    ret = avfilter_graph_create_filter(&handle->buffersink_ctx, buffersink, "out",
                                       NULL, NULL, handle->filter_graph);
    if (ret < 0) {
        char err_buf[128];
        av_strerror(ret, err_buf, sizeof(err_buf));
        *error_msg = strdup(err_buf);
        avfilter_graph_free(&handle->filter_graph);
        free(handle);
        return NULL;
    }
    
    enum AVPixelFormat pix_fmts[] = { opts.output_pix_fmt, AV_PIX_FMT_NONE };
    ret = av_opt_set_int_list(handle->buffersink_ctx, "pix_fmts", pix_fmts,
                              AV_PIX_FMT_NONE, AV_OPT_SEARCH_CHILDREN);
    if (ret < 0) {
        char err_buf[128];
        av_strerror(ret, err_buf, sizeof(err_buf));
        *error_msg = strdup(err_buf);
        avfilter_graph_free(&handle->filter_graph);
        free(handle);
        return NULL;
    }
    
    AVFilterInOut *outputs = avfilter_inout_alloc();
    AVFilterInOut *inputs = avfilter_inout_alloc();
    
    if (!outputs || !inputs) {
        *error_msg = strdup("Failed to allocate filter in/out");
        avfilter_inout_free(&outputs);
        avfilter_inout_free(&inputs);
        avfilter_graph_free(&handle->filter_graph);
        free(handle);
        return NULL;
    }
    
    outputs->name = av_strdup("in");
    outputs->filter_ctx = handle->buffersrc_ctx;
    outputs->pad_idx = 0;
    outputs->next = NULL;
    
    inputs->name = av_strdup("out");
    inputs->filter_ctx = handle->buffersink_ctx;
    inputs->pad_idx = 0;
    inputs->next = NULL;
    
    ret = avfilter_graph_parse_ptr(handle->filter_graph, opts.filter_description,
                                   &inputs, &outputs, NULL);
    
    avfilter_inout_free(&inputs);
    avfilter_inout_free(&outputs);
    
    if (ret < 0) {
        char err_buf[128];
        av_strerror(ret, err_buf, sizeof(err_buf));
        *error_msg = strdup(err_buf);
        avfilter_graph_free(&handle->filter_graph);
        free(handle);
        return NULL;
    }
    
    ret = avfilter_graph_config(handle->filter_graph, NULL);
    if (ret < 0) {
        char err_buf[128];
        av_strerror(ret, err_buf, sizeof(err_buf));
        *error_msg = strdup(err_buf);
        avfilter_graph_free(&handle->filter_graph);
        free(handle);
        return NULL;
    }
    
    return handle;
}

int filter_frame(FilterHandle *handle, AVFrame *input, AVFrame ***out_frames, int *out_count) {
    if (!handle || !handle->filter_graph) {
        return -1;
    }
    
    *out_frames = NULL;
    *out_count = 0;
    
    int ret = av_buffersrc_add_frame_flags(handle->buffersrc_ctx, input, AV_BUFFERSRC_FLAG_KEEP_REF);
    if (ret < 0) {
        return ret;
    }
    
    int capacity = 10;
    AVFrame **frames = (AVFrame**)calloc(capacity, sizeof(AVFrame*));
    int count = 0;
    
    while (1) {
        AVFrame *filtered_frame = av_frame_alloc();
        if (!filtered_frame) {
            for (int i = 0; i < count; i++) {
                av_frame_free(&frames[i]);
            }
            free(frames);
            return AVERROR(ENOMEM);
        }
        
        ret = av_buffersink_get_frame(handle->buffersink_ctx, filtered_frame);
        if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) {
            av_frame_free(&filtered_frame);
            break;
        } else if (ret < 0) {
            av_frame_free(&filtered_frame);
            for (int i = 0; i < count; i++) {
                av_frame_free(&frames[i]);
            }
            free(frames);
            return ret;
        }
        
        if (count >= capacity) {
            capacity *= 2;
            AVFrame **new_frames = (AVFrame**)realloc(frames, capacity * sizeof(AVFrame*));
            if (!new_frames) {
                av_frame_free(&filtered_frame);
                for (int i = 0; i < count; i++) {
                    av_frame_free(&frames[i]);
                }
                free(frames);
                return AVERROR(ENOMEM);
            }
            frames = new_frames;
        }
        
        frames[count] = filtered_frame;
        count++;
    }
    
    *out_frames = frames;
    *out_count = count;
    
    return 0;
}

void free_filter(FilterHandle *handle) {
    if (!handle) return;
    
    if (handle->filter_graph) {
        avfilter_graph_free(&handle->filter_graph);
    }
    
    free(handle);
}

void free_frame_array(AVFrame **frames, int count) {
    if (!frames) return;
    
    for (int i = 0; i < count; i++) {
        if (frames[i]) {
            av_frame_free(&frames[i]);
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

type Filter struct {
	handle *C.FilterHandle
}

type FilterOptions struct {
	InputWidth      int
	InputHeight     int
	InputPixelFormat int
	InputTimeBaseNum int
	InputTimeBaseDen int
	InputFrameRateNum int
	InputFrameRateDen int
	
	OutputWidth      int
	OutputHeight     int
	OutputPixelFormat int
	
	FilterDescription string
}

func CreateFilter(opts FilterOptions) (*Filter, error) {
	cOpts := C.FilterOptions{}
	cOpts.input_width = C.int(opts.InputWidth)
	cOpts.input_height = C.int(opts.InputHeight)
	cOpts.input_pix_fmt = C.enum_AVPixelFormat(opts.InputPixelFormat)
	cOpts.input_time_base = C.AVRational{num: C.int(opts.InputTimeBaseNum), den: C.int(opts.InputTimeBaseDen)}
	cOpts.input_frame_rate = C.AVRational{num: C.int(opts.InputFrameRateNum), den: C.int(opts.InputFrameRateDen)}
	
	cOpts.output_width = C.int(opts.OutputWidth)
	cOpts.output_height = C.int(opts.OutputHeight)
	cOpts.output_pix_fmt = C.enum_AVPixelFormat(opts.OutputPixelFormat)
	
	cFilterDesc := C.CString(opts.FilterDescription)
	defer C.free(unsafe.Pointer(cFilterDesc))
	cOpts.filter_description = cFilterDesc
	
	var errorMsg *C.char
	handle := C.create_filter(cOpts, &errorMsg)
	
	if handle == nil {
		if errorMsg != nil {
			err := C.GoString(errorMsg)
			C.free(unsafe.Pointer(errorMsg))
			return nil, fmt.Errorf("failed to create filter: %s", err)
		}
		return nil, fmt.Errorf("failed to create filter: unknown error")
	}
	
	return &Filter{handle: handle}, nil
}

func (f *Filter) FilterFrame(inputFrame *Frame) ([]Frame, error) {
	if f.handle == nil {
		return nil, fmt.Errorf("filter not initialized")
	}
	
	if inputFrame.cFrame == nil {
		return nil, fmt.Errorf("invalid input frame")
	}
	
	var cFrames **C.AVFrame
	var count C.int
	
	ret := C.filter_frame(f.handle, inputFrame.cFrame, &cFrames, &count)
	if ret < 0 {
		return nil, fmt.Errorf("filter failed: %d", ret)
	}
	
	defer C.free_frame_array(cFrames, count)
	
	if count == 0 {
		return []Frame{}, nil
	}
	
	frameArray := (*[1 << 30]*C.AVFrame)(unsafe.Pointer(cFrames))[:count:count]
	frames := make([]Frame, int(count))
	
	for i := 0; i < int(count); i++ {
		cFrame := frameArray[i]
		
		frames[i] = Frame{
			PTS:       int64(cFrame.pts),
			Width:     int(cFrame.width),
			Height:    int(cFrame.height),
			MediaType: "video",
			cFrame:    C.av_frame_clone(cFrame),
		}
	}
	
	return frames, nil
}

func (f *Filter) Close() {
	if f.handle != nil {
		C.free_filter(f.handle)
		f.handle = nil
	}
}

