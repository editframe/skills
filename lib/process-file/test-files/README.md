# Test Files for processISOBMFF

This directory contains test files used by `processISOBMFF.test.ts`.

## Required Test Files

To run the full test suite, you need:

1. **test.mp4** - A video file with both video and audio tracks
2. **card-joker.mp3** - An MP3 audio file
3. **no-tracks.txt** - A non-media file (already provided)

## Getting Test Files

You can download the required test files:

```bash
# Download card-joker.mp3 from the reference URL
curl -o card-joker.mp3 "https://assets.editframe.com/card-joker.mp3"

# For test.mp4, you can create a minimal test video:
ffmpeg -f lavfi -i testsrc=duration=1:size=96x52:rate=30 -f lavfi -i sine=frequency=1000:duration=1 -c:v libx264 -c:a aac -t 1 test.mp4
```

## Test File Requirements

- **test.mp4**: Should be ~1 second duration, ~96x52 resolution, contain both video and audio tracks
- **card-joker.mp3**: Should be a valid MP3 file that can be processed into audio tracks
- **no-tracks.txt**: Should be a non-media file that fails processing (already provided)
