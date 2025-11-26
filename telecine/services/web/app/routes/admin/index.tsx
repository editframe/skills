import { Outlet } from "react-router";
import "~/styles/docs.css";
import { AdminNavigation } from "~/components/Navigation";
import type { Route } from "./+types/index";
import { requireAdminSession } from "@/util/requireAdminSession";
import { useTheme } from "~/hooks/useTheme";
import { ThemeToggle } from "~/components/ThemeToggle";
import clsx from "clsx";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdminSession(request);
  return null;
};

export default function AdminLayout({}: Route.ComponentProps) {
  useTheme();

  return (
    <div
      className={clsx(
        "grid grid-rows-[auto_1fr] h-screen w-screen grid-cols-[auto_1fr] transition-colors",
        "bg-white dark:bg-slate-900",
      )}
    >
      <div
        className={clsx(
          "col-span-2 flex justify-between items-center h-10 font-mono transition-colors",
          "bg-red-800 dark:bg-red-900",
          "text-white",
        )}
      >
        <div className="flex-1 flex justify-center items-center">
          🚧 EDIT FRAME ADMINISTRATION AREA 🚧 (hard hat zone)
        </div>
        <div className="pr-2">
          <ThemeToggle className="h-8 w-8 text-white hover:text-white hover:bg-red-700 dark:hover:bg-red-800" />
        </div>
      </div>
      <AdminNavigation />
      <main
        className={clsx(
          "overflow-y-auto transition-colors px-2 sm:px-4 lg:pl-2 pb-4 pt-3",
          "bg-white dark:bg-slate-900",
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
