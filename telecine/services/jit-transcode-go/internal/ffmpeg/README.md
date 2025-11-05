# FFmpeg CGO Integration

This package provides Go bindings to FFmpeg libraries for video transcoding.

## Status

**Current**: Skeleton implementation with VideoSource basics  
**Needed**: Complete pipeline (Decoder, Encoder, Filter, Muxer)

## Architecture

### VideoSource

Extracts metadata from MP4 files (synthetic or full):

- Stream information (video/audio tracks)
- Duration and timing
- Codec parameters
- Sample table access (for byte range calculation)

**Status**: ✅ Basic implementation complete

### Decoder

Decodes compressed video/audio frames to raw frames:

- H.264 → YUV420P (video)
- AAC → PCM (audio)
- Proper timebase handling
- Flush support

**Status**: ⏳ TODO

### Filter

Applies transformations to raw frames:

- Scaling (aspect ratio preserving)
- Format conversion
- Frame rate adjustment

**Status**: ⏳ TODO

### Encoder

Encodes raw frames to compressed format:

- YUV420P → H.264 (video)
- PCM → AAC (audio)
- GOP control
- Bitrate management
- Quality settings

**Status**: ⏳ TODO

### Muxer

Packages encoded frames into MP4 container:

- Fragmented MP4 (cmaf flags)
- Init segments (ftyp + moov)
- Media segments (moof + mdat)
- Proper sequence numbering

**Status**: ⏳ TODO

## Implementation Guide

### Step 1: Complete VideoSource

Add missing functionality:

- Sample table parsing
- Keyframe detection
- Byte range calculation for time ranges
- Support for URL-based sources (not just buffers)

**Reference**: `lib/transcode/src/pipeline/VideoSource.cpp`

### Step 2: Implement Decoder

Port from C++ implementation:

- Codec initialization
- Packet decoding
- Frame extraction
- Timebase conversion
- Buffer management

**Reference**: `lib/transcode/src/pipeline/Decoder.cpp`

### Step 3: Implement Filter

Port scaling and format conversion:

- libavfilter integration
- Filter graph setup
- Frame processing
- Timebase propagation

**Reference**: `lib/transcode/src/pipeline/Filter.cpp`

### Step 4: Implement Encoder

Port H.264/AAC encoding:

- Encoder initialization with preset/profile
- Frame encoding
- Packet extraction
- GOP management
- Quality control

**Reference**: `lib/transcode/src/pipeline/Encoder.cpp`

### Step 5: Implement Muxer

Port MP4 container generation:

- Fragmented MP4 support
- Init segment extraction
- Media segment generation
- Sequence numbering
- Base decode time calculation

**Reference**: `lib/transcode/src/pipeline/Muxer.cpp`

### Step 6: Integration

Wire everything together:

- Create transcoding service
- Implement segment endpoint handler
- Add caching logic
- Connect to operation manager
- Add track validation

## CGO Build Requirements

### pkg-config

The CGO directives use pkg-config to find FFmpeg libraries:

```go
#cgo pkg-config: libavformat libavcodec libavutil libavfilter libswscale
```

### Required Libraries

- libavformat (container format handling)
- libavcodec (codec encode/decode)
- libavutil (utility functions)
- libavfilter (filtering operations)
- libswscale (scaling)
- libswresample (audio resampling)

### Compiler Flags

Set in Dockerfile:

```dockerfile
RUN apk add --no-cache \
    gcc g++ make pkgconf \
    ffmpeg-dev ffmpeg
```

## Memory Management

### C Memory

- Use `C.malloc()` and `C.free()` for C allocations
- Never pass Go pointers to C that contain Go pointers
- Use `C.CBytes()` to copy Go data to C
- Use `C.GoBytes()` to copy C data to Go

### FFmpeg Resources

- Always free FFmpeg objects in reverse order of creation
- Use defer for cleanup
- Check for NULL before freeing
- Call specific free functions (avformat_close_input, av_frame_free, etc.)

