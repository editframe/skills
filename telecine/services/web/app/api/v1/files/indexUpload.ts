import { writeReadableStreamToWritable } from "@react-router/node";
import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath } from "@/util/filePaths";
import { db } from "@/sql-client.server";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/indexUpload";

export const action = async ({ params: { id }, request }: Route.ActionArgs) => {
  if (!request.body) {
    throw new Response("Request MUST have body content", { status: 400 });
  }

  const session = await requireCookieOrTokenSession(request);

  const file = await db
    .selectFrom("video2.files")
    .select(["id", "org_id", "type", "status", "filename"])
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .executeTakeFirst();

  if (!file) {
    throw new Response("File not found", { status: 404 });
  }
  if (file.type !== "video") {
    throw new Response("Fragment index can only be uploaded for video files", {
      status: 400,
    });
  }

  const filePath = isobmffIndexFilePath({
    org_id: session.oid,
    id: file.id,
  });

  const writeStream = await storageProvider.createWriteStream(filePath);
  await writeReadableStreamToWritable(request.body, writeStream);
  await new Promise((resolve, reject) => {
    writeStream.on("finalized", resolve);
    writeStream.on("error", reject);
  });

  try {
    await db
      .updateTable("video2.files")
      .set({ status: "ready" })
      .where("id", "=", id)
      .execute();
  } catch (error) {
    await storageProvider.deletePath(filePath);
    throw error;
  }

  return Response.json({ id: file.id, status: "ready" });
};
