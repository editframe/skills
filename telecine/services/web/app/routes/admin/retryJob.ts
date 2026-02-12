import { requireAdminSession } from "@/util/requireAdminSession";
import type { Route } from "./+types/retryJob";
import { Queue } from "@/queues/Queue";
import { valkey } from "@/valkey/valkey";
import { getJob, retryJob } from "@/queues/Job";
import { auditAdminAction } from "@/util/auditAdminAction";

export const action = async ({ request, params }: Route.ActionArgs) => {
  const session = await requireAdminSession(request);
  const { name, id } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Queue not found", { status: 404 });
  }
  const job = await getJob(valkey, queue, id);
  if (!job) {
    throw new Response("Job not found", { status: 404 });
  }

  await retryJob(valkey, job);
  auditAdminAction(session, "retry-job", { queue: name, jobId: id });

  return { success: true };
};
