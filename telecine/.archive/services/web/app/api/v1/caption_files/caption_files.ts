import { appFunction } from "@/util/appFunction.server";
import {
  CreateCaptionFilePayload,
  type CreateCaptionFileResult,
} from "@editframe/api";
import { db } from "@/sql-client.server";

export const action = appFunction(
  {
    requireCookieOrTokenSession: true,
    validatePayload: CreateCaptionFilePayload,
  },
  async ({ session, payload }): Promise<CreateCaptionFileResult> => {
    const created = await db
      .insertInto("video2.caption_files")
      .values({
        md5: payload.md5,
        org_id: session.oid,
        creator_id: session.uid,
        api_key_id: session.cid,
        filename: payload.filename,
        byte_size: payload.byte_size,
      })
      .returning(["id", "md5", "filename"])
      .executeTakeFirstOrThrow();

    return {
      id: created.id,
      md5: payload.md5,
      complete: false,
    };
  },
);
