import { requireQueryAs } from "@/graphql.server/userClient";
import { isobmffTrackFilePath } from "@/util/filePaths";
import { appFunction } from "@/util/appFunction.server";
import { z } from "zod";
import {
  storageProvider,
  type StorageStreamOptions,
} from "@/util/storageProvider.server";
import { graphql } from "@/graphql";
import { createReadableStreamFromReadable } from "@react-router/node";

const paramsSchema = z.object({
  id: z.string().uuid(),
  track: z.string(),
});

export const loader = appFunction(
  {
    requireSession: true,
    params: paramsSchema,
  },
  async ({ params, request, session }) => {
    const file = await requireQueryAs(
      session,
      "org-reader",
      graphql(`
      query GetIsobmffFile($id: uuid!, $track: Int!) {
        result: video2_isobmff_files_by_pk(id: $id) {
          id
          org_id
          isobmff_tracks(where: { track_id: { _eq: $track } }) {
            track_id
            byte_size
          }
        }
      }
    `),
      { id: params.id, track: Number.parseInt(params.track, 10) },
    );

    const track = file.isobmff_tracks[0];

    if (!track) {
      return new Response("Not found", { status: 404 });
    }

    const range = request.headers.get("Range");
    let streamOptions: StorageStreamOptions = { start: 0, end: undefined };

    if (range) {
      const [startStr, endStr] = range.replace("bytes=", "").split("-");
      const start = Number(startStr);
      const end = endStr ? Number(endStr) : undefined;
      streamOptions = { start, end };
    }

    const readStream = await storageProvider.createReadStream(
      isobmffTrackFilePath({
        org_id: file.org_id,
        id: file.id,
        track_id: Number.parseInt(params.track, 10),
      }),
      streamOptions,
    );

    if (range) {
      const length = streamOptions.end
        ? streamOptions.end - streamOptions.start + 1
        : track.byte_size - streamOptions.start;

      return new Response(createReadableStreamFromReadable(readStream), {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Range": `bytes ${streamOptions.start}-${streamOptions.end ?? "*"}/*`,
          "Content-Length": length.toString(),
          "Accept-Ranges": "bytes",
        },
      });
    }

    return new Response(createReadableStreamFromReadable(readStream), {
      headers: {
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
      },
    });
  },
);
