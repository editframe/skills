import { Worker } from "@/queues/Worker";
import { appScheduler } from "@/queues/createSchedulerServer";
import { requireAdminSession } from "@/util/requireAdminSession";

import { Table } from "~/components/Table";
import { TimeAgoInWords } from "~/ui/timeAgoInWords";
import clsx from "clsx";

import { AutoRefresh } from "./AutoRefresh";

import type { Route } from "./+types/scheduler";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdminSession(request);

  const queues = Object.entries(await appScheduler.getQueuesInfo());
  const schedulers = await appScheduler.getUmergedSchedulersInfo();
  const workLoops = await Worker.getWorkLoops();

  return { queues, schedulers, workLoops };
};

interface SchedulerRowData {
  id: string;
  isSchedulerRow?: boolean;
  isQueueRow?: boolean;
  stopped?: boolean;
  createdAt?: string;
  lastUpdate?: string;
  stats?: {
    connecting: number;
    connected: number;
    disconnecting: number;
  };
  queueName?: string;
  queueStat?: {
    connecting: number;
    connected: number;
    disconnecting: number;
    stalled: number;
    scalingInfo?: {
      rawTarget: number;
      smoothedTarget: number;
      actualTarget: number;
      workingConnections: number;
      naturalQueueDepth: number;
    };
  };
  schedulerId?: string;
}

interface QueueRowData {
  id: string;
  name: string;
  connections: number;
  queued: number;
  claimed: number;
  stalled: number;
  completed: number;
  failed: number;
}

function SchedulersTable({ schedulers }: { schedulers: any[] }) {
  // Extract all unique queue names from schedulers' queueStats
  const allQueueNames = [
    ...new Set(
      schedulers.flatMap((scheduler) =>
        scheduler.queueStats ? Object.keys(scheduler.queueStats) : [],
      ),
    ),
  ].sort();

  // Create expanded rows data structure that includes both scheduler summary rows
  // and detailed queue connection rows
  const expandedRows = schedulers.flatMap((scheduler) => {
    // First add the scheduler summary row
    const rows = [
      {
        ...scheduler,
        id: scheduler.id,
        isSchedulerRow: true,
      },
    ];

    // Then add queue detail rows for this scheduler
    if (scheduler.queueStats && Object.keys(scheduler.queueStats).length > 0) {
      allQueueNames.forEach((queueName) => {
        const queueStat = scheduler.queueStats?.[queueName];
        if (queueStat) {
          rows.push({
            id: `${scheduler.id}-${queueName}`,
            schedulerId: scheduler.id,
            queueName,
            queueStat,
            isQueueRow: true,
          });
        }
      });
    }

    return rows;
  });

  return (
    <div>
      <h1 className="text-lg font-medium mb-2">Schedulers</h1>
      <Table
        rows={expandedRows}
        rowKey="id"
        emptyResultMessage="schedulers"
        columns={[
          {
            name: "ID",
            content: (row: SchedulerRowData) => {
              if (row.isSchedulerRow) {
                return <span className="font-medium">{row.id}</span>;
              }
              return (
                <span className={clsx(
                  "pl-6 text-xs transition-colors",
                  "text-slate-600 dark:text-slate-400"
                )}>
                  {row.queueName}
                </span>
              );
            },
          },
          {
            name: "Running",
            content: (row: SchedulerRowData) => {
              if (row.isSchedulerRow) {
                return (
                  <div
                    className={`w-3 h-3 rounded-full ${!row.stopped ? "bg-green-500" : "bg-red-500"}`}
                  />
                );
              }
              return null;
            },
          },
          {
            name: "Created",
            content: (row: SchedulerRowData) => {
              if (row.isSchedulerRow && row.createdAt) {
                return <TimeAgoInWords date={row.createdAt} />;
              }
              return null;
            },
          },
          {
            name: "Updated",
            content: (row: SchedulerRowData) => {
              if (row.isSchedulerRow && row.lastUpdate) {
                return <TimeAgoInWords date={row.lastUpdate} />;
              }
              return null;
            },
          },
          {
            name: "Connecting",
            content: (row: SchedulerRowData) => {
              if (row.isSchedulerRow) {
                return <code>{row.stats?.connecting}</code>;
              }
              if (row.isQueueRow) {
                return <code>{row.queueStat?.connecting}</code>;
              }
              return null;
            },
          },
          {
            name: "Connected",
            content: (row: SchedulerRowData) => {
              if (row.isSchedulerRow) {
                return <code>{row.stats?.connected}</code>;
              }
              if (row.isQueueRow) {
                return <code>{row.queueStat?.connected}</code>;
              }
              return null;
            },
          },
          {
            name: "Disconnecting",
            content: (row: SchedulerRowData) => {
              if (row.isSchedulerRow) {
                return <code>{row.stats?.disconnecting}</code>;
              }
              if (row.isQueueRow) {
                return <code>{row.queueStat?.disconnecting}</code>;
              }
              return null;
            },
          },
          {
            name: "Demand",
            content: (row: SchedulerRowData) => {
              if (row.isQueueRow && row.queueStat?.scalingInfo) {
                return <code>{row.queueStat.scalingInfo.naturalQueueDepth}</code>;
              }
              return null;
            },
          },
          {
            name: "Target",
            content: (row: SchedulerRowData) => {
              if (row.isQueueRow && row.queueStat?.scalingInfo) {
                const { rawTarget, actualTarget } = row.queueStat.scalingInfo;
                if (rawTarget !== actualTarget) {
                  return <code>{actualTarget} ({rawTarget})</code>;
                }
                return <code>{actualTarget}</code>;
              }
              return null;
            },
          },
        ]}
      />
    </div>
  );
}

function QueuesTable({
  queues,
  schedulers,
}: { queues: [string, any][]; schedulers: any[] }) {
  const queueRows = queues.map(([queueName, queueInfo]) => ({
    id: queueName,
    name: queueName,
    ...queueInfo,
    // Calculate total connections for this queue across all schedulers
    connections: schedulers.reduce((total, scheduler) => {
      const queueStat = scheduler.queueStats?.[queueName];
      if (!queueStat) return total;
      return total + queueStat.connected;
    }, 0),
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
              <span className={clsx(
                "text-xs px-2 py-1 rounded-lg inline-block transition-colors",
                "bg-blue-50 dark:bg-blue-900/30",
                "text-blue-900 dark:text-blue-100"
              )}>
                {name}
              </span>
            ),
          },
          {
            name: "Connections",
            content: ({ connections }: QueueRowData) => (
              <code>{connections}</code>
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
}: { workLoops: Awaited<ReturnType<typeof Worker.getWorkLoops>> }) {
  return (
    <div>
      <h1 className="text-lg font-medium mb-2">WorkLoops</h1>
      <Table
        rows={workLoops}
        emptyResultMessage="workloops"
        columns={[
          { name: "Queue", content: ({ queue }) => queue },
          {
            name: "LoopIds",
            content: ({ loopIds }) => <code>{loopIds.length}</code>,
          },
        ]}
      />
    </div>
  );
}

export default function Scheduler({
  loaderData: { queues, schedulers, workLoops },
}: Route.ComponentProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AutoRefresh />
      </div>
      <QueuesTable queues={queues} schedulers={schedulers} />
      <SchedulersTable schedulers={schedulers} />
      <WorkLoopsTable workLoops={workLoops} />
    </div>
  );
}
