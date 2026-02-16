import {
  CreateISOBMFFFilePayload,
  type CreateISOBMFFFileResult,
} from "@editframe/api";
import { db } from "@/sql-client.server";
import type { Route } from "./+types/index";
import { apiIdentityContext } from "~/middleware/context";

export const action = async ({
  request,
  context,
}: Route.ActionArgs): Promise<CreateISOBMFFFileResult> => {
  const session = context.get(apiIdentityContext);
  const payload = CreateISOBMFFFilePayload.parse(await request.json());
  return db
    .insertInto("video2.isobmff_files")
    .values({
      md5: payload.md5,
      org_id: session.oid,
      creator_id: session.uid,
      api_key_id: session.cid,
      filename: payload.filename,
    })
    .returning(["id", "md5", "filename", "fragment_index_complete"])
    .executeTakeFirstOrThrow();
};
