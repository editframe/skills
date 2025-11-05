import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import type { TranscribeISOBMFFFileResult } from "@editframe/api";
import { db } from "@/sql-client.server";
import { z } from "zod";

import type { Route } from "./+types/transcribe";
import { requireCookieOrTokenSession } from "@/util/requireSession.server";

const schema = z.object({
  trackId: z.coerce.number(),
});

export const action = async ({
  params: { id },
  request,
}: Route.ActionArgs): Promise<TranscribeISOBMFFFileResult> => {
  const session = await requireCookieOrTokenSession(request);
  const payload = schema.parse(await request.json());
  // Verify the file exists and belongs to the org
  const file = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
        query GetIsobmffFile($id: uuid!) {
          result: video2_isobmff_files_by_pk(id: $id) {
            id
            isobmff_tracks(where: { type: { _eq: audio }}) {
              file_id
              track_id
              type
            }
          }
        }
      `),
    { id },
  );

  const audioTracks = file.isobmff_tracks.filter(
    (track) => track.type === "audio",
  );

  const track =
    typeof payload.trackId === "number"
      ? audioTracks.find(
        (audioTrack) => audioTrack.track_id === payload.trackId,
      )
      : audioTracks[0];

  if (!track) {
    throw new Response("Audio track not found", {
      status: 400,
    });
  }

  // Create transcription request or get existing one
  const transcriptionRecord = await db
    .insertInto("video2.transcriptions")
    .values({
      file_id: file.id,
      track_id: track.track_id,
      api_key_id: session.cid,
      org_id: session.oid,
      creator_id: session.uid,
      status: "pending",
      work_slice_ms: 30_000,
    })
    .onConflict((oc) => oc.columns(["file_id", "track_id"]).doNothing())
    .returning(["id", "file_id", "track_id"])
    .executeTakeFirstOrThrow();

  return transcriptionRecord;
};
