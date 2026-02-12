import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath } from "@/util/filePaths";
import { db } from "@/sql-client.server";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/index";

export const loader = async ({ params: { id }, request }: Route.LoaderArgs) => {
  const session = await requireCookieOrTokenSession(request);

  const file = await db
    .selectFrom("video2.files")
    .select(["id", "org_id", "type", "status"])
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .executeTakeFirst();

  if (!file) {
    throw new Response("File not found", { status: 404 });
  }

  if (file.type !== "video") {
    throw new Response("Fragment index only available for video files", {
      status: 400,
    });
  }

  if (file.status !== "ready") {
    throw new Response("File not ready", { status: 409 });
  }

  const filePath = isobmffIndexFilePath({
    org_id: file.org_id,
    id: file.id,
  });

  try {
    const readStream = await storageProvider.createReadStream(filePath);
    const chunks: Buffer[] = [];

    for await (const chunk of readStream) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);
    const jsonString = buffer.toString("utf-8");

    return new Response(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=3600",
        etag: file.id,
      },
    });
  } catch (error) {
    throw new Response("Fragment index not found", { status: 404 });
  }
};
