# FFmpeg Test Pattern Generation Scripts

This directory contains TypeScript scripts for generating test pattern videos using FFmpeg. These test patterns can be used for testing video playback functionality, benchmarking, and other video-related testing scenarios.

## Available Scripts

### Basic Test Pattern

The `generate-test-pattern.ts` script creates a basic test pattern video with a 220Hz tone. The output is a 2K resolution (2048x1080) video that's 10 minutes long.

```bash
npm run generate:test-pattern
```

### Multiple Test Patterns

The `generate-test-patterns.ts` script creates multiple test patterns with different configurations:

1. Standard Test Pattern: Animated test pattern with scrolling elements and a 220Hz tone
2. Mandelbrot Pattern: A visually interesting animated fractal pattern with a 220Hz tone
3. SMPTE Color Bars: Standard industry color bar pattern with a 1kHz tone

```bash
npm run generate:test-patterns
```

## Customizing Test Patterns

The `generate-test-patterns.ts` script exports a `generateTestPattern` function that you can import and use in your own scripts with custom configuration options.

Example of creating a custom test pattern:

```typescript
import { generateTestPattern } from './scripts/generate-test-patterns';

// Generate a 4K test pattern with blue background and no audio
generateTestPattern({
  patternType: 'color',
  resolution: '3840x2160',
  duration: '5:00',
  audioType: 'silence',
  fileName: 'blue-4k-5min.mp4'
});
```

## Available Pattern Types

- `testsrc`: Standard test pattern with scrolling elements
- `testsrc2`: Alternative test pattern with different elements
- `smptebars`: Standard SMPTE color bars
- `color`: Solid color (defaults to blue)
- `mandelbrot`: Animated fractal pattern

## Available Audio Types

- `sine`: Pure sine wave tone (default 220Hz)
- `silence`: No audio
- `anoisesrc`: White noise

## Requirements

- FFmpeg must be installed and available in your PATH
- Node.js and npm

## Output

Generated videos are saved to the `test-assets` directory in the project root. 