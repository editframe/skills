import { requireAdminSession } from "@/util/requireAdminSession";
import type { Route } from "./+types/releaseAllJobs";
import { Queue } from "@/queues/Queue";
import { auditAdminAction } from "@/util/auditAdminAction";

export const action = async ({ request, params }: Route.ActionArgs) => {
  const session = await requireAdminSession(request);
  const { name } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Queue not found", { status: 404 });
  }

  await queue.releaseAllJobs();
  auditAdminAction(session, "release-all-jobs", { queue: name });

  return { success: true };
};
