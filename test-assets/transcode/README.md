# JIT Transcoding Test Files

Generated on: 2025-08-02T06:46:54.969Z

## File Descriptions

All files include a centered overlay with frame number and timestamp (ms) on white background with black text for easy identification during transcoding tests.

### head-moov-720p.mp4
- **Description**: Head-moov 720p file with frame number overlay for basic transcoding tests
- **Resolution**: 1280x720 @ 25fps
- **Duration**: 10 seconds
- **Moov Location**: HEAD (faststart)
- **Audio**: 440Hz sine wave
- **Frame Overlay**: 64px font showing frame number and timestamp (ms)
- **File Size**: 3.79 MB
- **Pattern**: testsrc2

### tail-moov-720p.mp4
- **Description**: Tail-moov 720p file with frame number overlay for synthetic MP4 testing
- **Resolution**: 1280x720 @ 25fps
- **Duration**: 10 seconds
- **Moov Location**: TAIL (default)
- **Audio**: 440Hz sine wave
- **Frame Overlay**: 64px font showing frame number and timestamp (ms)
- **File Size**: 3.79 MB
- **Pattern**: testsrc2

### head-moov-1080p.mp4
- **Description**: Head-moov 1080p file with frame number overlay and animated pattern
- **Resolution**: 1920x1080 @ 25fps
- **Duration**: 10 seconds
- **Moov Location**: HEAD (faststart)
- **Audio**: 880Hz sine wave
- **Frame Overlay**: 96px font showing frame number and timestamp (ms)
- **File Size**: 7.50 MB
- **Pattern**: testsrc2

### tail-moov-1080p.mp4
- **Description**: Tail-moov 1080p file with frame number overlay and animated pattern
- **Resolution**: 1920x1080 @ 24fps
- **Duration**: 10 seconds
- **Moov Location**: TAIL (default)
- **Audio**: 880Hz sine wave
- **Frame Overlay**: 96px font showing frame number and timestamp (ms)
- **File Size**: 7.35 MB
- **Pattern**: testsrc2

### head-moov-480p.mp4
- **Description**: Head-moov 480p file with frame number overlay and SMPTE bars
- **Resolution**: 854x480 @ 25fps
- **Duration**: 10 seconds
- **Moov Location**: HEAD (faststart)
- **Audio**: 1000Hz sine wave
- **Frame Overlay**: 42px font showing frame number and timestamp (ms)
- **File Size**: 1.77 MB
- **Pattern**: testsrc2

### tail-moov-480p.mp4
- **Description**: Tail-moov 480p file with frame number overlay and SMPTE bars
- **Resolution**: 854x480 @ 25fps
- **Duration**: 10 seconds
- **Moov Location**: TAIL (default)
- **Audio**: 1000Hz sine wave
- **Frame Overlay**: 42px font showing frame number and timestamp (ms)
- **File Size**: 1.77 MB
- **Pattern**: testsrc2

## Usage in Tests

```typescript
const TEST_FILES = {
  headMoov720p: 'file:///app/test-assets/transcode/head-moov-720p.mp4',
  tailMoov720p: 'file:///app/test-assets/transcode/tail-moov-720p.mp4',
  headMoov1080p: 'file:///app/test-assets/transcode/head-moov-1080p.mp4',
  tailMoov1080p: 'file:///app/test-assets/transcode/tail-moov-1080p.mp4',
  headMoov480p: 'file:///app/test-assets/transcode/head-moov-480p.mp4',
  tailMoov480p: 'file:///app/test-assets/transcode/tail-moov-480p.mp4'
};
```
