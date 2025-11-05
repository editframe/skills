import { requireAdminSession } from "@/util/requireAdminSession";
import { Queue } from "@/queues/Queue";

import type { Route } from "./+types/retryAllJobs";

export const action = async ({ request, params }: Route.ActionArgs) => {
  await requireAdminSession(request);
  const { name } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Queue not found", { status: 404 });
  }

  await queue.retryAllJobs();

  return { success: true };
};
