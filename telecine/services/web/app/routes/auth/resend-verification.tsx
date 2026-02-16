import { logger } from "@/logging";
import { db } from "@/sql-client.server";
import { data } from "react-router";

import { authMiddleware } from "~/middleware/auth";
import { identityContext } from "~/middleware/context";

import type { Route } from "./+types/resend-verification";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export const action = async ({ params: { id }, context }: Route.ActionArgs) => {
  const session = context.get(identityContext);
  const deleted = await db
    .deleteFrom("identity.email_confirmations")
    .where("email_password_id", "=", id)
    .where("user_id", "=", session.uid)
    .returning("id")
    .executeTakeFirst();

  if (!deleted) {
    logger.error("No result from delete");
    return data(
      { error: "Unable to resend verification email" },
      { status: 400 },
    );
  }

  const inserted = await db
    .insertInto("identity.email_confirmations")
    .values({
      email_password_id: id,
      user_id: session.uid,
    })
    .returning("id")
    .executeTakeFirst();

  if (!inserted) {
    logger.error("No result from insert");
    return data(
      { error: "Unable to resend verification email" },
      { status: 400 },
    );
  }

  return { success: true };
};
