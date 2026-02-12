import { requireAdminSession } from "@/util/requireAdminSession";
import type { Route } from "./+types/reprocessHtml";
import { Button } from "~/components/Button";
import { db } from "@/sql-client.server";
import { ProcessHTMLWorkflow } from "@/queues/units-of-work/ProcessHtml/Workflow";
import { ProcessHTMLInitializerQueue } from "@/queues/units-of-work/ProcessHtml/Initializer";
import { auditAdminAction } from "@/util/auditAdminAction";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdminSession(request);
  return null;
};

export const action = async ({ request }: Route.ActionArgs) => {
  const session = await requireAdminSession(request);
  const formData = await request.formData();
  const renderIds = formData.get("renderIds");
  if (!renderIds) {
    return { error: "No render ids provided" };
  }
  const renderIdsArray = renderIds
    .toString()
    .split("\n")
    .map((id) => id.trim())
    .filter((id) => id !== "");
  
  auditAdminAction(session, "reprocess-html", {
    renderCount: renderIdsArray.length,
    renderIds: renderIdsArray,
  });

  for (const id of renderIdsArray) {
    const render = await db
      .selectFrom("video2.renders")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst();
    if (!render?.html) {
      continue;
    }
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
      render,
      processHtml,
    });
    await ProcessHTMLWorkflow.enqueueJob({
      queue: ProcessHTMLInitializerQueue,
      orgId: processHtml.org_id,
      workflowId: processHtml.id,
      jobId: `${processHtml.id}-initializer`,
      payload: processHtml,
    });
  }
  return null;
};

export default function ReprocessHTML(_props: Route.ComponentProps) {
  return (
    <div>
      <h1>Reprocess HTML</h1>
      <p>Paste in list of render ids to reprocess, one per line</p>
      <form method="POST">
        <textarea className="w-full h-48" name="renderIds" />
        <Button mode="action" type="submit">
          Reprocess
        </Button>
      </form>
    </div>
  );
}
