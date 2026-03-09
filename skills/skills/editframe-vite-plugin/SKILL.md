---
name: editframe-vite-plugin
description: Vite integration for Editframe development with local video transcoding, asset serving, file API endpoints, and visual regression testing.
status: draft
license: PROPRIETARY
metadata:
  package: "@editframe/vite-plugin"
  version: "0.37.3-beta"
  type: vite-plugin
references:
  - getting-started.md
---

# Vite Plugin

## When do you need this?

You need the Vite plugin when your composition references **local video files**. Without it, the browser can't play raw video files — they must be transcoded to streamable ISOBMFF format first.

**Already included** in all project templates (`npm create @editframe`). You only need to install it manually when adding Editframe to an existing Vite project.

| Scenario | Need this? |
|----------|-----------|
| Compositions with local `.mp4`/`.mov` files | Yes — JIT transcoding |
| Compositions with remote URLs only | No |
| Adding Editframe to existing Vite project | Yes — install manually |
| Visual regression tests with Vitest | Yes — use vitest entry point |

## The Dev Loop with This Plugin

```
npm run dev
  ↓
Vite starts + plugin registers middleware
  ↓
Composition loads video src="/src/assets/clip.mp4"
  ↓
Plugin transcodes on first request → cached in cacheRoot/
  ↓
Subsequent loads → served from cache (fast)
```

The `@editframe/vite-plugin` adds local development capabilities to your Vite project. It handles on-demand video transcoding, local asset serving, and visual regression testing so you can develop Editframe compositions without cloud API dependencies.

## Installation

```bash
npm install @editframe/vite-plugin
```

## Configuration

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { vitePluginEditframe } from "@editframe/vite-plugin";

export default defineConfig({
  plugins: [
    vitePluginEditframe({
      root: "./src",       // Base directory for resolving file paths
      cacheRoot: "./cache", // Directory for cached transcoded assets
    }),
  ],
});
```

## Reference

- [references/getting-started.md](references/getting-started.md) — Installation and configuration options
- [references/jit-transcoding.md](references/jit-transcoding.md) — How on-demand video transcoding works
- [references/local-assets.md](references/local-assets.md) — Local image and caption serving
- [references/file-api.md](references/file-api.md) — File API endpoints
- [references/visual-testing.md](references/visual-testing.md) — Visual regression testing with Vitest
```
