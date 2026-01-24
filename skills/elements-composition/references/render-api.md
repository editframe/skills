# Programmatic Rendering

Render compositions to video from CLI or Playwright with custom data injection.

## CLI Usage

```bash
ef local-render ./my-project -o output.mp4 --data '{"userName":"John"}'
```

Options:

- `-o, --output <path>` - Output file (default: output.mp4)
- `-d, --data <json>` - Custom data as JSON string
- `--data-file <path>` - Custom data from JSON file
- `--fps <number>` - Frame rate (default: 30)
- `--scale <number>` - Resolution scale 0-1 (default: 1)
- `--include-audio` - Include audio track (default: true)
- `--no-include-audio` - Exclude audio track
- `--from-ms <number>` - Start time in milliseconds
- `--to-ms <number>` - End time in milliseconds

## Playwright Usage

```typescript
import { chromium } from "playwright";
import fs from "fs";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Stream chunks directly to file
const outputStream = fs.createWriteStream("output.mp4");
await page.exposeFunction("onRenderChunk", (chunk: number[]) => {
  outputStream.write(Buffer.from(chunk));
});

await page.goto("http://localhost:5173");
await page.waitForFunction(() => window.EF_REGISTERED);

// Inject custom data
await page.evaluate((data) => {
  window.EF_RENDER_DATA = data;
}, { userName: "John", theme: "dark" });

// Render with streaming
await page.evaluate(async () => {
  await window.EF_RENDER.renderStreaming({
    fps: 30,
    includeAudio: true,
  });
});

outputStream.end();
await browser.close();
```

## Reading Custom Data in Compositions

```typescript
import { getRenderData } from "@editframe/elements";

interface MyRenderData {
  userName: string;
  theme: "light" | "dark";
}

const data = getRenderData<MyRenderData>();
if (data) {
  console.log(data.userName);  // "John"
}
```

## Window API

| API | Description |
|-----|-------------|
| `window.EF_RENDER.renderStreaming(options)` | Stream render to `window.onRenderChunk` |
| `window.EF_RENDER.render(options)` | Return video as `Uint8Array` |
| `window.EF_RENDER.getRenderInfo()` | Get dimensions, duration, assets |
| `window.EF_RENDER.isReady()` | Check if SDK is ready for rendering |
| `window.EF_RENDER_DATA` | Custom data bag (set before render) |
| `window.onRenderChunk` | Callback for streaming chunks (set by Playwright) |
| `window.onRenderProgress` | Optional progress callback |

## Render Options

```typescript
interface RenderToVideoOptions {
  fps?: number;           // Frame rate (default: 30)
  scale?: number;         // Resolution scale (default: 1)
  includeAudio?: boolean; // Include audio track (default: true)
  fromMs?: number;        // Start time in ms
  toMs?: number;         // End time in ms
  codec?: "avc" | "hevc" | "vp9" | "av1" | "vp8"; // Video codec (default: "avc")
  bitrate?: number;       // Video bitrate (default: 8_000_000)
  audioBitrate?: number;  // Audio bitrate (default: 128_000)
}
```

## Notes

- **Streaming**: Use `renderStreaming()` for long videos to avoid memory buffering. Chunks are written to file as they're encoded.
- **Workbench Hidden**: The workbench UI (toolbar, timeline, hierarchy) is automatically hidden during render, so only the composition content appears in the video.
- **Custom Data**: Set `window.EF_RENDER_DATA` before calling render to pass data to your composition. Use `getRenderData()` in your composition code to read it.
