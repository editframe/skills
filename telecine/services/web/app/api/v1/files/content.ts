import { db } from "@/sql-client.server";
import { createReadableStreamFromReadable } from "@react-router/node";
import { storageProvider } from "@/util/storageProvider.server";
import { dataFilePath, captionsFilePath } from "@/util/filePaths";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/content";

export const loader = async ({ request, params: { id } }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);

  const file = await db
    .selectFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .select(["id", "org_id", "type", "mime_type", "filename", "status"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  if (file.status !== "ready") {
    throw new Response("File not ready", { status: 409 });
  }

  const pathDescriptor = { org_id: file.org_id, id: file.id };

  let storagePath: string;
  switch (file.type) {
    case "image":
    case "video":
      storagePath = dataFilePath(pathDescriptor);
      break;
    case "caption":
      storagePath = captionsFilePath(pathDescriptor);
      break;
    default:
      throw new Response("Unsupported file type for content serving", {
        status: 400,
      });
  }

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
