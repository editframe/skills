import type { Route } from "./+types/releaseJob";
import { adminIdentityContext } from "~/middleware/context";
import { Queue } from "@/queues/Queue";
import { valkey } from "@/valkey/valkey";
import { getJob, releaseJob } from "@/queues/Job";
import { auditAdminAction } from "@/util/auditAdminAction";

export const action = async ({ request, context, params }: Route.ActionArgs) => {
  const session = context.get(adminIdentityContext);
  const { name, id } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Queue not found", { status: 404 });
  }
  const job = await getJob(valkey, queue, id);
  if (!job) {
    throw new Response("Job not found", { status: 404 });
  }

  await releaseJob(valkey, job);
  auditAdminAction(session, "release-job", { queue: name, jobId: id });

  return { success: true };
};
