import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath } from "@/util/filePaths";
import { executeSpan } from "@/tracing";
import type { Selectable } from "kysely";
import type { Video2IsobmffFiles } from "@/sql-client.server/kysely-codegen";

import type { Route } from "./+types/delete_isobmff_files";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  return executeSpan("delete_isobmff_files", async (span) => {
    const payload = (await request.json()) as HasuraEvent<
      Selectable<Video2IsobmffFiles>
    >;
    span.setAttributes({
      payload: JSON.stringify(payload),
    });
    if (!payload.event.data.old) {
      return new Response("No OLD data in payload. Nothing to delete", {
        status: 400,
      });
    }
    const { id, org_id } = payload.event.data.old;

    const filePath = isobmffIndexFilePath({
      org_id,
      id,
    });
    await storageProvider.deletePath(filePath);

    return new Response("OK");
  });
};
