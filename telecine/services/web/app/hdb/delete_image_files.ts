import { storageProvider } from "@/util/storageProvider.server";
import { imageFilePath } from "@/util/filePaths";
import { executeSpan } from "@/tracing";
import type { Video2ImageFiles } from "@/sql-client.server/kysely-codegen";
import type { Selectable } from "kysely";

import type { Route } from "./+types/delete_image_files";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  return executeSpan("delete_image_files", async (span) => {
    const payload = await request.json() as HasuraEvent<Selectable<Video2ImageFiles>>;
    span.setAttributes({
      payload: JSON.stringify(payload),
    });
    if (!payload.event.data.old) {
      return new Response("No OLD data in payload. Nothing to delete", { status: 400 });
    }
    const { id, org_id } = payload.event.data.old;

    const filePath = imageFilePath({
      org_id: org_id,
      id: id,
    });
    await storageProvider.deletePath(filePath);

    return new Response("OK");
  });
}
