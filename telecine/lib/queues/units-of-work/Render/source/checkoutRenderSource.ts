import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

import { logger } from "@/logging";
import { renderFilePath } from "@/util/filePaths";
import { unpackTarstream } from "@/util/unpackTarstream";
import { storageProvider } from "@/util/storageProvider.server";
import { executeSpan } from "@/tracing";

export const checkoutRenderSource = async (id: string, org_id: string) => {
  return await executeSpan("Render.checkoutRenderSource", async (span) => {
    const randomId = Math.random().toString(36).substring(2, 15);
    const tarPath = renderFilePath({ org_id, id });
    const workDir = path.join(os.tmpdir(), "render", id, randomId);
    const indexPath = path.join(workDir, "index.html");

    span.setAttributes({
      id,
      org_id,
      workDir,
      indexPath,
    });

    const bundleExists = await storageProvider.pathExists(tarPath);
    if (!bundleExists) {
      throw new Error(`Render bundle not found: ${tarPath}`);
    }

    await fs.rm(workDir, { recursive: true, force: true });
    await fs.mkdir(workDir, { recursive: true });

    // Create the stream immediately before consuming it to avoid
    // unhandled error events firing between creation and pipe
    const tarStream = await storageProvider.createReadStream(tarPath);
    logger.trace({ workDir }, "Unpacking tarstream");
    await unpackTarstream(tarStream, workDir);

    return {
      indexPath,
      [Symbol.asyncDispose]: async () => {
        logger.trace({ workDir }, "Removing workdir");
        await fs.rm(workDir, { recursive: true, force: true });
      },
      dispose: async () => {
        logger.trace({ workDir }, "Removing workdir");
        await fs.rm(workDir, { recursive: true, force: true });
      },
    };
  });
};
