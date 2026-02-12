import { requireAdminSession } from "@/util/requireAdminSession";
import { Queue } from "@/queues/Queue";
import { auditAdminAction } from "@/util/auditAdminAction";

import type { Route } from "./+types/deleteAllCompletedJobs";

export const action = async ({ request, params }: Route.ActionArgs) => {
  const session = await requireAdminSession(request);
  const { name } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Queue not found", { status: 404 });
  }

  await queue.deleteAllCompletedJobs();
  auditAdminAction(session, "delete-all-completed-jobs", { queue: name });

  return { success: true };
};
