import { Queue } from "@/queues/Queue";
import { requireAdminSession } from "@/util/requireAdminSession";

import type { Route } from "./+types/completedJobs";
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

  const jobs = await queue.getJobs("completed", offset, limit);
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

const ReplayButton = ({ id, queueName }: { id: string; queueName: string }) => {
  const fetcher = useFetcher<{ success: boolean }>({
    key: `replay-job-${id}`,
  });
  const isLoading = fetcher.state !== "idle";

  return (
    <Button
      mode="action"
      confirmation={{
        title: "Replay Job",
        description: "Are you sure you want to replay this job?",
        confirmText: "Replay",
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
      Replay
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

const Actions = ({ id, queueName }: { id: string; queueName: string }) => {
  return (
    <>
      <ReplayButton id={id} queueName={queueName} />
      <DeleteButton id={id} queueName={queueName} />
    </>
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
            action: `/admin/queues/${queueName}/jobs/delete-all-completed`,
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
      <DeleteAllButton queueName={queueName} />
      <PaginatedTable
        rows={jobs}
        rowKey="id"
        count={stats.completed}
        emptyResultMessage="No jobs found"
        columns={[
          {
            name: "Actions",
            content: Actions,
          },
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
    </>
  );
}
