import { Queue } from "@/queues/Queue";
import { requireAdminSession } from "@/util/requireAdminSession";

import type { Route } from "./+types/failedJobs";
import { PaginatedTable } from "~/components/Table";
import { Button } from "~/components/Button";
import { useFetcher } from "react-router";

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

  const jobs = await queue.getJobs("failed", offset, limit);
  return {
    stats,
    jobs: jobs.map((job) => ({
      id: job.jobId,
      attempts: job.attempts,
      workflowId: job.workflowId,
      workflow: job.workflow,
      orgId: job.orgId,
      queueName: queue.name,
    })),
  };
};

const Actions = ({ id, queueName }: { id: string; queueName: string }) => {
  return (
    <>
      <RetryButton id={id} queueName={queueName} />
      <DeleteButton id={id} queueName={queueName} />
    </>
  );
};

const RetryButton = ({ id, queueName }: { id: string; queueName: string }) => {
  const fetcher = useFetcher<{ success: boolean }>({
    key: `retry-job-${id}`,
  });
  const isLoading = fetcher.state !== "idle";

  return (
    <Button
      mode="action"
      confirmation={{
        title: "Retry Job",
        description: "Are you sure you want to retry this job?",
        confirmText: "Retry",
        cancelText: "Cancel",
      }}
      onConfirm={() => {
        fetcher.submit(
          {},
          {
            method: "POST",
            action: `/admin/queues/${queueName}/jobs/${id}/retry`,
          },
        );
      }}
      disabled={isLoading}
      loading={isLoading}
    >
      Retry
    </Button>
  );
};

const DeleteButton = ({ id, queueName }: { id: string; queueName: string }) => {
  const fetcher = useFetcher<{ success: boolean }>({
    key: `delete-job-${id}`,
  });
  const isLoading = fetcher.state !== "idle";

  return (
    <Button
      mode="destructive"
      confirmation={{
        title: "Delete Job",
        description: "Are you sure you want to delete this job?",
        confirmText: "Delete",
        cancelText: "Cancel",
      }}
      onConfirm={() => {
        fetcher.submit(
          {},
          {
            method: "POST",
            action: `/admin/queues/${queueName}/failed/jobs/${id}/delete`,
          },
        );
      }}
      disabled={isLoading}
      loading={isLoading}
    >
      Delete
    </Button>
  );
};

const RetryAllButton = ({ queueName }: { queueName: string }) => {
  const fetcher = useFetcher<{ success: boolean }>({
    key: `retry-all-jobs-${queueName}`,
  });
  const isLoading = fetcher.state !== "idle";

  return (
    <Button
      mode="action"
      confirmation={{
        title: "Retry All Jobs",
        description: "Are you sure you want to retry all jobs?",
        confirmText: "Retry",
        cancelText: "Cancel",
      }}
      onConfirm={() => {
        fetcher.submit(
          {},
          {
            method: "POST",
            action: `/admin/queues/${queueName}/jobs/retry-all`,
          },
        );
      }}
      disabled={isLoading}
      loading={isLoading}
    >
      Retry All
    </Button>
  );
};

const DeleteAllButton = ({ queueName }: { queueName: string }) => {
  const fetcher = useFetcher<{ success: boolean }>({
    key: `delete-all-jobs-${queueName}`,
  });
  const isLoading = fetcher.state !== "idle";

  return (
    <Button
      mode="destructive"
      confirmation={{
        title: "Delete All Jobs",
        description: "Are you sure you want to delete all jobs?",
        confirmText: "Delete",
        cancelText: "Cancel",
      }}
      onConfirm={() => {
        fetcher.submit(
          {},
          {
            method: "POST",
            action: `/admin/queues/${queueName}/jobs/delete-all-failed`,
          },
        );
      }}
      disabled={isLoading}
      loading={isLoading}
    >
      Delete All
    </Button>
  );
};

export default function QueueComponent({
  loaderData: { stats, jobs },
  params: { name: queueName },
}: Route.ComponentProps) {
  return (
    <>
      <RetryAllButton queueName={queueName} />
      <DeleteAllButton queueName={queueName} />
      <PaginatedTable
        rows={jobs}
        rowKey="id"
        count={stats.failed}
        emptyResultMessage="No jobs found"
        columns={[
          {
            name: "Retry",
            content: Actions,
          },
          { name: "attempt", content: ({ attempts }) => <div>{attempts}</div> },
          { name: "id", content: ({ id }) => <div>{id}</div> },
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
