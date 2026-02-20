import { redirect } from "react-router";
import { destroySession, createLogoutHeaders } from "@/util/session";
import { sessionCookieContext } from "~/middleware/context";

import type { Route } from "./+types/logout";

export async function action({ context }: Route.ActionArgs) {
  const session = context.get(sessionCookieContext);
  return redirect("/auth/login", {
    headers: await createLogoutHeaders(await destroySession(session)),
  });
}
export async function loader({ context }: Route.LoaderArgs) {
  const session = context.get(sessionCookieContext);
  return redirect("/auth/login", {
    headers: await createLogoutHeaders(await destroySession(session)),
  });
}
export default function Logout() {
  return null;
}
