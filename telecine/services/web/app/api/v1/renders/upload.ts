import { storageProvider } from "@/util/storageProvider.server";
import { renderFilePath } from "@/util/filePaths";
import { db } from "@/sql-client.server";
import { writeReadableStreamToWritable } from "@/util/writeReadableStreamToWritable";
import { RenderWorkflow } from "@/queues/units-of-work/Render/Workflow";
import { RenderInitializerQueue } from "@/queues/units-of-work/Render/RenderInitializerQueue";
import { logger } from "@/logging";

import type { Route } from "./+types/upload";
import { apiIdentityContext } from "~/middleware/context";

export const action = async ({ params: { id }, request, context }: Route.ActionArgs) => {
  const session = context.get(apiIdentityContext);
  const render = await db
    .selectFrom("video2.renders")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .select([
      "id",
      "md5",
      "html",
      "org_id",
      "width",
      "height",
      "duration_ms",
      "fps",
      "output_config",
      "metadata",
      "strategy",
      "work_slice_ms",
    ])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  const filePath = renderFilePath({ org_id: session.oid, id: render.id });

  if (!request.body) {
    throw new Response("Request MUST have body content", { status: 400 });
  }

  const writeStream = await storageProvider.createWriteStream(filePath);
  const byteSize = await writeReadableStreamToWritable(
    request.body,
    writeStream,
  );
  await new Promise((resolve, reject) => {
    writeStream.on("finalized", resolve);
    writeStream.on("error", reject);
  });

  try {
    await db
      .updateTable("video2.renders")
      .set({
        byte_size: byteSize,
        status: "queued",
      })
      .where("id", "=", render.id)
      .where("org_id", "=", session.oid)
      .execute();

    // Only enqueue RenderInitializer if this is a tarfile upload (no HTML field)
    // HTML renders are handled by ProcessHTMLFinalizer
    if (!render.html) {
      logger.debug(
        { renderId: render.id },
        "Enqueueing RenderInitializer for tarfile upload",
      );
      await RenderWorkflow.enqueueJob({
        queue: RenderInitializerQueue,
        orgId: session.oid,
        workflowId: render.id,
        jobId: `${render.id}-initializer`,
        payload: render,
      });
    } else {
      logger.debug(
        { renderId: render.id },
        "Skipping RenderInitializer enqueue - HTML render handled by ProcessHTML workflow",
      );
    }
  } catch (error) {
    await storageProvider.deletePath(filePath);
    logger.error({ error, renderId: render.id }, "Error uploading render");
    throw error;
  }

  return render;
};
