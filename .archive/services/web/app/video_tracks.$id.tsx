import { graphql } from "@/graphql";
import { queryAs } from "@/graphql.server";
import { type ActionFunctionArgs } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { createReadStream } from "node:fs";
import {
  UPLOAD_TO_BUCKET,
  createUploadReadStream,
} from "@/util/storageProvider.server";
import { Features, featureGate } from "@/util/features.server";

import { requireSession } from "@/util/requireSession";
import { parseRequestSession } from "@/util/session.server";
import { logger } from "@/logging";

export const loader = featureGate(
  Features.UPLOADS,
  requireSession(async function action(args: ActionFunctionArgs) {
    const sessionInfo = await parseRequestSession(args.request);
    const result = await queryAs(
      sessionInfo!,
      "org-reader",
      graphql(`
        query VerifyVideoTrackAccess($id: uuid!) {
          video_tracks_by_pk(id: $id) {
            id
            format
            bytesize
          }
        }
      `),
      { id: args.params.id! },
    );

    if (result.error) {
      logger.error(result.error, "Error verifying video track access");
      return new Response(null, { status: 500 });
    }

    const videoTrack = result.data?.video_tracks_by_pk;
    if (!videoTrack) {
      return new Response(null, { status: 404 });
    }

    if (UPLOAD_TO_BUCKET) {
      const readStream = createUploadReadStream(
        `video_tracks/${args.params.id!}.${videoTrack.format}`,
      );
      return new Response(createReadableStreamFromReadable(readStream), {
        headers: {
          "content-length": String(videoTrack.bytesize),
        },
      });
    }
    const readStream = createReadStream(
      `./data/video_tracks/${args.params.id!}`,
    );

    return new Response(createReadableStreamFromReadable(readStream), {
      headers: {
        "content-length": String(videoTrack.bytesize),
      },
    });
  }),
);
