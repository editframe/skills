import {
  CreateUnprocessedFilePayload,
  type CreateUnprocessedFileResult,
} from "@editframe/api";

import { storageProvider } from "@/util/storageProvider.server";
import { db } from "@/sql-client.server";
import { dataFilePath } from "@/util/filePaths";
import { v4 } from "uuid";

import type { Route } from "./+types/index";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const action = async ({ request }: Route.ActionArgs): Promise<CreateUnprocessedFileResult> => {
  const payload = CreateUnprocessedFilePayload.parse(await request.json());
  const session = await requireCookieOrTokenSession(request);
  const id = v4();
  const filePath = dataFilePath({
    org_id: session.oid,
    id,
  });

  const remoteUri = await storageProvider.createResumableUploadURI(filePath);

  const created = await db
    .insertInto("video2.unprocessed_files")
    .values({
      id,
      md5: payload.md5,
      org_id: session.oid,
      creator_id: session.uid,
      api_key_id: session.cid,
      filename: payload.filename,
      byte_size: payload.byte_size,
      remote_uri: remoteUri,
    })
    .returning([
      "id",
      "md5",
      "byte_size",
      "next_byte",
      "complete",
      "filename",
    ])
    .executeTakeFirst();

  if (!created) {
    throw new Error("Failed to create unprocessed file record");
  }

  return {
    id: created.id,
    md5: created.md5,
    complete: created.complete,
    byte_size: created.byte_size,
    next_byte: created.next_byte,
  }
};