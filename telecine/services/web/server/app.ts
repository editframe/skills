import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "web" });

// Patch CustomElementRegistry.define to handle duplicate registrations gracefully
// This is needed because SSR can cause modules to be loaded multiple times,
// leading to duplicate custom element registrations
// The actual patching happens in patchCustomElementsDefine() which is called
// before and after importing the server build

import { createReadStream } from "node:fs";
import path from "node:path";

import express from "express";
import cors from "cors";
import mime from "mime-types";
import morgan from "morgan";
import { trace } from "@opentelemetry/api";
import "react-router";

import {
  UPLOAD_TO_BUCKET,
  storageProvider,
} from "@/util/storageProvider.server";
import { createRequestHandler } from "@react-router/express";

declare module "react-router" {
  interface AppLoadContext { }
}

const ALLOWED_ORIGINS = [
  "https://editframe.dev",
  "https://www.editframe.dev",
  "https://editframe.com",
  "https://www.editframe.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

export const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      callback(null, true);
      return;
    }
    
    // Check exact matches
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // In development, allow any *.localhost domain
    if (process.env.NODE_ENV === "development" && origin.match(/^https?:\/\/[^:]+\.localhost(:\d+)?$/)) {
      callback(null, true);
      return;
    }
    
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

morgan.token("host", (req) => req.get("host") || "");
app.use(morgan(":method :url :status :res[content-length] - :response-time ms :host"));

app.use((req, res, next) => {
  const host = req.get("host") || "";
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.setAttribute("http.host", host);
    activeSpan.setAttribute("http.domain", host.split(":")[0]);
  }
  next();
});

const rootDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);

app.get("/healthz", (_req, res) => {
  res.status(200).end("ok");
});

app.use((req, res, next) => {
  const host = req.get("host") || "";
  const protocol = req.protocol || "https";

  let shouldRedirect = false;
  let redirectHost = "";

  if (host === "editframe.dev" || host === "www.editframe.dev") {
    shouldRedirect = true;
    redirectHost = "editframe.com";
  } else if (host === "www.editframe.com") {
    shouldRedirect = true;
    redirectHost = "editframe.com";
  }

  if (shouldRedirect) {
    const redirectUrl = `${protocol}://${redirectHost}${req.originalUrl || req.url}`;
    return res.redirect(301, redirectUrl);
  }

  next();
});

if (UPLOAD_TO_BUCKET) {
  app.use("/guides/:handle/:filePath", async (req, res) => {
    const { filePath, handle } = req.params;
    const path = `guides/${handle}/${filePath}`;
    const contentType = mime.lookup(filePath) || "text/plain";
    const readStream = await storageProvider.createReadStream(path);
    readStream.on("error", (err) => {
      console.error("Error reading from bucket:", err);
      res.status(500).send("Internal Server Error");
    });
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", `public, max-age=${60 * 60 * 24 * 365}`);
    readStream.pipe(res);
  });
} else {
  app.use("/guides/:handle/:filePath", async (req, res) => {
    const { filePath, handle } = req.params;
    const path = `guides/${handle}/${filePath}`;
    const contentType = mime.lookup(filePath) || "text/plain";
    const readStream = createReadStream(`./data/${path}`);
    readStream.on("error", (err) => {
      console.error("Error reading local file:", err);
      res.status(500).send("Internal Server Error");
    });
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", `public, max-age=${60 * 60 * 24 * 365}`);
    readStream.pipe(res);
  });
}

let serverBuild: Promise<any> | undefined;
const patchCustomElementsDefine = () => {
  if (typeof globalThis !== "undefined" && globalThis.customElements) {
    const originalDefine = globalThis.customElements.define.bind(globalThis.customElements);
    // Check if element is already registered before defining to prevent duplicate registration errors
    // This is necessary because SSR can cause modules to be loaded multiple times
    globalThis.customElements.define = function(name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions) {
      // Check if already registered - if so, skip registration
      try {
        const existing = globalThis.customElements.get(name);
        if (existing === constructor) {
          // Already registered with same constructor - safe to skip
          return;
        }
        // Different constructor - this is an actual error, let it throw
      } catch {
        // get() can throw if element doesn't exist - that's fine, proceed with define
      }
      return originalDefine(name, constructor, options);
    };
  }
};

// Patch immediately when this module loads, before any other imports
// This ensures the patch is in place before the SSR shim creates its registry
patchCustomElementsDefine();

app.use(
  createRequestHandler({
    // @ts-expect-error - virtual module provided by React Router at build time
    build: () => {
      // Always patch before returning the build to ensure it's patched on every request
      // This is critical because the SSR shim might create new registries per request
      patchCustomElementsDefine();
      if (!serverBuild) {
        // Patch customElements before and after importing the server build
        patchCustomElementsDefine();
        serverBuild = import("virtual:react-router/server-build").then((mod) => {
          // Patch again after import in case customElements was created/recreated during import
          patchCustomElementsDefine();
          return mod;
        });
      }
      return serverBuild;
    },
    getLoadContext() {
      return {};
    },
  }),
);
