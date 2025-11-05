import {
  CreateImageFilePayload,
  type CreateImageFileResult,
} from "@editframe/api";
import { imageFilePath } from "@/util/filePaths";
import { db } from "@/sql-client.server";
import { storageProvider } from "@/util/storageProvider.server";
import { v4 } from "uuid";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

import type { Route } from "./+types/index";
export const action = async ({
  request,
}: Route.ActionArgs): Promise<CreateImageFileResult> => {
  const session = await requireCookieOrTokenSession(request);
  const payload = CreateImageFilePayload.parse(await request.json());

  const id = v4();
  const filePath = imageFilePath({
    org_id: session.oid,
    id,
  });

  const remoteUri = await storageProvider.createResumableUploadURI(filePath);

  const created = await db
    .insertInto("video2.image_files")
    .values({
      id,
      org_id: session.oid,
      creator_id: session.uid,
      api_key_id: session.cid ? session.cid : null,
      md5: payload.md5,
      filename: payload.filename,
      mime_type: payload.mime_type!,
      width: payload.width,
      height: payload.height,
      byte_size: payload.byte_size,
      remote_uri: remoteUri,
    })
    .returning(["id", "md5", "filename"])
    .executeTakeFirstOrThrow();

  return {
    id: created.id,
    byte_size: payload.byte_size,
    complete: false,
    md5: payload.md5 ?? null,
  };
};
