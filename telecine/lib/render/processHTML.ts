import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PassThrough } from "node:stream";

import { createReadableStreamFromReadable } from "@react-router/node";
import type { Selectable } from "kysely";
import { parse } from "node-html-parser";
import * as tar from "tar";

import { logger } from "@/logging";
import type { EnqueableJob } from "@/queues/Job";
import {
  type IngestImagePayload,
  IngestImageQueue,
} from "@/queues/units-of-work/IngestImage";
import {
  type ProcessISOBMFFPayload,
  ProcessISOBMFFQueue,
} from "@/queues/units-of-work/ProcessIsobmff";
import { db } from "@/sql-client.server";
import type { Video2ProcessIsobmff } from "@/sql-client.server/kysely-codegen";
import { renderFilePath } from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";

// @ts-expect-error viteAliases is a .js file
import { viteAliases } from "@/util/viteAliases";
import { writeReadableStreamToWritable } from "@/util/writeReadableStreamToWritable";
import { mkTempDir } from "@/util/tempFile";
import { envString } from "@/util/env";
import { ProcessHTMLWorkflow } from "@/queues/units-of-work/ProcessHtml/Workflow";
import { executeSpan } from "@/tracing";

import {
  execFile,
  ExecFileOptions,
  ExecFileOptionsWithBufferEncoding,
} from "node:child_process";
import { promisify } from "node:util";

const _execFileAsync = promisify(execFile);

const execFileAsync = (
  file: string,
  args: readonly string[] | null | undefined,
  options: ExecFileOptions,
) =>
  executeSpan("execFileAsync", async (span) => {
    span.setAttributes({
      file,
      args,
      options,
    });
    return _execFileAsync(file, args, options);
  });

// TODO: publish this check in @editframe/api and use it here
// import { ImageFileMimeTypes } from "@editframe/api";

interface ProcessHTMLOptions {
  html: string;
  org_id: string;
  creator_id: string;
  api_key_id: string | null;
  render_id: string;
  process_html_id: string;
}

const writeIntoDirectory = async (
  tempDir: string,
  contents: Record<string, string>,
) => {
  return executeSpan("writeIntoDirectory", async (span) => {
    span.setAttributes({
      tempDir,
    });
    const writes = [];
    for (const [filename, content] of Object.entries(contents)) {
      writes.push(writeFile(path.join(tempDir, filename), content));
    }
    await Promise.all(writes);
    return tempDir;
  });
};

const WEB_HOST = envString("WEB_HOST", "http://localhost:3000");

export async function createBundledHTMLDirectory(
  directory: string,
  html: string,
): Promise<string> {
  return executeSpan("createBundledHTMLDirectory", async () => {
    await writeIntoDirectory(directory, {
      "index.ts": /* TS */ `
          import "@editframe/elements";
          import "@editframe/elements/styles.css";
          import { renderTimegroupToVideo } from "/app/lib/packages/packages/elements/src/preview/renderTimegroupToVideo.ts";
          import { captureTimegroupAtTime } from "/app/lib/packages/packages/elements/src/preview/renderTimegroupToCanvas.ts";
          
          // Make render functions globally available for RPC calls
          (window as any).renderTimegroupToVideo = renderTimegroupToVideo;
          (window as any).captureTimegroupAtTime = captureTimegroupAtTime;
        `,
      "index.html": /* HTML */ `
          <!DOCTYPE html>
          <html>
          <head>
            <script type="module" src="./index.ts"></script>
            <link rel="stylesheet" href="./styles.css">
          </head>
          <body>
            <ef-configuration api-host="${WEB_HOST}">
              ${html}
            </ef-configuration>
          </body>
          </html>
        `,
      "styles.css": /* CSS */ `
          @tailwind base;
          @tailwind components;
          @tailwind utilities;
        `,
      "package.json": "{}",
      "vite.config.js": /* JS */ `
          import { viteSingleFile } from "vite-plugin-singlefile";

          export default {
            plugins: [viteSingleFile()],
            resolve: {
              alias: ${JSON.stringify(viteAliases)},
            }
          };
        `,
      "postcss.config.cjs": /* JS */ `
          module.exports = {
            plugins: {
              tailwindcss: {},
            },
          };
        `,
      "tailwind.config.js": /* JS */ `
          module.exports = {
            content: [
              "./index.html",${process.env.NODE_ENV === "production" ? "" : `"/app/lib/packages/packages/elements/src/**/*.ts"`}
            ],
            theme: {
              extend: {},
            },
            plugins: [],
          };
        `,
    });

    const { stdout, stderr } = await execFileAsync(
      "node",
      [
        path.join(
          process.cwd(),
          "node_modules",
          "rolldown-vite",
          "bin",
          "vite.js",
        ),
        "build",
      ],
      {
        cwd: directory,
      },
    );

    console.log(stdout);
    console.log(stderr);
    return path.join(directory, "dist");
  });
}

