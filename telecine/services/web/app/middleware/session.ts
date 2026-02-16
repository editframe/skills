import { getSession, parseRequestSession } from "@/util/session";
import {
  sessionCookieContext,
  maybeIdentityContext,
} from "./context";
import type { Route } from "../+types/root";

/**
 * Root-level middleware: parses session once per request.
 * Sets sessionCookie (mutable, for flash messages) and maybeIdentity (parsed session or undefined).
 * Runs on every server request — no auth requirement.
 */
export const sessionMiddleware: Route.MiddlewareFunction = async ({
  request,
  context,
}) => {
  const [identity, sessionCookie] = await Promise.all([
    parseRequestSession(request),
    getSession(request.headers.get("Cookie") ?? ""),
  ]);

  context.set(sessionCookieContext, sessionCookie);
  context.set(maybeIdentityContext, identity);
};
