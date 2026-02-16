import type { Route } from "./+types/releaseAllJobs";
import { adminIdentityContext } from "~/middleware/context";
import { Queue } from "@/queues/Queue";
import { auditAdminAction } from "@/util/auditAdminAction";

export const action = async ({ request, context, params }: Route.ActionArgs) => {
  const session = context.get(adminIdentityContext);
  const { name } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Queue not found", { status: 404 });
  }

  await queue.releaseAllJobs();
  auditAdminAction(session, "release-all-jobs", { queue: name });

  return { success: true };
};
