---
description: "Submit React compositions to Editframe's cloud for rendering. Covers the CLI, the programmatic bundleRender() API, and how to pass dynamic data into compositions at render time."
metadata:
  author: editframe
  version: 0.45.8
---


# Cloud Rendering


## Functions

- **bundleRender(options)** - Build a Vite bundle from a local composition directory and return a tar stream ready for upload. Programmatic equivalent of `npx editframe cloud-render`.
  - Returns: Promise<ReadableStream>
- **useRenderData<T>()** - React hook. Returns custom data injected at render time via CLI `--data`, `bundleRender({ renderData })`, or `window.EF_RENDER_DATA`. Returns undefined when no data is present. Reads once on mount, stable reference.
  - Returns: T | undefined


Cloud rendering submits a composition to Editframe's servers for rendering. React compositions require bundling because they have static imports — fonts, local modules, Tailwind, asset files — that only exist in the project's build context. The bundle wraps everything the render pipeline needs into a single uploadable artifact.

## Three Paths

### CLI

```bash
npx editframe cloud-render
```

Run from your composition project directory. The CLI builds the project, extracts composition metadata, uploads any local media assets, creates the render record, and uploads the bundle.

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

const render = await createRender(client);

await uploadRender(client, render.id, tarStream);
```

`bundleRender()` runs Vite programmatically inside the composition directory, inlines all assets into a single `index.html`, tars the output, and returns a `ReadableStream`.

`renderData` is baked into the bundle at build time via Vite's `define` option — it is not passed at upload time.

Composition metadata (dimensions, duration, fps) is extracted from the uploaded bundle automatically — you do not need to pass these to `createRender`.

#### Composition directory requirements

`bundleRender()` calls `vite build` inside `root`. That directory must be a valid Vite project with `viteSingleFile()` in its Vite config. Use `npm create @editframe` to scaffold one.

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
});
```

Only suitable for compositions with no local imports — pure `<ef-*>` markup with pre-uploaded `file-id` references. React components cannot use this path.

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
| Dynamic data | `--data` flag | `renderData` option | request payload |
| Use case | local / CI | backend service | simple compositions |
