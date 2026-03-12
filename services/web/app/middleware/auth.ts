import { redirect } from "react-router";
import { logger } from "@/logging";
import { maybeIdentityContext, identityContext } from "./context";
import type { Route } from "../+types/root";

/**
 * Auth middleware for protected web routes.
 * Reads the identity set by sessionMiddleware and requires it to be present.
 * Redirects to /auth/login if unauthenticated or anonymous.
 */
export const authMiddleware: Route.MiddlewareFunction = async ({ context }) => {
  const identity = context.get(maybeIdentityContext);

  if (!identity) {
    throw redirect("/auth/login");
  }

  if (identity.type === "anonymous_url") {
    throw redirect("/auth/login");
  }

  if (!identity.uid || typeof identity.uid !== "string") {
    logger.error("authMiddleware: session missing valid uid", {
      sessionType: identity.type,
      uid: identity.uid,
    });
    throw redirect("/auth/login");
  }

  context.set(identityContext, identity);
};

/**
 * Inverse auth middleware for public-only routes (login, register, etc.).
 * Redirects authenticated users to /welcome.
 */
export const noAuthMiddleware: Route.MiddlewareFunction = async ({
  context,
}) => {
  const identity = context.get(maybeIdentityContext);

  if (identity) {
    throw redirect("/welcome");
  }
};
