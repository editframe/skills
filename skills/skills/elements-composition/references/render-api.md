# Local Rendering

Render compositions to video locally using the Editframe CLI.

## CLI Usage

```bash
npx editframe render [directory] -o output.mp4 --data '{"userName":"John"}'
```

### Arguments

- `directory` - Project directory containing `index.html` (default: `.`)

### Options

- `-o, --output <path>` - Output file path (default: `output.mp4`)
- `-d, --data <json>` - Custom render data as JSON string
- `--data-file <path>` - Custom render data from JSON file
- `--fps <number>` - Frame rate (default: `30`)
- `--scale <number>` - Resolution scale 0-1 (default: `1`)
- `--include-audio` - Include audio track (default: `true`)
- `--no-include-audio` - Exclude audio track
- `--from-ms <number>` - Start time in milliseconds
- `--to-ms <number>` - End time in milliseconds
- `--experimental-native-render` - Use experimental canvas capture API (faster, Chrome only)

### Examples

```bash
# Basic render
npx editframe render ./my-project

# Custom output and data
npx editframe render ./my-project -o video.mp4 --data '{"userName":"John","theme":"dark"}'

# Render specific time range
npx editframe render ./my-project --from-ms 1000 --to-ms 5000

# Use experimental native render (faster)
npx editframe render ./my-project --experimental-native-render
```

## Reading Custom Data in Compositions

Use `getRenderData()` to read custom data passed via `--data` or `--data-file`:

```typescript
import { getRenderData } from "@editframe/elements";

interface MyRenderData {
  userName: string;
  theme: "light" | "dark";
}

const data = getRenderData<MyRenderData>();
if (data) {
  console.log(data.userName);  // "John"
  console.log(data.theme);     // "dark"
}
```

## Requirements

- **Google Chrome**: The render command requires Google Chrome to be installed on your system. Install from [https://www.google.com/chrome/](https://www.google.com/chrome/)
- **Node.js**: Node.js 18+ required

## Notes

- **Streaming**: Video chunks are streamed directly to disk as they're encoded, avoiding memory buffering for long videos.
- **Workbench Hidden**: The workbench UI (toolbar, timeline, hierarchy) is automatically hidden during render, so only the composition content appears in the video.
- **Custom Data**: Pass data to your composition using `--data` or `--data-file`. Use `getRenderData()` in your composition code to read it.
- **Experimental Native Render**: The `--experimental-native-render` flag enables Chrome's experimental `drawElementImage` canvas API for faster rendering. Requires Chrome Canary with the `chrome://flags/#canvas-draw-element` flag enabled.
