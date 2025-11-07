import { Queue } from "@/queues/Queue";
import { requireAdminSession } from "@/util/requireAdminSession";

import type { Route } from "./+types/queue";
import { Outlet, redirect } from "react-router";
import { clsx } from "clsx";
import { NavLink } from "~/components/Link";
import { AutoRefresh } from "./AutoRefresh";
export const loader = async ({ request, params }: Route.LoaderArgs) => {
  await requireAdminSession(request);
  if (request.url.endsWith(params.name)) {
    return redirect(`/admin/queues/${params.name}/queued`);
  }
  const { name } = params;
  const queue = Queue.fromName(name);
  if (!queue) {
    throw new Response("Not Found", { status: 404 });
  }
  const stats = await queue.getStats();
  return { stats };
};

interface QueueNavLinkProps {
  to: string;
  count: number;
  label: string;
  badgeColor: {
    bg: string;
    text: string;
  };
}

function QueueNavLink({ to, count, label, badgeColor }: QueueNavLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "px-2 py-1 rounded-md text-xs font-light flex items-center transition-colors",
          "hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-sm",
          isActive 
            ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" 
            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
        )
      }
    >
      <span
        className={`mr-1.5 ${badgeColor.bg} ${badgeColor.text} px-1.5 py-0.5 rounded text-xs`}
      >
        {count}
      </span>
      {label}
    </NavLink>
  );
}

export default function QueueComponent({
  loaderData: { stats },
  params: { name },
}: Route.ComponentProps) {
  return (
    <>
      <div className="flex space-x-3 mb-4 mt-2 items-center">
        <AutoRefresh />
        <span className="text-sm font-medium">{name}</span>
        <QueueNavLink
          to={`/admin/queues/${name}/queued`}
          count={stats.queued}
          label="Queued"
          badgeColor={{ bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" }}
        />

        <QueueNavLink
          to={`/admin/queues/${name}/claimed`}
          count={stats.claimed}
          label="Claimed"
          badgeColor={{ bg: "bg-yellow-50 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300" }}
        />

        <QueueNavLink
          to={`/admin/queues/${name}/stalled`}
          count={stats.stalled}
          label="Stalled"
          badgeColor={{ bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" }}
        />

        <QueueNavLink
          to={`/admin/queues/${name}/completed`}
          count={stats.completed}
          label="Completed"
          badgeColor={{ bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" }}
        />

        <QueueNavLink
          to={`/admin/queues/${name}/failed`}
          count={stats.failed}
          label="Failed"
          badgeColor={{ bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" }}
        />
      </div>
      <Outlet />
    </>
  );
}
