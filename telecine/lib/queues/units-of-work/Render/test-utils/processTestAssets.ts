import { join, dirname } from "node:path";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { Selectable } from "kysely";
import { v4 } from "uuid";

import type { TestAgent } from "TEST/util/test";
import type { Video2IsobmffFiles, Video2ImageFiles } from "@/sql-client.server/kysely-codegen";
import { db } from "@/sql-client.server";
import { acquireAsset } from "@/process-file/processAsset";
import { processISOBMFF } from "@/process-file/processISOBMFF";
import { TestProgressTracker } from "@/progress-tracking/ProgressTracker";
import { executeSpan } from "@/tracing";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ASSETS_DIR = join(__dirname, "../../../../process-file/test-files");

/**
 * Process a test image file through the image processing pipeline
 */
export async function processTestImageAsset(
  filenameOrUrl: string,
  testAgent: TestAgent,
): Promise<Selectable<Video2ImageFiles>> {
  const existingFile = await db
    .selectFrom("video2.image_files")
    .where("filename", "=", filenameOrUrl)
    .where("org_id", "=", testAgent.org.id)
    .selectAll()
    .executeTakeFirst();

  if (existingFile) {
    return existingFile;
  }


  const { processImageFile } = await import("@/process-file/processAsset");

  if (filenameOrUrl.startsWith('http://') ||
    filenameOrUrl.startsWith('https://')) {
    const { processImageFile: processRemoteImageFile } = await import("@/process-file/processAsset");

    return await processRemoteImageFile(filenameOrUrl, testAgent.org.id, testAgent.user.user_id, testAgent.apiKey.id);
  } else {
    const filePath = join(ASSETS_DIR, filenameOrUrl);
    const stats = await stat(filePath);

    return await processImageFile(filePath, testAgent.org.id, testAgent.user.user_id, testAgent.apiKey.id, {
      filename: filenameOrUrl,
      byte_size: stats.size,
      next_byte: stats.size,
    });
  }
}

/**
 * Process a test video file through the ISOBMFF pipeline
 */
export async function processTestVideoAsset(
  filenameOrUrl: string,
  testAgent: TestAgent,
): Promise<Selectable<Video2IsobmffFiles>> {
  return executeSpan(
    "processTestVideoAsset",
    async (span) => {
      span.setAttributes({
        filenameOrUrl,
        testAgent: JSON.stringify(testAgent),
      });

      // For local test files, delete any incomplete previous records to force reprocessing
      if (!filenameOrUrl.startsWith('http://') && !filenameOrUrl.startsWith('https://')) {
        await db
          .deleteFrom("video2.isobmff_files")
          .where("filename", "=", filenameOrUrl)
          .where("org_id", "=", testAgent.org.id)
          .where("fragment_index_complete", "=", false)
          .execute();
      }

      const existingFile = await db
        .selectFrom("video2.isobmff_files")
        .where("filename", "=", filenameOrUrl)
        .where("org_id", "=", testAgent.org.id)
        .selectAll()
        .executeTakeFirst();

      if (existingFile) {
        return existingFile;
      }

      if (filenameOrUrl.startsWith('http://') || filenameOrUrl.startsWith('https://')) {
        // URL - download first, then process
        await using asset = await acquireAsset(filenameOrUrl);

        return await processISOBMFF(
          asset.path,
          {
            id: v4(),
            md5: v4(),
            org_id: testAgent.org.id,
            creator_id: testAgent.user.user_id,
            filename: filenameOrUrl,
            api_key_id: testAgent.apiKey.id,
            byte_size: 0, // processISOBMFF will determine this
          },
          new TestProgressTracker()
        );
      } else {
        // Local file - resolve path and get size
        const filePath = join(ASSETS_DIR, filenameOrUrl);
        const stats = await stat(filePath);

        return await processISOBMFF(
          filePath,
          {
            id: v4(),
            md5: v4(),
            org_id: testAgent.org.id,
            creator_id: testAgent.user.user_id,
            filename: filenameOrUrl,
            api_key_id: testAgent.apiKey.id,
            byte_size: stats.size,
          },
          new TestProgressTracker()
        );
      }
    }
  );
}