async function bundleHTMLRender(html: string) {
  await using tempDir = await mkTempDir(path.join(process.cwd(), "temp"));
  const distPath = await createBundledHTMLDirectory(tempDir.path, html);

  const passthrough = new PassThrough();

  // Create a promise that resolves when the tar is complete or rejects on error
  const tarComplete = new Promise((resolve, reject) => {
    const tarStream = tar.create(
      {
        gzip: true,
        cwd: distPath,
      },
      ["."],
    );

    tarStream.on("error", (error) => {
      passthrough.emit("error", error);
      reject(error);
    });

    tarStream.on("end", () => {
      passthrough.end();
      resolve(undefined);
    });

    tarStream.pipe(passthrough);
  });

  const tarReadStream = createReadableStreamFromReadable(passthrough);

  // Wait for tar to complete before cleaning up
  await tarComplete;

  return tarReadStream;
}

const ONE_HOUR = 1000 * 60 * 60;

export async function processHTML(options: ProcessHTMLOptions) {
  const workflowJobs: Array<
    EnqueableJob<IngestImagePayload> | EnqueableJob<ProcessISOBMFFPayload>
  > = [];

  const doc = parse(options.html);

  const imageElements = doc.querySelectorAll("ef-image");
  const mediaElements = doc.querySelectorAll("ef-audio,ef-video");

  const isobmffs: {
    id: string;
    org_id: string;
    creator_id: string;
    api_key_id: string | null;
    isobmff_expires_at: Date;
    source_type: "url";
    url: string;
  }[] = [];
  for (const media of mediaElements) {
    const src = media.getAttribute("src");
    if (src?.startsWith("http")) {
      logger.info({ src }, "Processing isobmff asset");
      const isobmffId = randomUUID();
      isobmffs.push({
        id: isobmffId,
        org_id: options.org_id,
        creator_id: options.creator_id,
        api_key_id: options.api_key_id,
        isobmff_expires_at: new Date(Date.now() + ONE_HOUR),
        source_type: "url",
        url: src,
      });

      media.setAttribute("asset-id", isobmffId);
      media.removeAttribute("src");
    }
  }

  let processIsobmffs: Selectable<Video2ProcessIsobmff>[] = [];
  if (isobmffs.length > 0) {
    processIsobmffs = await db
      .insertInto("video2.process_isobmff")
      .values(isobmffs)
      .returningAll()
      .execute();
  }

  for (const isobmff of processIsobmffs) {
    if (isobmff.id === undefined) {
      logger.warn({ isobmff }, "isobmff id is undefined");
      continue;
    }
    workflowJobs.push({
      payload: isobmff,
      queue: ProcessISOBMFFQueue.name,
      orgId: options.org_id,
      workflowId: options.process_html_id,
      jobId: isobmff.id,
    });
  }

  for (const image of imageElements) {
    const src = image.getAttribute("src");
    if (src?.startsWith("http")) {
      const imageId = randomUUID();
      workflowJobs.push({
        payload: {
          url: src,
          creatorId: options.creator_id,
          apiKeyId: options.api_key_id ?? "",
          imageId,
        },
        queue: IngestImageQueue.name,
        orgId: options.org_id,
        workflowId: options.process_html_id,
        jobId: imageId,
      });
      image.setAttribute("asset-id", imageId);
      image.removeAttribute("src");
    }
  }

  await ProcessHTMLWorkflow.enqueueJobs(...workflowJobs);

  // TODO: bundling should be its own unit of work, we don't want this to fail after enqueuing all the jobs
  // all the other jobs
  // Get the bundle stream
  const bundledStream = await bundleHTMLRender(doc.toString());

  // Upload the bundle
  const filePath = renderFilePath({
    org_id: options.org_id,
    id: options.render_id,
  });
  const writeStream = await storageProvider.createWriteStream(filePath);

  const byteSize = await writeReadableStreamToWritable(
    bundledStream,
    writeStream,
  );

  await new Promise((resolve, reject) => {
    writeStream.on("finalized", resolve);
    writeStream.on("error", reject);
  });

  try {
    await db
      .updateTable("video2.renders")
      .set({ byte_size: byteSize })
      .where("id", "=", options.render_id)
      .executeTakeFirstOrThrow();
  } catch (error) {
    storageProvider.deletePath(filePath);
    logger.error(error);
    throw error;
  }
}

export async function writeBundledHTMLRenderToFile(
  html: string,
  outputPath: string,
) {
  const bundledStream = await bundleHTMLRender(html);
  const { createWriteStream } = await import("node:fs");
  const writeStream = createWriteStream(outputPath);

  await writeReadableStreamToWritable(bundledStream, writeStream);

  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => resolve(undefined));
    writeStream.on("error", reject);
  });
}
