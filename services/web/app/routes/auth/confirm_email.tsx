import { db } from "@/sql-client.server";
import { commitSession } from "@/util/session";
import { redirect } from "react-router";
import type { MetaFunction } from "react-router";
import { sql } from "kysely";
import { ErrorMessage } from "~/components/ErrorMessage";
import {
  maybeIdentityContext,
  sessionCookieContext,
} from "~/middleware/context";

import type { Route } from "./+types/confirm_email";

export const loader = async ({
  context,
  params: { token },
}: Route.LoaderArgs) => {
  const session = context.get(maybeIdentityContext);
  const sessionCookie = context.get(sessionCookieContext);

  const confirmedEmail = await db
    .updateTable("identity.valid_email_confirmations")
    .set({ confirmed_at: sql`now()` })
    .where("confirmation_token", "=", token)
    .returningAll()
    .executeTakeFirst();

  if (!confirmedEmail) {
    return null;
  }

  sessionCookie.flash("success", "Email confirmed!");

  return redirect(session ? "/settings" : "/auth/login", {
    headers: {
      "Set-Cookie": await commitSession(sessionCookie),
    },
  });
};

export const meta: MetaFunction = () => {
  return [{ title: "Confirm Email | Editframe" }];
};

export default function Page() {
  return (
    <div className="max-w-lg space-y-6">
      <ErrorMessage
        message="Failed to confirm email"
        note="Please try again."
      />

      <p>
        You are probably seeing this error because the email address has already
        been confirmed.
      </p>

      <p>If you believe this is an error, please contact support.</p>
    </div>
  );
}
