import { requireAdminSession } from "@/util/requireAdminSession";
import type { Route } from "./+types/deleteJob";
import { Queue } from "@/queues/Queue";
import { valkey } from "@/valkey/valkey";
import { getJob, deleteJob, JobStage } from "@/queues/Job";

export const action = async ({ request, params }: Route.ActionArgs) => {
  await requireAdminSession(request);
  const { name, id } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Queue not found", { status: 404 });
  }
  const job = await getJob(valkey, queue, id);
  if (!job) {
    throw new Response("Job not found", { status: 404 });
  }

  const stage = JobStage.safeParse(params.stage);
  if (!stage.success) {
    throw new Response("Stage not found", { status: 400 });
  }

  const success = await deleteJob(valkey, job, stage.data);

  return { success };
};
