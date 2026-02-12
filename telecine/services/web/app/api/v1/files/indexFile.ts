import { createReadableStreamFromReadable } from "@react-router/node";

import { db } from "@/sql-client.server";
import { isobmffIndexFilePath } from "@/util/filePaths";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";
import { storageProvider } from "@/util/storageProvider.server";

import type { Route } from "./+types/indexFile";

export const loader = async ({ request, params: { id } }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);

  const file = await db
    .selectFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .where("type", "=", "video")
    .select(["id", "status"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  if (file.status !== "ready") {
    throw new Response("File is not ready", { status: 409 });
  }

  const filePath = isobmffIndexFilePath({
    org_id: session.oid,
    id: file.id,
  });

  const readStream = await storageProvider.createReadStream(filePath);

  return new Response(createReadableStreamFromReadable(readStream), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      etag: file.id,
      "Cache-Control": "max-age=3600",
    },
  });
};