### Go GC

- C pointers are opaque to Go GC
- Must manually track and free all C resources
- Use finalizers for critical cleanup

## Error Handling

### FFmpeg Errors

Most FFmpeg functions return negative values on error:

```go
ret := C.avformat_open_input(...)
if ret < 0 {
    errBuf := make([]byte, 128)
    C.av_strerror(ret, (*C.char)(unsafe.Pointer(&errBuf[0])), 128)
    return fmt.Errorf("avformat_open_input failed: %s", string(errBuf))
}
```

### Resource Cleanup

Always cleanup on error paths:

```go
handle := C.avformat_alloc_context()
if handle == nil {
    return fmt.Errorf("allocation failed")
}

ret := C.avformat_open_input(&handle, ...)
if ret < 0 {
    C.avformat_free_context(handle)  // Cleanup!
    return fmt.Errorf("open failed")
}
```

## Testing

### Unit Tests

Test individual components with synthetic data:

```go
func TestDecoder(t *testing.T) {
    // Create decoder
    // Feed test packet
    // Verify decoded frame
}
```

### Integration Tests

Test complete pipeline with real files:

```go
func TestTranscoding(t *testing.T) {
    // Load video
    // Transcode segment
    // Verify output with ffprobe
}
```

### Test Files

Place in `test-assets/`:

- Small MP4 file (< 1MB)
- H.264 video, AAC audio
- Known duration and properties

## Performance Considerations

### Buffer Pooling

Reuse buffers for frames and packets:

```go
var framePool = sync.Pool{
    New: func() interface{} {
        return C.av_frame_alloc()
    },
}
```

### Parallel Processing

Different segments can be transcoded in parallel:

- Each operation gets own FFmpeg contexts
- No shared state between operations
- Go scheduler handles parallelism

### Memory Limits

Be careful with:

- Frame buffer allocations (large for HD video)
- Packet buffers (can be several MB)
- Sample table caching (can be large)

## Debugging

### Enable FFmpeg Logging

```c
av_log_set_level(AV_LOG_DEBUG);
```

### Check FFmpeg Version

```bash
ffmpeg -version
pkg-config --modversion libavformat
```

### Verify Libraries

```bash
ldd /path/to/binary | grep libav
```

## Reference Materials

### FFmpeg Documentation

- https://ffmpeg.org/doxygen/trunk/
- Examples: https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples

### Existing Implementation

- C++ VideoSource: `lib/transcode/src/pipeline/VideoSource.cpp` (1072 lines)
- C++ Decoder: `lib/transcode/src/pipeline/Decoder.cpp` (432 lines)
- C++ Encoder: `lib/transcode/src/pipeline/Encoder.cpp` (589 lines)
- C++ Filter: `lib/transcode/src/pipeline/Filter.cpp` (417 lines)
- C++ Muxer: `lib/transcode/src/pipeline/Muxer.cpp` (656 lines)

**Total C++ to port**: ~3,166 lines

### Parity Documentation

`.cursor/rules/features/go-transcoder-parity.mdc`:

- Section 3: C++ Pipeline Components
- Section 5: JIT Transcoding Pipeline
- Section 10: MSE Compatibility

## Current Implementation

The `videosource.go` file provides:

- ✅ Basic VideoSource with custom AVIO
- ✅ Stream information extraction
- ✅ Duration detection
- ✅ Track availability detection (hasAudio/hasVideo)
- ⏳ Sample table parsing (TODO)
- ⏳ Keyframe alignment (TODO)
- ⏳ Byte range calculation (TODO)

## Next Steps

1. Complete VideoSource with sample tables
2. Implement Decoder with frame extraction
3. Implement Filter with scaling
4. Implement Encoder with H.264/AAC
5. Implement Muxer with fragmented MP4
6. Add MSE repackaging
7. Integrate with handlers
8. Add comprehensive tests

**Estimated Time**: 3-5 days for complete implementation
