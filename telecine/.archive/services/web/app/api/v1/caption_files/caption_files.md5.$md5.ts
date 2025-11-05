import { z } from "zod";
import { appFunction } from "@/util/appFunction.server";
import { db } from "@/sql-client.server";
import type { LookupCaptionFileByMd5Result } from "@editframe/api";

export const loader = appFunction(
  {
    requireCookieOrTokenSession: true,
    params: z.object({ md5: z.string() }),
  },
  async ({
    session,
    params,
  }): Promise<LookupCaptionFileByMd5Result> => {
    const captionFile = await db
      .selectFrom("video2.caption_files")
      .where("md5", "=", params.md5)
      .where("org_id", "=", session.oid)
      .select(["id", "filename", "byte_size", "org_id", "md5", "complete"])
      .executeTakeFirstOrThrow(() => {
        throw new Response("Not Found", { status: 404 });
      });

    return captionFile;
  },
);
