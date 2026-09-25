---
name: dev-server
description: "Set up local media processing for Editframe compositions through Vite, Next.js, or a custom server. Local processing needs no cloud API; URL signing uses the Editframe cloud API."
license: PROPRIETARY
metadata:
  packages:
    - "@editframe/vite-plugin"
    - "@editframe/nextjs-plugin"
    - "@editframe/dev-server"
  version: 0.59.47
---


# Dev Server

The Editframe dev server provides local media routes, on-demand video transcoding, and asset caching. Local media processing needs no cloud API. The URL-signing route uses the Editframe cloud API.

Pick one integration, based on your framework.

- **Vite** (the `html`/`react` templates from `npm create @editframe`): `@editframe/vite-plugin`.
- **Next.js** (the `nextjs` template): `@editframe/nextjs-plugin`.
- **Any other toolchain** (Webpack, Rspack, a custom Node.js server): `@editframe/dev-server` directly.

All three wrap the same implementation. A scaffolded project already includes the right one. See the `editframe-create` skill.

## Vite Setup

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { vitePluginEditframe } from "@editframe/vite-plugin";

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

## Next.js Setup

```javascript
// next.config.mjs
import { withEditframe } from "@editframe/nextjs-plugin";

export default withEditframe(
  { root: "./src", cacheRoot: "./cache" },
  {
    // your existing Next.js config
  },
);
```

`withEditframe` starts a sidecar HTTP server next to `next dev`, on port 3099 by default. Override the port with a `port` option. Its `rewrites()` rules proxy Editframe requests to the sidecar. Set the composition's `api-host` to the browser's Next.js origin, not port 3099. Run `next dev` as usual.

The sidecar does not start in production. Deploy against real media (cloud renders, uploaded files) instead.

## Framework-Agnostic Setup

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

## Connect the Composition

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

## What It Enables

After you connect the server and composition, elements use these routes without direct requests from your code.

- **JIT video transcoding.** Reference a local video file directly, for example `<ef-video src="clip.mp4">`. The dev server transcodes it into streamable segments on first request, then serves cached segments after that.
- **Local image and caption serving.** The server exposes local image and caption routes.
- **A local files API** that mirrors the shape of the production files API. Code written against local media keeps working after you switch to uploaded or cloud files.
- **URL signing.** `ef-configuration`'s default `signing-url` forwards to the real Editframe cloud API to mint a playback token. Set the `EF_TOKEN` environment variable before you start your dev server. Set `EF_HOST` to point at a non-default API host.

See the `composition` skill for how `ef-video`, `ef-image`, and `ef-captions` consume local media. See the `editframe-api` skill for `EF_TOKEN` and `EF_HOST`.

## Visual Regression Testing

Use your project's browser screenshot tests to check composition output. The published Vite plugin does not export the repository's internal `src/index.vitest.js` adapter. Do not import that source path from an installed package.

## Debug Logging

Set `DEBUG` before you start your dev server, to trace a specific subsystem.

```bash
DEBUG=ef:dev-server:jit npm run dev      # transcode middleware
DEBUG=ef:dev-server:assets npm run dev   # local image/caption serving
DEBUG=ef:dev-server:files npm run dev    # local files API
DEBUG=ef:dev-server:sign-url npm run dev # URL signing
DEBUG=ef:dev-server:snapshot npm run dev # visual regression testing
```
