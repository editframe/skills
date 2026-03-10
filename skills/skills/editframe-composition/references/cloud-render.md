---
title: Cloud Rendering
description: Submit React compositions to Editframe's cloud renderer. Covers the CLI, the programmatic bundleRender() API, and how to pass dynamic data into compositions at render time.
type: how-to
nav:
  parent: "Rendering"
  priority: 14
  related: ["render-strategies", "render-api"]
api:
  functions:
    - name: bundleRender()
      signature: bundleRender(options)
      description: Build a Vite bundle from a local composition directory and return a tar stream ready for upload to the cloud renderer. Programmatic equivalent of `npx editframe cloud-render`.
      returns: Promise<ReadableStream>
    - name: useRenderData()
      signature: useRenderData<T>()
      description: React hook. Returns custom data injected at render time via CLI `--data`, `bundleRender({ renderData })`, or `window.EF_RENDER_DATA`. Returns undefined when no data is present. Reads once on mount, stable reference.
      returns: T | undefined
---

# Cloud Rendering

Cloud rendering submits a composition to Editframe's servers, where it runs in a headless browser and is captured frame-by-frame to produce an MP4. The cloud runner never sees your local filesystem — you ship a self-contained bundle.

React compositions require bundling because they have static imports (fonts, local modules, Tailwind, asset files) that only exist in the project's build context. A raw HTML string cannot reference those. The bundle wraps everything the cloud runner needs into a single uploadable artifact.

## Three Paths

### CLI

```bash
npx editframe cloud-render
```

Run from your composition project directory. The CLI builds the project with Vite, launches the built `index.html` in a headless browser to extract dimensions and duration, uploads any local media assets, creates the render record, and uploads the bundle.

Pass dynamic data into the composition at render time:

```bash
npx editframe cloud-render --data '{"userName":"Alice","theme":"dark"}'
```

Use this for local development and CI pipelines.

### `bundleRender()` (programmatic)

For backend services that need to trigger cloud renders without shelling out to the CLI:

```ts
import { createRender, uploadRender } from "@editframe/api";
import { bundleRender } from "@editframe/api/node";

const tarStream = await bundleRender({
  root: "/path/to/composition",
  renderData: { userName: "Alice", theme: "dark" },
});

const render = await createRender(client, {
  width: 1280,   // match your composition's ef-timegroup dimensions
  height: 720,
  fps: 30,
  duration_ms: 10000,
});

await uploadRender(client, render.id, tarStream);
```

`bundleRender()` runs Vite programmatically inside the composition directory, inlines all assets into a single `index.html` via `vite-plugin-singlefile`, tars the output, and returns a `ReadableStream`.

`renderData` is baked into the bundle at build time via Vite's `define` option — it is not passed at upload time.

**Dimension and duration values** must match your composition. They are declared by the composition author — `width` and `height` come from the root `ef-timegroup` element's CSS dimensions, `fps` from the composition setup, and `duration_ms` from the composition's total duration. The `bundleRender()` path does not inspect the DOM to extract these automatically.

#### Composition directory requirements

`bundleRender()` calls `vite build` inside `root`. That directory must be a valid Vite project:

```
my-composition/
  index.html         # entry point — must load the composition JS
  vite.config.ts     # must include viteSingleFile() plugin
  package.json       # needs @editframe/react, @editframe/elements, react, react-dom
  src/
    main.tsx         # React root mount
    Composition.tsx  # your composition component
```

Your composition can import components from elsewhere in your monorepo via `tsconfig` path aliases — `vite-tsconfig-paths` is applied automatically by `bundleRender()`.

### Raw HTML string (self-contained compositions only)

```ts
import { createRender } from "@editframe/api";

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

Only suitable for compositions with no local imports — pure `<ef-*>` markup with remote asset URLs or pre-uploaded `file-id` references. The server scaffolds a Vite project around the HTML and builds it server-side. React components cannot use this path.

## Passing Data into Compositions

Use `useRenderData` in React compositions to read data injected at render time:

```tsx
import { useRenderData } from "@editframe/react";

interface RenderPayload {
  userName: string;
  theme: "light" | "dark";
}

export const Title = () => {
  const data = useRenderData<RenderPayload>();

  return (
    <div className={data?.theme === "dark" ? "text-white" : "text-black"}>
      Hello, {data?.userName ?? "World"}
    </div>
  );
};
```

`useRenderData` returns `undefined` when no data was injected — compositions must handle the absent case so they render correctly during local preview as well as in cloud renders.

For HTML / non-React compositions, use `getRenderData()` from `@editframe/elements` directly.

## Comparison

| | CLI | `bundleRender()` | Raw HTML |
|---|---|---|---|
| React support | yes | yes | no |
| Local imports | yes | yes | no |
| Handles asset upload | yes | no | no |
| Extracts dimensions automatically | yes | no | no |
| Dynamic data | `--data` flag | `renderData` option | request payload |
| Use case | local / CI | backend service | simple compositions |
