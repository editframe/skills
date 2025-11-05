import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "web" });

import { createReadStream } from "node:fs";
import path from "node:path";

import express from "express";
import cors from "cors";
import mime from "mime-types";
import morgan from "morgan";
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
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(morgan("tiny"));

const rootDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);

app.get("/healthz", (_req, res) => {
  res.status(200).end("ok");
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

app.use(
  createRequestHandler({
    // @ts-expect-error - virtual module provided by React Router at build time
    build: () => import("virtual:react-router/server-build"),
    getLoadContext() {
      return {};
    },
  }),
);
