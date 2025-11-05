import { useFetcher } from "react-router";

import { Queue } from "@/queues/Queue";
import { requireAdminSession } from "@/util/requireAdminSession";
import { colorHash } from "@/util/colorHash";
import { Button } from "~/components/Button";
import { PaginatedTable } from "~/components/Table";

import type { Route } from "./+types/failedJobs";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  await requireAdminSession(request);
  const { name } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Not Found", { status: 404 });
  }

  const stats = await queue.getStats();

  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") || "10", 10);
  const page = Number.parseInt(url.searchParams.get("page") || "0", 10);
  const offset = page * limit;

  const jobs = await queue.getJobs("claimed", offset, limit);

  return {
    stats,
    jobs: jobs
      .sort((a, b) => a.jobId.localeCompare(b.jobId))
      .map((job) => ({
        id: job.jobId,
        attempts: job.attempts,
        workflowId: job.workflowId,
        workflow: job.workflow,
        orgId: job.orgId,
        queueName: queue.name,
        claimedAt: job.claimedAt,
      })),
  };
};

const ReleaseButton = ({
  id,
  queueName,
}: { id: string; queueName: string }) => {
  const fetcher = useFetcher<{ success: boolean }>({
    key: `release-job-${id}`,
  });
  const isLoading = fetcher.state !== "idle";

  return (
    <Button
      mode="action"
      confirmation={{
        title: "Release Job",
        description: "Are you sure you want to release this job?",
        confirmText: "Release",
        cancelText: "Cancel",
      }}
      onConfirm={() => {
        fetcher.submit(
          {},
          {
            method: "POST",
            action: `/admin/queues/${queueName}/jobs/${id}/release`,
          },
        );
      }}
      disabled={isLoading}
      loading={isLoading}
    >
      Release
    </Button>
  );
};

const ReleaseAllButton = ({ queueName }: { queueName: string }) => {
  const fetcher = useFetcher<{ success: boolean }>({
    key: `release-all-jobs-${queueName}`,
  });
  const isLoading = fetcher.state !== "idle";

  return (
    <Button
      mode="action"
      confirmation={{
        title: "Release All Jobs",
        description: "Are you sure you want to release all jobs?",
        confirmText: "Release",
        cancelText: "Cancel",
      }}
      onConfirm={() => {
        fetcher.submit(
          {},
          {
            method: "POST",
            action: `/admin/queues/${queueName}/jobs/release-all`,
          },
        );
      }}
      disabled={isLoading}
      loading={isLoading}
    >
      Release All
    </Button>
  );
};

export default function QueueComponent({
  loaderData: { stats, jobs },
  params: { name: queueName },
}: Route.ComponentProps) {
  return (
    <>
      <ReleaseAllButton queueName={queueName} />
      <PaginatedTable
        rows={jobs}
        rowKey="id"
        count={stats.claimed}
        emptyResultMessage="No jobs found"
        columns={[
          {
            name: "Release",
            content: ReleaseButton,
          },
          { name: "attempt", content: ({ attempts }) => <div>{attempts}</div> },
          {
            name: "id",
            content: ({ id }) => (
              <span
                className="rounded-full px-2 py-1 text-xs"
                style={{ backgroundColor: colorHash(id) }}
              >
                {id}
              </span>
            ),
          },
          { name: "orgId", content: ({ orgId }) => <div>{orgId}</div> },
          {
            name: "workflowId",
            content: ({ workflowId }) => <div>{workflowId}</div>,
          },
          {
            name: "workflow",
            content: ({ workflow }) => <div>{workflow}</div>,
          },
        ]}
      />
    </>
  );
}
