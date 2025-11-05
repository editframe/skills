import { Outlet } from "react-router";
import "~/styles/docs.css";
import { AdminNavigation } from "~/components/Navigation";
import type { Route } from "./+types/index";
import { requireAdminSession } from "@/util/requireAdminSession";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireAdminSession(request);
  return null;
};

export default function AdminLayout({}: Route.ComponentProps) {
  return (
    <div className="grid grid-rows-[auto_1fr] h-screen w-screen grid-cols-[auto_1fr]">
      <div className="col-span-2 bg-red-800 text-white flex justify-center items-center h-10 font-mono">
        🚧 EDIT FRAME ADMINISTRATION AREA 🚧 (hard hat zone)
      </div>
      <AdminNavigation />
      <main className="overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
