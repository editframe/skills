import { db } from "@/sql-client.server";
import { createReadableStreamFromReadable } from "@react-router/node";
import { storageProvider } from "@/util/storageProvider.server";
import { dataFilePath } from "@/util/filePaths";
import { throwIfExpired } from "@/http/throwIfExpired";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/content";

export const loader = async ({ params: { id }, context }: Route.LoaderArgs) => {
  const session = context.get(apiIdentityContext);

  const file = await db
    .selectFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .select(["id", "org_id", "type", "mime_type", "filename", "status", "expires_at"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  throwIfExpired(file.expires_at);

  if (file.status !== "ready") {
    throw new Response("File not ready", { status: 409 });
  }

  // Only serve images directly - videos should use JIT playback
  if (file.type !== "image") {
    throw new Response("Content serving only available for images", {
      status: 400,
    });
  }

  const storagePath = dataFilePath({ org_id: file.org_id, id: file.id });
  const readStream = await storageProvider.createReadStream(storagePath);

  return new Response(createReadableStreamFromReadable(readStream), {
    status: 200,
    headers: {
      "Content-Type": file.mime_type ?? "application/octet-stream",
      etag: file.id,
      "Cache-Control": "max-age=3600",
      ...(file.filename
        ? {
            "Content-Disposition": `inline; filename="${file.filename}"`,
          }
        : {}),
    },
  });
};
