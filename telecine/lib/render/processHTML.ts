import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

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
import { executeSpan, setSpanAttributes } from "@/tracing";

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

/**
 * Sets api-host on all ef-configuration elements in a parsed document.
 * Required when user HTML already contains ef-configuration without api-host:
 * EFMedia uses closest("ef-configuration") which finds the nearest ancestor,
 * so the inner element must have api-host set.
 */
export function injectApiHost(doc: ReturnType<typeof parse>, apiHost: string) {
  for (const el of doc.querySelectorAll("ef-configuration")) {
    el.setAttribute("api-host", apiHost);
  }
}

export async function createBundledHTMLDirectory(
  directory: string,
  html: string,
): Promise<string> {
  return executeSpan("createBundledHTMLDirectory", async () => {
    await writeIntoDirectory(directory, {
      "index.ts": /* TS */ `
          import "@editframe/elements";
          import "@editframe/elements/styles.css";
          import { renderTimegroupToVideo } from "@editframe/elements/preview/renderTimegroupToVideo";
          import { captureTimegroupAtTime } from "@editframe/elements/preview/renderTimegroupToCanvas";
          
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
      "tailwind.config.cjs": /* JS */ `
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
          "vite",
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
  return executeSpan("bundleHTMLRender", async () => {
    await using tempDir = await mkTempDir(path.join(process.cwd(), "temp"));
    logger.info({ tempDir: tempDir.path }, "processHTML: vite build starting");
    const distPath = await createBundledHTMLDirectory(tempDir.path, html);
    logger.info({ distPath }, "processHTML: vite build complete, starting tar");

    return executeSpan("bundleHTMLRender.tar", async () => {
      // Buffer the tar output in memory to avoid a backpressure deadlock:
      // createReadableStreamFromReadable pauses the Node stream when nobody
      // is reading from the web ReadableStream, but we can't start reading
      // until this function returns. Buffering (~300KB gzipped) avoids this.
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        const tarStream = tar.create(
          {
            gzip: true,
            cwd: distPath,
          },
          ["."],
        );

        tarStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        tarStream.on("error", reject);
        tarStream.on("end", resolve);
      });

      const tarBuffer = Buffer.concat(chunks);
      logger.info(
        { byteSize: tarBuffer.byteLength },
        "processHTML: tar complete",
      );

      return new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(tarBuffer));
          controller.close();
        },
      });
    });
  });
}

const ONE_HOUR = 1000 * 60 * 60;

export interface ImageSourceRewrite {
  imageId: string;
  url: string;
}

/**
 * Finds ef-image elements with HTTP src attributes, rewrites them to use
 * file-id/asset-id, and returns the list of images to ingest.
 * Modifies the doc in-place.
 */
export function extractAndRewriteImageSources(
  doc: ReturnType<typeof parse>,
): ImageSourceRewrite[] {
  const imageElements = doc.querySelectorAll("ef-image");
  const rewrites: ImageSourceRewrite[] = [];

  for (const image of imageElements) {
    const src = image.getAttribute("src");
    if (src?.startsWith("http")) {
      const imageId = randomUUID();
      rewrites.push({ imageId, url: src });
      image.setAttribute("file-id", imageId);
      image.setAttribute("asset-id", imageId);
      image.removeAttribute("src");
    }
  }

  return rewrites;
}

export async function processHTML(options: ProcessHTMLOptions) {
  return executeSpan("processHTML", async (span) => {
    const meta = {
      renderId: options.render_id,
      processHtmlId: options.process_html_id,
      orgId: options.org_id,
    };
    span.setAttributes(meta);

    const { workflowJobs, doc } = await executeSpan(
      "processHTML.parseAndPrepare",
      async () => {
        const workflowJobs: Array<
          EnqueableJob<IngestImagePayload> | EnqueableJob<ProcessISOBMFFPayload>
        > = [];

        const doc = parse(options.html);

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
        const fileRows: {
          id: string;
          org_id: string;
          creator_id: string;
          api_key_id: string | null;
          filename: string;
          type: "video" | "image" | "caption";
          status: "processing";
          expires_at: Date;
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

            fileRows.push({
              id: isobmffId,
              org_id: options.org_id,
              creator_id: options.creator_id,
              api_key_id: options.api_key_id,
              filename: src,
              type: "video",
              status: "processing",
              expires_at: new Date(Date.now() + ONE_HOUR),
            });

            media.setAttribute("file-id", isobmffId);
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

        const imageRewrites = extractAndRewriteImageSources(doc);
        for (const { imageId, url } of imageRewrites) {
          workflowJobs.push({
            payload: {
              url,
              creatorId: options.creator_id,
              apiKeyId: options.api_key_id ?? "",
              imageId,
            },
            queue: IngestImageQueue.name,
            orgId: options.org_id,
            workflowId: options.process_html_id,
            jobId: imageId,
          });

          fileRows.push({
            id: imageId,
            org_id: options.org_id,
            creator_id: options.creator_id,
            api_key_id: options.api_key_id,
            filename: url,
            type: "image",
            status: "processing",
            expires_at: new Date(Date.now() + ONE_HOUR),
          });
        }

        if (fileRows.length > 0) {
          await db.insertInto("video2.files").values(fileRows).execute();
        }

        setSpanAttributes({
          mediaCount: mediaElements.length,
          imageCount: imageRewrites.length,
          workflowJobCount: workflowJobs.length,
        });

        injectApiHost(doc, WEB_HOST);

        return { workflowJobs, doc };
      },
    );

    await executeSpan("processHTML.enqueueWorkflowJobs", async () => {
      setSpanAttributes({ jobCount: workflowJobs.length });
      await ProcessHTMLWorkflow.enqueueJobs(...workflowJobs);
    });

    // TODO: bundling should be its own unit of work, we don't want this to fail after enqueuing all the jobs
    logger.info(meta, "processHTML: starting bundle");
    const bundledStream = await bundleHTMLRender(doc.toString());
    logger.info(meta, "processHTML: bundle complete, starting upload");

    const filePath = renderFilePath({
      org_id: options.org_id,
      id: options.render_id,
    });

    const byteSize = await executeSpan("processHTML.uploadBundle", async () => {
      setSpanAttributes({ filePath });
      const writeStream = await storageProvider.createWriteStream(filePath);
      logger.info(
        { ...meta, filePath },
        "processHTML: write stream created, writing data",
      );

      const byteSize = await executeSpan(
        "processHTML.writeStream",
        async () => {
          return writeReadableStreamToWritable(bundledStream, writeStream);
        },
      );
      logger.info(
        { ...meta, byteSize },
        "processHTML: data written, awaiting finalized",
      );

      await executeSpan("processHTML.awaitFinalized", async () => {
        setSpanAttributes({ byteSize });
        await new Promise((resolve, reject) => {
          writeStream.on("finalized", resolve);
          writeStream.on("error", reject);
        });
      });
      logger.info(meta, "processHTML: finalized");

      return byteSize;
    });

    await executeSpan("processHTML.updateDatabase", async () => {
      setSpanAttributes({ byteSize, renderId: options.render_id });
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
    });
  });
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
