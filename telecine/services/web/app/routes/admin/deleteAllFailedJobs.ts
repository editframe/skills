import { Queue } from "@/queues/Queue";
import { adminIdentityContext } from "~/middleware/context";
import { auditAdminAction } from "@/util/auditAdminAction";

import type { Route } from "./+types/deleteAllFailedJobs";

export const action = async ({ request, context, params }: Route.ActionArgs) => {
  const session = context.get(adminIdentityContext);
  const { name } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Queue not found", { status: 404 });
  }

  await queue.deleteAllFailedJobs();
  auditAdminAction(session, "delete-all-failed-jobs", { queue: name });

  return { success: true };
};
