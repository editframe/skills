import { storageProvider } from "@/util/storageProvider.server";
import { captionsFilePath } from "@/util/filePaths";
import type { Selectable } from "kysely";
import type { Video2CaptionFiles } from "@/sql-client.server/kysely-codegen";
import { executeSpan } from "@/tracing";

import type { Route } from "./+types/delete_caption_files";
import { requireActionSecret } from "@/util/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecret(request);
  return executeSpan("delete_caption_files", async (span) => {
    const payload = await request.json() as HasuraEvent<Selectable<Video2CaptionFiles>>;
    if (!payload.event.data.old) {
      return new Response("No OLD data in payload. Nothing to delete", { status: 400 });
    }
    span.setAttributes({
      payload: JSON.stringify(payload),
    });
    const { id, org_id } = payload.event.data.old;

    const filePath = captionsFilePath({
      org_id,
      id,
    });

    await storageProvider.deletePath(filePath);

    return new Response("OK");
  });
};
