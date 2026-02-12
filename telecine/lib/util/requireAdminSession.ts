import { redirect } from "react-router";
import { parseRequestSession } from "./session";

export async function requireAdminSession(request: Request) {
  const session = await parseRequestSession(request);
  if (!session) {
    throw redirect("/auth/login") as never;
  }

  const admin =
    session &&
    "email" in session &&
    process.env.ADMIN_EMAILS?.split(",").includes(session?.email);
  if (!admin) {
    throw redirect("/auth/login") as never;
  }

  return { ...session, isAdmin: true };
}
