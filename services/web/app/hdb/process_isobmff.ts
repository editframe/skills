import { executeSpan } from "@/tracing";
import type { Selectable } from "kysely";
import type { Video2ProcessIsobmff } from "@/sql-client.server/kysely-codegen";

import type { Route } from "./+types/process_isobmff";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";
import { ProcessISOBMFFQueue } from "@/queues/units-of-work/ProcessIsobmff";
import { ProcessISOBMFFWorkflow } from "@/queues/units-of-work/ProcessIsobmff";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  return executeSpan("process_isobmff", async () => {
    const payload = (await request.json()) as HasuraEvent<
      Selectable<Video2ProcessIsobmff>
    >;

    await ProcessISOBMFFWorkflow.enqueueJob({
      queue: ProcessISOBMFFQueue,
      orgId: payload.event.data.new.org_id,
      workflowId: payload.event.data.new.id,
      jobId: payload.event.data.new.id,
      payload: payload.event.data.new,
    });

    return new Response("OK");
  });
};
