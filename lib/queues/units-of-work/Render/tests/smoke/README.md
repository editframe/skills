# Smoke Tests

Fast, focused rendering tests that verify core functionality across multiple rendering strategies.

## Purpose

- **Fast feedback loop**: Each test renders only a few frames (~100ms durations)
- **Core element coverage**: Tests all essential Editframe elements
- **Multiple render strategies**: Validates 5 different rendering paths
- **Rendering validation**: Verifies video generation and basic MP4 structure
- **CI-friendly**: Quick enough to run on every commit

## Test Coverage

- `ef-timegroup` - Basic timegroup rendering and nesting
- `ef-image` - Image element rendering with real assets
- `ef-text` - Text rendering with styling
- `ef-video` - Video element with frame seeking
- `ef-audio` - Audio element and track validation
- `ef-waveform` - Waveform visualization

## Rendering Strategies

The smoke tests support 5 different rendering strategies:

1. **server** (default): Electron offscreen rendering - fastest, most reliable
2. **browser-full-video-foreignObject**: Browser with SVG foreignObject + mediabunny encoder
3. **browser-full-video-native**: Browser with native canvas + mediabunny encoder
4. **browser-frame-by-frame-foreignObject**: Browser frame-by-frame with SVG + FFmpeg
5. **browser-frame-by-frame-native**: Browser frame-by-frame with native canvas + FFmpeg

### Strategy Selection

By default, only the **server** strategy runs for fast local feedback.

To test all strategies (recommended for CI or comprehensive testing):

```bash
cd telecine && TEST_ALL_STRATEGIES=true ./scripts/test lib/queues/units-of-work/Render/tests/smoke/
```

To test a specific strategy:

```bash
cd telecine && RENDER_STRATEGY=browser-full-video-foreignObject ./scripts/test lib/queues/units-of-work/Render/tests/smoke/
```

## Running Tests

```bash
# Run all smoke tests (server-only, ~30 seconds)
cd telecine && ./scripts/test lib/queues/units-of-work/Render/tests/smoke/

# Run all strategies (~2 minutes)
cd telecine && TEST_ALL_STRATEGIES=true ./scripts/test lib/queues/units-of-work/Render/tests/smoke/

# Run specific element test
cd telecine && ./scripts/test lib/queues/units-of-work/Render/tests/smoke/ -t "ef-video"

# Run specific element with all strategies
cd telecine && TEST_ALL_STRATEGIES=true ./scripts/test lib/queues/units-of-work/Render/tests/smoke/ -t "ef-text"
```

## Test Output

Videos are saved to a shared output directory with descriptive filenames that indicate:
- The element being tested
- The rendering strategy used (e.g., `elements-smoke-ef-text-server.mp4`)

Check the console output for the exact path to test outputs.

## Performance

- **Server-only** (default): All 8 tests complete in ~30 seconds
- **All strategies**: All 40 tests (8 tests × 5 strategies) complete in ~2 minutes

## Audio Track Limitations

**Note**: Browser frame-by-frame rendering (`browser-frame-by-frame-*`) does not support audio encoding. Audio track assertions are automatically skipped for these strategies.
