import { graphql } from "@/graphql";
import { queryAs, requireQueryAs } from "@/graphql.server/userClient";
import {
  CreateISOBMFFTrackPayload,
  type CreateISOBMFFTrackResult,
} from "@editframe/api";
import { storageProvider } from "@/util/storageProvider.server";
import { db } from "@/sql-client.server";
import { isobmffTrackFilePath } from "@/util/filePaths";

import type { Route } from "./+types/create";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

export const action = async ({
  request
}: Route.ActionArgs): Promise<CreateISOBMFFTrackResult> => {
  const session = await requireCookieOrTokenSession(request);
  const payload = CreateISOBMFFTrackPayload.parse(await request.json());
  const found = await queryAs(
    session,
    "org-editor",
    graphql(`
        query GetTrack ($file_id: uuid!, $track_id: Int!) {
          found: video2_isobmff_tracks_by_pk(
            file_id: $file_id
            track_id: $track_id
          ) {
            file_id
            track_id
            byte_size
            next_byte
            complete
            isobmff_file {
              filename
              md5
            }
          }
        }
      `),
    { file_id: payload.file_id, track_id: payload.track_id },
  );

  const foundRecord = found.data?.found;

  if (foundRecord) {
    return {
      next_byte: foundRecord.next_byte,
      byte_size: foundRecord.byte_size,
      complete: foundRecord.complete,
      track_id: foundRecord.track_id,
      file_id: foundRecord.file_id,
    };
  }

  const isoFile = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
        query GetISOBMFFFile ($id: uuid!) {
          result: video2_isobmff_files_by_pk(id: $id) {
            id
            filename
          }
        }
      `),
    { id: payload.file_id },
  );

  const filePath = isobmffTrackFilePath({
    org_id: session.oid,
    id: isoFile.id,
    track_id: payload.track_id,
  });

  const remoteUri = await storageProvider.createResumableUploadURI(filePath);

  const created = await db
    .insertInto("video2.isobmff_tracks")
    .values({
      org_id: session.oid,
      file_id: payload.file_id,
      track_id: payload.track_id,
      creator_id: session.uid,
      api_key_id: session.cid,
      type: payload.type,
      // FIXME: This should not be asserted, but the payload must be re-typed as
      // any to satisfy kysely.
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
