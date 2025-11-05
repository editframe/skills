import { db } from "@/sql-client.server";
import { storageProvider } from "@/util/storageProvider.server";
import { captionsFilePath } from "@/util/filePaths";
import { streamToString } from "@/util/streamToString";
import { appFunction } from "@/util/appFunction.server";
import { z } from "zod";
import { logger } from "@/logging";

export const loader = appFunction(
  { requireCookieOrTokenSession: true, params: z.object({ id: z.string() }) },
  async ({ session, params }) => {
    const asset = await db
      .selectFrom("video2.caption_files")
      .where("org_id", "=", session.oid)
      .where("id", "=", params.id)
      .select(["id", "filename", "byte_size", "org_id", "md5"])
      .executeTakeFirst();

    if (!asset) {
      logger.error({ id: params.id }, "Asset not found");
      throw new Response("Not Found", { status: 404 });
    }
    const filePath = captionsFilePath({
      org_id: asset.org_id,
      id: asset.id,
    });

    const readStream = await storageProvider.createReadStream(filePath);
    const jsonString = await streamToString(readStream);
    let jsonData = null;
    try {
      jsonData = JSON.parse(jsonString);
    } catch (error) {
      throw new Error("Invalid JSON data in read stream");
    }
    return {
      id: asset.id,
      filename: asset.filename,
      byte_size: asset.byte_size,
      captions: jsonData,
    };
  },
);

export const action = async () => {
  throw new Response("Method Not Allowed", { status: 405 });
};
