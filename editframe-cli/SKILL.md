---
name: editframe-cli
description: "Command-line tools for Editframe video development. Render compositions to MP4 locally, preview in the browser, transcribe audio, and deploy to the cloud."
license: MIT
metadata:
  author: editframe
  version: 0.45.5
---


# Editframe CLI

## The Development Loop

```
1. npm create @editframe     ← scaffold a project (editframe-create skill)
2. npx editframe preview     ← open in browser with hot-reload
3. edit composition files    ← iterate
4. npx editframe render -o output.mp4  ← render to MP4 locally
5. npx editframe cloud-render          ← (optional) render in the cloud
```

**Which command for which need:**

| Need | Command |
|------|---------|
| Iterate on composition in browser | `preview` |
| Export to MP4 (local) | `render` |
| Render from already-running dev server | `render --url http://localhost:4321` |
| Render with dynamic data | `render --data '{"key":"val"}'` |
| Generate captions from audio | `transcribe` |
| Render in Editframe cloud | `cloud-render` |

## Quick Start

```bash
# Render a composition to video
npx editframe render -o output.mp4

# Render from a URL
npx editframe render --url http://localhost:4321 -o output.mp4

# Preview a project
npx editframe preview

# Generate captions
npx editframe transcribe video.mp4 -o captions.json
```

## Installation

The CLI is included in all Editframe project templates. To use standalone:

```bash
npx @editframe/cli <command>
```

Or install globally:

```bash
npm install -g @editframe/cli
```

## Global Options

- `-t, --token <token>` — API token (or `EF_TOKEN` env var)
- `--ef-host <host>` — Editframe host (default: `https://editframe.com`)
- `-V, --version` — Show version
- `-h, --help` — Show help

## Commands

### Local Development

- [references/render.md](references/render.md) — Render compositions to MP4 locally
- [references/preview.md](references/preview.md) — Preview compositions in the browser

### Media

- [references/transcribe.md](references/transcribe.md) — Generate captions from audio/video

### Cloud

- [references/cloud-render.md](references/cloud-render.md) — Render in the Editframe cloud

### Utilities

- [references/utilities.md](references/utilities.md) — Auth, dependency check, webhook testing
