import { type ActionFunctionArgs, redirect } from "react-router";
import { destroySession, getSession } from "@/util/session";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie") ?? "");
  return redirect("/auth/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}
export async function loader({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie") ?? "");
  return redirect("/auth/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}
export default function Logout() {
  return null;
}
