---
name: dev-server
description: "Connect a Vite or Next.js app to the installed Editframe runtime and browser editor. For custom setups, the advanced entries add local media routes."
license: PROPRIETARY
metadata:
  packages:
    - "@editframe/vite-plugin"
    - "@editframe/nextjs-plugin"
    - "@editframe/dev-server"
  version: 0.60.28
---


# Dev Server

The Editframe framework adapters connect your app to the installed Editframe runtime. This runtime is a local bridge. It owns runtime state, compilation, media, and export. The adapters add a local route into the browser editor. They can also mirror selected source files into a composition.

Install the runtime first, from https://editframe.com/agent. The npm packages do not install the bridge.

Pick one integration, based on your framework.

- **Vite** (the `html`/`react` templates from `npm create @editframe`): `@editframe/vite-plugin`.
- **Next.js** (the `nextjs` template): `@editframe/nextjs-plugin`.
- **Local media routes without the bridge** (JIT transcoding, local captions, URL signing): the `/advanced` entries of these plugins, or `@editframe/dev-server`. See "Advanced: local media routes".

A scaffolded project already includes the right adapter. See the `editframe-create` skill.

## Select the Bridge

Each adapter needs an absolute `projectRoot` and an installed bridge. Select the bridge with one of these options:

- `executable`: the absolute path of the bridge executable.
- `componentRoot`: the absolute path of a verified component installation.
- The `EDITFRAME_BRIDGE_PATH` or `EDITFRAME_COMPONENT_ROOT` environment variable, when you omit both options.

The scaffolded templates omit both options, so they read the environment variables. A bare bridge executable can also need its editor and compiler assets (`editorDir`, `compilerPack`). A verified component supplies those assets.

The `editframe` CLI selects the bridge the same way, through `--bridge`, `--component`, or the same environment variables. See the `editframe-api` skill.

## Vite Setup

```typescript
// vite.config.ts
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginEditframe } from "@editframe/vite-plugin";

export default defineConfig({
  plugins: [
    vitePluginEditframe({
      projectRoot: path.resolve(__dirname),
      executable: "/absolute/editframe-bridge", // or componentRoot, or an environment variable
    }),
  ],
});
```

Open `/@ef/workspace` on the Vite dev server. The plugin redirects to the authenticated browser editor. Your app never receives the editor bearer token. The route accepts only local requests. Do not expose it as a hosted editor endpoint.

The old `root` and `cacheRoot` options belong to `@editframe/vite-plugin/advanced`. The default plugin starts no media server.

## Next.js Setup

Put the options in one server-only file. Both calls below then use the same values.

```javascript
// editframe.config.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

export default {
  projectRoot: path.dirname(fileURLToPath(import.meta.url)),
  executable: "/absolute/editframe-bridge", // or componentRoot, or an environment variable
};
```

```javascript
// next.config.mjs
import { withEditframe } from "@editframe/nextjs-plugin";
import editframe from "./editframe.config.mjs";

export default withEditframe(editframe, {
  // your Next.js config
});
```

Add a Node.js route handler. Adjust the relative import to the location of your `app` directory.

```typescript
// src/app/api/editframe/workspace/route.ts
import { createEditframeRoute } from "@editframe/nextjs-plugin";
import editframe from "../../../../../editframe.config.mjs";

export const runtime = "nodejs";
export const GET = createEditframeRoute(editframe);
```

Open `/@ef/workspace` on the Next.js dev server. A rewrite forwards the request to the route handler. The handler redirects to the authenticated browser editor. The Vite rules for local requests and tokens also apply here.

The old sidecar options belong to `@editframe/nextjs-plugin/advanced`.

## Mirror App Source

Set `source` to mirror selected project files into a composition. The bridge compiles the files and checks each revision.

```typescript
vitePluginEditframe({
  projectRoot: path.resolve(__dirname),
  source: {
    kind: "html", // "source" for a React or TypeScript entry
    entryPath: "src/composition.html",
    files: ["src/composition.html"],
    onError: console.error,
  },
}),
```

- Use paths relative to `projectRoot`.
- List each file of the composition in `files`. Include the entry file.
- `files` accepts up to 256 unique paths.
- The adapter does not find new files or assets. Add each new file to `files` yourself.
- Optional fields: `compositionId`, `title`, `width`, `height`, `durationMs`, and `onCommitted`.

The Vite dev server starts and serves your app also when the runtime is not available. The adapter then sends the sync error to `onError` one time. If you omit `onError`, Vite shows one warning. `/@ef/workspace` returns 503 with a setup message until the runtime is available.

The Next.js adapter accepts the same `source` object. Put it in the shared config file.

## Advanced: Local Media Routes

The `/advanced` entries keep the local media server of earlier releases. Use them for a custom setup that serves local media without the bridge. These routes process media locally with no cloud API. The URL-signing route uses the Editframe cloud API.

### Vite

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { vitePluginEditframe } from "@editframe/vite-plugin/advanced";

export default defineConfig({
  plugins: [
    vitePluginEditframe({
      root: "./src",       // base directory local `src=` paths resolve against
      cacheRoot: "./cache", // directory for cached transcoded assets
    }),
  ],
});
```

The plugin mounts onto Vite's own dev server. Set the composition's `api-host` to the browser's Vite origin, as shown below. Requests then use the same origin.

### Next.js

```javascript
// next.config.mjs
import { withEditframe } from "@editframe/nextjs-plugin/advanced";

