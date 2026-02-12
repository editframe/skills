import { z } from "zod";

import { db } from "@/sql-client.server";
import { dataFilePath } from "@/util/filePaths";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";
import { storageProvider } from "@/util/storageProvider.server";
import { v4 } from "uuid";

import type { Route } from "./+types/index";

const FileType = z.enum(["video", "image", "caption"]);

const CreateFilePayload = z.object({
  filename: z.string(),
  type: FileType,
  byte_size: z.number().int().positive(),
  md5: z.string().optional(),
  mime_type: z.string().optional(),
});

export interface CreateFileResult {
  id: string;
  filename: string;
  type: string;
  status: string;
  byte_size: number | null;
  md5: string | null;
  next_byte: number;
}

export const action = async ({
  request,
}: Route.ActionArgs): Promise<CreateFileResult> => {
  const payload = CreateFilePayload.parse(await request.json());
  const session = await requireCookieOrTokenSession(request);
  const id = v4();

  const filePath = dataFilePath({
    org_id: session.oid,
    id,
  });

  const remoteUri = await storageProvider.createResumableUploadURI(filePath);

  const created = await db
    .insertInto("video2.files")
    .values({
      id,
      org_id: session.oid,
      creator_id: session.uid,
      api_key_id: session.cid,
      filename: payload.filename,
      type: payload.type,
      byte_size: payload.byte_size,
      md5: payload.md5 ?? null,
      mime_type: payload.mime_type ?? null,
      remote_uri: remoteUri,
      status: "created",
    })
    .returning([
      "id",
      "filename",
      "type",
      "status",
      "byte_size",
      "md5",
      "next_byte",
    ])
    .executeTakeFirstOrThrow();

  return created;
};
