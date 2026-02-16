import { redirect } from "react-router";
import {
  identityContext,
  adminIdentityContext,
} from "./context";
import type { Route } from "../+types/root";

/**
 * Admin middleware — must be placed after authMiddleware.
 * Checks that the authenticated user's email is in ADMIN_EMAILS.
 */
export const adminMiddleware: Route.MiddlewareFunction = async ({
  context,
}) => {
  const identity = context.get(identityContext);

  const isAdmin =
    "email" in identity &&
    process.env.ADMIN_EMAILS?.split(",").includes(identity.email);

  if (!isAdmin) {
    throw redirect("/auth/login");
  }

  context.set(adminIdentityContext, { ...identity, isAdmin: true as const });
};