export default withEditframe(
  { root: "./src", cacheRoot: "./cache" },
  {
    // your Next.js config
  },
);
```

This `withEditframe` starts a sidecar HTTP server next to `next dev`, on port 3099 by default. Override the port with a `port` option. Its `rewrites()` rules proxy Editframe requests to the sidecar. Set the composition's `api-host` to the browser's Next.js origin, not port 3099. Run `next dev` as usual.

The sidecar does not start in production. Deploy against real media (cloud renders, uploaded files) instead.

### Other Toolchains

For a toolchain with no Vite or Next.js integration, call `@editframe/dev-server` directly. Get six asset-processing functions from `@editframe/assets`. Provide URL-signing handlers with `createProdEfHandlers`.

```typescript
import { createEditframeDevServer, createProdEfHandlers } from "@editframe/dev-server";
import {
  generateTrack,
  generateScrubTrack,
  generateTrackFragmentIndex,
  cacheImage,
  findOrCreateCaptions,
  md5FilePath,
} from "@editframe/assets";
import { Client, createURLToken } from "@editframe/api";

const server = createEditframeDevServer(
  { root: "./src", cacheRoot: "./cache" },
  { generateTrack, generateScrubTrack, generateTrackFragmentIndex, cacheImage, findOrCreateCaptions, md5FilePath },
  createProdEfHandlers({
    createURLToken,
    getClient: () => new Client(process.env.EF_TOKEN, process.env.EF_HOST),
  }),
);

server.listen(3001, () => console.log("Editframe dev server running on http://localhost:3001"));
```

If your toolchain already exposes a Connect-compatible middleware stack (Express, Connect, or a custom Vite integration), call `createEditframeRouter(...)` with the same three arguments instead. Mount the result with `.use()`. `createEditframeDevServer` wraps that same router in its own standalone `http.Server`, for toolchains with no middleware stack of their own.

For the standalone server, proxy `/api/v1/*` and `/@ef-*` from your app server to `http://localhost:3001`. Set the composition's `api-host` to your app's browser origin. This keeps media and signing requests on the same origin. The standalone server does not configure your app's proxy or composition.

### Connect the Composition

Set `api-host` on an ancestor `ef-configuration` before its media children connect. Use the origin that exposes the media routes to the browser.

```html
<!-- Example for a Vite app at http://localhost:5173. Use your actual app origin. -->
<ef-configuration api-host="http://localhost:5173">
  <ef-timegroup mode="contain">
    <ef-video src="clip.mp4"></ef-video>
  </ef-timegroup>
</ef-configuration>
```

For Next.js, use the Next.js origin, for example `http://localhost:3000`. For a standalone integration with a proxy, use your app's origin. React uses `<Configuration apiHost="…">` with the same value.

The current elements read `api-host` from `ef-configuration`. They do not read the plugin's `window.__EDITFRAME__.apiHost` value. An empty `api-host` skips JIT discovery for author media URLs.

### What the Routes Enable

After you connect the server and composition, elements use these routes without direct requests from your code.

- **JIT video transcoding.** Reference a local video file directly, for example `<ef-video src="clip.mp4">`. The dev server transcodes it into segments on first request. Later requests get the cached segments.
- **Local images.** The server exposes a local image route.
- **Local captions.** Set `ef-captions` `captions-src` to `/api/v1/assets/captions?src=<path>`. The path is relative to `root`. The server runs `whisper_timestamped` on that file and caches the caption JSON. Install `whisper_timestamped` on the host first. The route transcribes English speech only.
- **A local files API** with the same shape as the production files API. Code written against local media keeps working after you switch to uploaded or cloud files.
- **URL signing.** `ef-configuration`'s default `signing-url` forwards to the real Editframe cloud API to mint a playback token. Set the `EF_TOKEN` environment variable before you start your dev server. Set `EF_HOST` to point at a non-default API host.

See the `composition` skill for how `ef-video`, `ef-image`, and `ef-captions` consume local media. See the `editframe-api` skill for `EF_TOKEN` and `EF_HOST`.

## Visual Regression Testing

Use your project's browser screenshot tests to check composition output. The published Vite plugin does not export the repository's internal `src/index.vitest.js` adapter. Do not import that source path from an installed package.

## Debug Logging

With the local media routes, set `DEBUG` before you start your dev server. This traces a specific subsystem.

```bash
DEBUG=ef:dev-server:jit npm run dev      # transcode middleware
DEBUG=ef:dev-server:assets npm run dev   # local image/caption serving
DEBUG=ef:dev-server:files npm run dev    # local files API
DEBUG=ef:dev-server:sign-url npm run dev # URL signing
DEBUG=ef:dev-server:snapshot npm run dev # visual regression testing
```

## Send Feedback

Send feedback to Editframe about problems and about improvements:

- If Editframe or this skill causes a problem, find a workaround and continue the task. Then report the problem and the workaround.
- If you find an improvement that can help other tasks too, not only your current task, send a suggestion. For example, suggest a clearer instruction, a missing example, a better default, or a new feature.

Send one report for each different problem or suggestion. If the report fails, continue the task.

```bash
curl -sS https://editframe.com/api/v1/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EDITFRAME_API_KEY" \
  --data-binary @- <<'JSON'
{
  "category": "bug",
  "skill": "dev-server",
  "summary": "One line that names the problem or the suggestion",
  "details": "For a problem: steps, expected result, actual result, and errors. For a suggestion: the change and how it helps.",
  "workaround": "The workaround that you used. Omit this field for a suggestion."
}
JSON
```

Set `category` to `bug`, `documentation`, `feature_request`, `performance`, or `other`. The API key is optional. A report without a key is anonymous. Do not put secrets, API keys, or personal data in a report. See the `editframe-api` skill for all fields, limits, and responses.
