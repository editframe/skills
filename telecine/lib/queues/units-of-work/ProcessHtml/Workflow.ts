import { Workflow } from "@/queues/Workflow";
import type {
  Video2ProcessHtml,
  Video2Renders,
} from "@/sql-client.server/kysely-codegen";
import { valkey } from "@/valkey/valkey";
import { sql, type Selectable } from "kysely";
import { ProcessHTMLFinalizerQueue } from "./Finalizer";
import { values } from "@/sql-client.server/values";
import { logger } from "@/logging";

export interface ProcessHTMLWorkflowData {
  processHtml: Selectable<Video2ProcessHtml>;
  render: Selectable<Video2Renders>;
}

export const ProcessHTMLWorkflow = new Workflow<ProcessHTMLWorkflowData>({
  name: "process-html",
  storage: valkey,
  finalizerQueue: ProcessHTMLFinalizerQueue,
  processFailures: async (messages, db) => {
    // WE GET HERE, but the sql is not working
    logger.info({ messages }, "Processing html workflow failures");
    const now = new Date();
    await db.updateTable("video2.process_html")
      .set({
        failed_at: now,
        completed_at: null,
      })
      // @ts-expect-error we don't have the correct types here yet
      .where("id", "in", messages.map((message) => message.details?.workflow?.processHtml?.id))
      .executeTakeFirstOrThrow();

    await db
      .updateTable("video2.renders")
      .set({
        status: "failed",
        failed_at: now,
        failure_detail: sql`source.failure_detail::jsonb`,
        completed_at: null,
      })
      .from(values(messages.map((message) => ({
        // @ts-expect-error we don't have the correct types here yet
        id: message.details?.workflow?.render?.id,
        failure_detail: JSON.stringify(message.details?.error),
      })), "source"))
      .where("video2.renders.id", "=", () => sql`source.id::uuid`)
      .executeTakeFirstOrThrow();
  },
});
