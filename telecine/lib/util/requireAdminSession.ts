import {
  type LoaderFunction,
  type LoaderFunctionArgs,
  redirect,
} from "react-router";
import { type SessionInfo, parseRequestSession } from "./session";

export type LoaderFunctionArgsWithSession = LoaderFunctionArgs & {
  session: SessionInfo;
};

export type LoaderWithSession = (
  args: LoaderFunctionArgsWithSession,
) => ReturnType<LoaderFunction>;

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
