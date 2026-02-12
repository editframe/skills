import { db } from "@/sql-client.server";
import { isobmffTrackFilePath } from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";
import {
  CreateISOBMFFTrackPayload,
  type CreateISOBMFFTrackResult,
} from "@editframe/api";

import type { Route } from "./+types/trackCreate";

export const action = async ({
  params: { id },
  request,
}: Route.ActionArgs): Promise<CreateISOBMFFTrackResult> => {
  const session = await requireCookieOrTokenSession(request);
  const payload = CreateISOBMFFTrackPayload.parse(await request.json());

  const file = await db
    .selectFrom("video2.files")
    .select(["id", "org_id", "type"])
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .executeTakeFirst();

  if (!file) {
    throw new Response("File not found", { status: 404 });
  }
  if (file.type !== "video") {
    throw new Response("Tracks can only be added to video files", {
      status: 400,
    });
  }

  const existing = await db
    .selectFrom("video2.isobmff_tracks")
    .select(["file_id", "track_id", "byte_size", "next_byte", "complete"])
    .where("file_id", "=", id)
    .where("track_id", "=", payload.track_id)
    .executeTakeFirst();

  if (existing) {
    return {
      file_id: existing.file_id,
      track_id: existing.track_id,
      byte_size: existing.byte_size,
      next_byte: existing.next_byte,
      complete: existing.complete,
    };
  }

  const filePath = isobmffTrackFilePath({
    org_id: session.oid,
    id,
    track_id: payload.track_id,
  });

  const remoteUri = await storageProvider.createResumableUploadURI(filePath);

  const created = await db
    .insertInto("video2.isobmff_tracks")
    .values({
      org_id: session.oid,
      file_id: id,
      track_id: payload.track_id,
      creator_id: session.uid,
      api_key_id: session.cid,
      type: payload.type,
      probe_info: payload.probe_info as any,
      duration_ms: payload.duration_ms,
      codec_name: payload.codec_name,
      byte_size: payload.byte_size,
      remote_uri: remoteUri,
    })
    .returning(["file_id", "track_id", "next_byte", "byte_size", "complete"])
    .executeTakeFirstOrThrow();

  return created;
};
