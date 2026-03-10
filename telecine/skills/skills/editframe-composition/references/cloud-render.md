---
title: Cloud Rendering
description: How to submit React compositions to the Editframe cloud for server-side rendering — and why the raw createRender API cannot be used directly with React.
type: how-to
nav:
  parent: "Rendering"
  priority: 14
  related: ["render-strategies", "render-api"]
api:
  functions:
    - name: bundleRender()
      signature: bundleRender(options)
      description: Build a Vite bundle from a local project directory and return a tar stream ready for upload. Programmatic equivalent of `npx editframe cloud-render`.
      returns: Promise<ReadableStream>
    - name: useRenderData()
      signature: useRenderData<T>()
      description: React hook. Returns custom data injected at render time via CLI `--data`, `bundleRender({ renderData })`, or the raw HTML `createRender` payload. Returns undefined when no data is present. Stable reference — reads once on mount.
      returns: T | undefined
---

# Cloud Rendering

## Why createRender Doesn't Work with React

`createRender` accepts a raw HTML string. For simple self-contained `<ef-*>` compositions this works:

```ts
import { createRender } from "@editframe/api";

await createRender(client, {
  html: `<ef-timegroup class="w-[1280px] h-[720px]">...</ef-timegroup>`,
  width: 1280,
  height: 720,
  fps: 30,
});
```

React compositions cannot use this path. A React component tree has static imports — fonts, video files, local modules, Tailwind CSS — that only exist in the project's build context. Serialising JSX to an HTML string at runtime produces a string that references assets the cloud runner has no access to.

Cloud rendering a React composition requires shipping the entire Vite build output as a bundle. The cloud runner unpacks the bundle and loads `index.html` in a headless browser, where all imports are resolved.

## Three Paths to Cloud Rendering

### 1. CLI (zero config)

```bash
npx editframe cloud-render
```

Handles everything: `vite build` → asset upload → `createRender` → tar upload. Use this for local development and one-off renders.

Pass dynamic data into the composition at render time:

```bash
npx editframe cloud-render --data '{"userName":"Alice","theme":"dark"}'
```

### 2. `bundleRender()` (programmatic)

For backend services that need to trigger cloud renders without shelling out to the CLI:

```ts
import { createRender, uploadRender } from "@editframe/api";
import { bundleRender } from "@editframe/api/node";

// Build the project and get a tar stream
const tarStream = await bundleRender({
  root: "/path/to/composition",
  renderData: { userName: "Alice", theme: "dark" },
});

// Create the render record
const render = await createRender(client, {
  width: 1280,
  height: 720,
  fps: 30,
  duration_ms: 10000,
});

// Upload the bundle
await uploadRender(client, render.id, tarStream);
```

`bundleRender()` runs Vite programmatically, tars the `dist/` output, and returns a `ReadableStream`. `renderData` is baked into the bundle at build time via Vite's `define` option.

### 3. Raw HTML string (self-contained only)

Only suitable for compositions that have no local imports — pure `<ef-*>` element markup with remote asset URLs:

```ts
await createRender(client, {
  html: `
    <ef-configuration api-host="https://api.editframe.com">
      <ef-timegroup class="w-[1280px] h-[720px]">
        <ef-video file-id="abc123" class="size-full"></ef-video>
      </ef-timegroup>
    </ef-configuration>
  `,
  width: 1280,
  height: 720,
  fps: 30,
});
```

The server handles bundling for this path — it scaffolds a Vite project around the HTML string and builds it server-side. Media assets must be pre-uploaded and referenced by `file-id`, not by local path.

## Accessing Render Data in React

Use the `useRenderData` hook to read data injected at render time. This works across all render paths: CLI `--data`, `bundleRender({ renderData })`, and `window.EF_RENDER_DATA` set externally.

```tsx
import { useRenderData } from "@editframe/react";

interface MyData {
  userName: string;
  theme: "light" | "dark";
}

export const Title = () => {
  const data = useRenderData<MyData>();

  return (
    <div className={data?.theme === "dark" ? "text-white" : "text-black"}>
      Hello, {data?.userName ?? "World"}
    </div>
  );
};
```

`useRenderData` returns `undefined` when no data was injected — compositions should handle the absent case so they render correctly in preview as well as in cloud renders.

The data is static for the lifetime of a render job. The hook reads once on mount and returns a stable reference.

> **Note:** For HTML/elements compositions, use `getRenderData()` from `@editframe/elements` instead. `useRenderData` is the React-idiomatic wrapper around the same function.

## Comparison

| | CLI | `bundleRender()` | Raw HTML |
|---|---|---|---|
| Requires local project | yes | yes | no |
| Handles asset upload | yes | no | no |
| React support | yes | yes | no |
| Local imports | yes | yes | no |
| Dynamic data | `--data` flag | `renderData` option | request payload |
| Use case | local / CI | backend service | simple compositions |
