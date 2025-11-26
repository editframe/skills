import { storageProvider } from "@/util/storageProvider.server";
import { isobmffTrackFilePath } from "@/util/filePaths";
import { executeSpan } from "@/tracing";
import type { Selectable } from "kysely";
import type { Video2IsobmffTracks } from "@/sql-client.server/kysely-codegen";

import type { Route } from "./+types/delete_isobmff_tracks";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  return executeSpan("delete_isobmff_tracks", async (span) => {
    const payload = (await request.json()) as HasuraEvent<
      Selectable<Video2IsobmffTracks>
    >;
    span.setAttributes({
      payload: JSON.stringify(payload),
    });
    if (!payload.event.data.old) {
      return new Response("No OLD data in payload. Nothing to delete", {
        status: 400,
      });
    }
    const { track_id, file_id, org_id } = payload.event.data.old;

    const filePath = isobmffTrackFilePath({
      org_id,
      id: file_id,
      track_id: track_id,
    });

    await storageProvider.deletePath(filePath);

    return new Response("OK");
  });
};
