import { storageProvider } from "@/util/storageProvider.server";
import {
  dataFilePath,
  imageFilePath,
  isobmffIndexFilePath,
  captionsFilePath,
} from "@/util/filePaths";
import { executeSpan } from "@/tracing";
import type { Video2Files } from "@/sql-client.server/kysely-codegen";
import type { Selectable } from "kysely";

import type { Route } from "./+types/delete_files";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  return executeSpan("delete_files", async (span) => {
    const payload = (await request.json()) as HasuraEvent<
      Selectable<Video2Files>
    >;
    span.setAttributes({
      payload: JSON.stringify(payload),
    });
    if (!payload.event.data.old) {
      return new Response("No OLD data in payload. Nothing to delete", {
        status: 400,
      });
    }
    const { id, org_id, type } = payload.event.data.old;

    const deletions: Promise<void>[] = [];

    switch (type) {
      case "video": {
        deletions.push(
          storageProvider.deletePath(
            dataFilePath({ org_id, id }),
          ),
          storageProvider.deletePath(
            isobmffIndexFilePath({ org_id, id }),
          ),
        );
        break;
      }
      case "image": {
        deletions.push(
          storageProvider.deletePath(
            imageFilePath({ org_id, id }),
          ),
        );
        break;
      }
      case "caption": {
        deletions.push(
          storageProvider.deletePath(
            captionsFilePath({ org_id, id }),
          ),
        );
        break;
      }
    }

    await Promise.allSettled(deletions);

    return new Response("OK");
  });
};
