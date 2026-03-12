// Patch CustomElementRegistry.define before any imports to catch SSR shim registries
// This must run before ANY modules are imported, including express
if (typeof globalThis !== "undefined") {
  // Store original defineProperty to intercept ALL customElements creation
  const originalDefineProperty = Object.defineProperty;

  // Patch function that will be applied to any CustomElementRegistry
  const patchRegistry = (registry) => {
    if (registry && registry.define && !registry.define.__patched) {
      const originalDefine = registry.define.bind(registry);
      registry.define = function (name, constructor, options) {
        try {
          const existing = registry.get(name);
          if (existing) {
            return; // Already registered, skip
          }
        } catch {
          // Element doesn't exist, proceed
        }
        try {
          return originalDefine(name, constructor, options);
        } catch (error) {
          // Ignore duplicate registration errors - this is expected in SSR
          // Use type guard instead of instanceof to avoid Symbol.hasInstance recursion
          if (
            error &&
            typeof error === "object" &&
            "message" in error &&
            typeof error.message === "string" &&
            error.message.includes("has already been used")
          ) {
            return;
          }
          throw error;
        }
      };
      registry.define.__patched = true;
    }
  };

  // Intercept when customElements is created via defineProperty (SSR shim does this)
  Object.defineProperty = function (obj, prop, descriptor) {
    const result = originalDefineProperty.call(this, obj, prop, descriptor);
    if (obj === globalThis && prop === "customElements" && descriptor.value) {
      patchRegistry(descriptor.value);
    }
    return result;
  };

  // Patch existing customElements if it already exists
  if (globalThis.customElements) {
    patchRegistry(globalThis.customElements);
  }

  // Also set up a proxy to catch future customElements access
  // This ensures we patch any registry created by the SSR shim
  let customElementsProxy = globalThis.customElements;
  try {
    Object.defineProperty(globalThis, "customElements", {
      get() {
        return customElementsProxy;
      },
      set(value) {
        patchRegistry(value);
        customElementsProxy = value;
      },
      configurable: true,
    });
  } catch {
    // If we can't proxy it, that's okay - the defineProperty interceptor will catch it
  }
}

import express from "express";
import morgan from "morgan";
import path from "node:path";

// Short-circuit the type-checking of the built output.
const PROD_BUILD_PATH = "/app/services/web/build/server/index.js";
const PROD_BUILD_CLIENT_PATH = "/app/services/web/build/client";
const PROD_BUILD_ASSETS_PATH = "/app/services/web/build/client/assets";
const DEVELOPMENT = process.env.NODE_ENV === "development";
const PORT = Number.parseInt(process.env.PORT || "3000");

const app = express();

app.disable("x-powered-by");

console.log("NODE_ENV", process.env.NODE_ENV);
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const imagesDir = path.resolve(__dirname, "public/images");

app.use("/images", express.static(imagesDir, { maxAge: "1h" }));

let viteDevServer;
let server;
if (DEVELOPMENT) {
  console.log("Starting development server");
  // Create HTTP server first
  server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // Pass the server to Vite so HMR WebSocket uses the same server
  viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      configFile: "/app/services/web/vite.config.ts",
      server: {
        middlewareMode: true,
        hmr: {
          server: server, // Use the Express server for HMR WebSocket
        },
      },
    }),
  );
  app.use(viteDevServer.middlewares);
  app.use("/assets", express.static(path.resolve(__dirname, "public/assets")));
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule(
        "/app/services/web/server/app.ts",
      );
      return await source.app(req, res, next);
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
} else {
  console.log("Starting production server");
  app.use(
    "/assets",
    express.static(PROD_BUILD_ASSETS_PATH, { immutable: true, maxAge: "1y" }),
  );
  app.use(express.static(PROD_BUILD_CLIENT_PATH, { maxAge: "1h" }));
  app.use(await import(PROD_BUILD_PATH).then((mod) => mod.app));
}

app.use(morgan("tiny"));

// Server is created above in DEVELOPMENT mode, create it here for production
if (!DEVELOPMENT) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
