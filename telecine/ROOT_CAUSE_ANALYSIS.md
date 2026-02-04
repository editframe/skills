# Root Cause Analysis: Video Rendering Hang

## Summary

Video rendering in Electron hangs indefinitely when attempting to decode H.264 frames using mediabunny 1.1.1 and WebCodecs VideoDecoder API.

## Exact Hang Point

**File**: `elements/packages/elements/src/elements/EFMedia/BufferedSeekingInput.ts`  
**Method**: `seekSafe()`  
**Line**: `const { done, value: decodedSample } = await iterator.next();`

The mediabunny track iterator's `next()` method calls `VideoDecoder.decode()` internally and never returns.

## Call Stack to Hang

1. `FrameController.renderFrame(0)` - Start frame rendering
2. `EFVideo.prepareFrame()` - Prepare video element
3. `EFVideo.getMediaEngine()` - Get or create media engine (succeeds)
4. `EFVideo.#fetchVideoSampleForFrame()` - Fetch video sample
5. `EFVideo.#getMainVideoSampleForFrame()` - Get main quality sample
6. `mainVideoInputCache.getOrCreateInput()` - Create BufferedSeekingInput
7. `BufferedSeekingInput` constructor - Parse MP4, create track
8. `mainInput.seek()` - Seek to timestamp
9. `BufferedSeekingInput.seekSafe()` - Safe seek with locking
10. `track.getFirstTimestamp()` - **SUCCEEDS** (returns 66.667ms)
11. `iterator.next()` - **HANGS FOREVER**

## Key Findings

### 1. WebCodecs is Available
- `VideoDecoder` API IS present in Electron's BrowserWindow renderer
- System Chrome also has VideoDecoder available in secure contexts
- Not a "missing API" or "no GPU" issue

### 2. Correct Video Tracks are Fetched
- After fixing `UrlGenerator.ts` bug, correct video segments (track ID 1) are fetched
- Init segment: 8,121,752 bytes
- Media segment: 8,121,752 bytes  
- Combined buffer: 16,243,504 bytes

### 3. Mediabunny Successfully Parses MP4
- `track.getFirstTimestamp()` completes successfully
- Returns 66.667ms (2 frames at 30fps)
- This means mediabunny CAN initialize VideoDecoder enough to read metadata

### 4. Hang Occurs on First Frame Decode
- `iterator.next()` internally calls `VideoDecoder.decode()`
- This is the FIRST actual frame decode attempt
- Never returns, never errors, just hangs indefinitely

### 5. H.264 Requires `description` Field
Chrome test revealed critical error when using VideoDecoder without `description`:

```
Failed to execute 'decode' on 'VideoDecoder': A key frame is required after 
configure() or flush(). If you're using AVC formatted H.264 you must fill out 
the description field in the VideoDecoderConfig.
```

The `description` field should contain the avcC box (codec configuration) from the MP4 init segment.

## Video Specifications

**File**: `bars-n-tone.mp4`  
**Codec**: H.264 High Profile Level 4.0 (`avc1.640028`)  
**Resolution**: 1920x1080  
**Frame Rate**: 30 fps  
**Encoder**: `Lavc61.19.101 libx264`

**Tracks**:
- Track 1: Video (H.264)
- Track 2: Audio (AAC)

## Root Cause Hypothesis

**Mediabunny 1.1.1 is either:**
1. Not extracting the avcC box (description) from the init segment
2. Extracting it but not providing it to VideoDecoder.configure()
3. Providing it incorrectly/malformed

**When the description is missing**, VideoDecoder behaves differently in Chrome vs Electron:
- **Chrome**: Immediately throws error on `decode()`
- **Electron (Chromium in Docker)**: Hangs indefinitely on `decode()`

This explains why:
- The hang only occurs during full-video rendering (which uses mediabunny)
- Frame-by-frame approaches work (they might use a different code path)
- The error logs show "Exiting GPU process" but rendering continues (software fallback)
- Yet WebCodecs still hangs (the software fallback decoder is still missing the description)

## Next Steps

1. **Inspect avcC box extraction**: Check if mediabunny 1.1.1 source code properly extracts and provides the avcC box
2. **Add description manually**: Try patching mediabunny or BufferedSeekingInput to manually extract and provide the avcC box
3. **Upgrade mediabunny**: Consider upgrading to 1.31.1 (requires significant API migration)
4. **Alternative decoder**: Consider using a different H.264 decoder or falling back to native video elements

## Files Changed (Diagnostic Logging)

The following files have extensive diagnostic logging added that should be removed after resolution:
- `elements/packages/elements/src/preview/FrameController.ts`
- `elements/packages/elements/src/elements/EFVideo.ts`
- `elements/packages/elements/src/elements/EFMedia.ts`
- `elements/packages/elements/src/elements/EFMedia/AssetIdMediaEngine.ts`
- `elements/packages/elements/src/elements/EFMedia/BufferedSeekingInput.ts`
