import { sql, type Selectable } from "kysely";

import { Workflow } from "@/queues/Workflow";
import type { Video2Renders } from "@/sql-client.server/kysely-codegen";
import { valkey } from "@/valkey/valkey";
import { RenderFinalizerQueue } from "./Finalizer";
import { values } from "@/sql-client.server/values";

export const RenderWorkflow = new Workflow<Selectable<Video2Renders>>({
  name: "render",
  storage: valkey,
  finalizerQueue: RenderFinalizerQueue,
  processFailures: async (messages, db) => {
    await db
      .updateTable("video2.renders")
      .set({
        status: "failed",
        failed_at: new Date(),
        completed_at: null,
        failure_detail: sql`source.failure_detail::jsonb`,
      })
      .from(values(messages.map((message) => ({
        id: message.workflowId,
        failure_detail: message.details?.error,
      })), "source"))
      .where("video2.renders.id", "=", () => sql`source.id::uuid`)
      .executeTakeFirstOrThrow();
  },
});
