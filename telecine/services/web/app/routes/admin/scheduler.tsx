import { Worker } from "@/queues/Worker";
import { Queue, type QueueStats } from "@/queues/Queue";

import { Table } from "~/components/Table";
import clsx from "clsx";

import { AutoRefresh } from "./AutoRefresh";

import type { Route } from "./+types/scheduler";

export const loader = async (_args: Route.LoaderArgs) => {
  const queues: [string, QueueStats][] = [];
  for (const [name, queue] of Queue.byName) {
    queues.push([name, await queue.getStats()]);
  }
  const workLoops = await Worker.getWorkLoops();

  return { queues, workLoops };
};

interface QueueRowData {
  id: string;
  name: string;
  queued: number;
  claimed: number;
  stalled: number;
  completed: number;
  failed: number;
}

function QueuesTable({ queues }: { queues: [string, QueueStats][] }) {
  const queueRows = queues.map(([queueName, stats]) => ({
    id: queueName,
    name: queueName,
    ...stats,
  }));

  return (
    <div>
      <h1 className="text-lg font-medium mb-2">Queues</h1>
      <Table
        rows={queueRows}
        emptyResultMessage="queues"
        buildRowURL={(row) => {
          return `/admin/queues/${row.id}`;
        }}
        columns={[
          {
            name: "Queue",
            content: ({ name }: QueueRowData) => (
              <span
                className={clsx(
                  "text-xs px-2 py-1 rounded-lg inline-block transition-colors",
                  "bg-blue-50 dark:bg-blue-900/30",
                  "text-blue-900 dark:text-blue-100",
                )}
              >
                {name}
              </span>
            ),
          },
          {
            name: "Queued",
            content: ({ queued }: QueueRowData) => <code>{queued}</code>,
          },
          {
            name: "Claimed",
            content: ({ claimed }: QueueRowData) => <code>{claimed}</code>,
          },
          {
            name: "Stalled",
            content: ({ stalled }: QueueRowData) => <code>{stalled}</code>,
          },
          {
            name: "Completed",
            content: ({ completed }: QueueRowData) => <code>{completed}</code>,
          },
          {
            name: "Failed",
            content: ({ failed }: QueueRowData) => <code>{failed}</code>,
          },
        ]}
      />
    </div>
  );
}

function WorkLoopsTable({
  workLoops,
}: {
  workLoops: Awaited<ReturnType<typeof Worker.getWorkLoops>>;
}) {
  return (
    <div>
      <h1 className="text-lg font-medium mb-2">Work Loops</h1>
      <Table
        rows={workLoops}
        emptyResultMessage="workloops"
        columns={[
          { name: "Queue", content: ({ queue }) => queue },
          {
            name: "Active Loops",
            content: ({ loopIds }) => <code>{loopIds.length}</code>,
          },
        ]}
      />
    </div>
  );
}

export default function Scheduler({
  loaderData: { queues, workLoops },
}: Route.ComponentProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AutoRefresh />
      </div>
      <QueuesTable queues={queues} />
      <WorkLoopsTable workLoops={workLoops} />
    </div>
  );
}
