import { z } from "zod";

import { db } from "@/sql-client.server";
import { apiIdentityContext } from "~/middleware/context";

import type { Route } from "./+types/transcribe";

const schema = z.object({
  trackId: z.coerce.number().optional(),
});

export const action = async ({
  params: { id },
  request,
  context,
}: Route.ActionArgs) => {
  const session = context.get(apiIdentityContext);
  const payload = schema.parse(await request.json());

  const file = await db
    .selectFrom("video2.files")
    .where("id", "=", id)
    .where("org_id", "=", session.oid)
    .where("type", "=", "video")
    .select(["id", "status"])
    .executeTakeFirstOrThrow(() => {
      throw new Response("Not Found", { status: 404 });
    });

  if (file.status !== "ready") {
    throw new Response("File is not ready for transcription", { status: 409 });
  }

  const audioTracks = await db
    .selectFrom("video2.isobmff_tracks")
    .where("file_id", "=", file.id)
    .where("type", "=", "audio")
    .select(["file_id", "track_id", "type"])
    .execute();

  const track =
    typeof payload.trackId === "number"
      ? audioTracks.find((t) => t.track_id === payload.trackId)
      : audioTracks[0];

  if (!track) {
    throw new Response("Audio track not found", { status: 400 });
  }

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
