import { Queue } from "@/queues/Queue";
import { JobStage } from "@/queues/Job";

import type { Route } from "./+types/queueJobs";
import { PaginatedTable } from "~/components/Table";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { name, stage } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Not Found", { status: 404 });
  }

  const stats = await queue.getStats();

  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") || "10", 10);
  const page = Number.parseInt(url.searchParams.get("page") || "0", 10);
  const offset = page * limit;
  const jobStage = JobStage.parse(stage);

  const jobs = await queue.getJobs(jobStage, offset, limit);
  return {
    stats,
    jobStage,
    jobs: jobs.map((job) => ({
      id: job.jobId,
      attempts: job.attempts,
      workflowId: job.workflowId,
      workflow: job.workflow,
      orgId: job.orgId,
    })),
  };
};

export default function QueueComponent({
  loaderData: { stats, jobs, jobStage },
}: Route.ComponentProps) {
  return (
    <PaginatedTable
      rows={jobs}
      count={stats[jobStage]}
      emptyResultMessage="No jobs found"
      columns={[
        { name: "attempt", content: ({ attempts }) => <div>{attempts}</div> },
        { name: "id", content: ({ id }) => <div>{id}</div> },
        { name: "orgId", content: ({ orgId }) => <div>{orgId}</div> },
        {
          name: "workflowId",
          content: ({ workflowId }) => <div>{workflowId}</div>,
        },
        { name: "workflow", content: ({ workflow }) => <div>{workflow}</div> },
      ]}
    />
  );
}
