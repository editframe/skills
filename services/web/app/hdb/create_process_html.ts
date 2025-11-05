import { executeSpan } from "@/tracing";
import type { Video2Renders } from "@/sql-client.server/kysely-codegen";
import type { Selectable } from "kysely";

import type { Route } from "./+types/create_process_html.ts";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";
import { db } from "@/sql-client.server";
import { ProcessHTMLInitializerQueue } from "@/queues/units-of-work/ProcessHtml/Initializer.ts";
import { ProcessHTMLWorkflow } from "@/queues/units-of-work/ProcessHtml/Workflow.ts";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  return executeSpan("process_html", async () => {
    const {
      event: {
        data: { new: render },
      },
    } = (await request.json()) as HasuraEvent<Selectable<Video2Renders>>;

    if (render.html) {
      const processHtml = await db
        .insertInto("video2.process_html")
        .values({
          html: render.html,
          org_id: render.org_id,
          creator_id: render.creator_id,
          api_key_id: render.api_key_id,
          render_id: render.id,
          started_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await ProcessHTMLWorkflow.setWorkflowData(processHtml.id, {
        processHtml,
        render,
      });

      await ProcessHTMLWorkflow.enqueueJob({
        queue: ProcessHTMLInitializerQueue,
        orgId: processHtml.org_id,
        workflowId: processHtml.id,
        jobId: `${processHtml.id}-initializer`,
        payload: processHtml,
      });
    }

    return new Response("OK");
  });
};
