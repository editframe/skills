import { render } from "@react-email/components";
import EmailConfirmation from "../../emails/auth.confirmation";
import { transport, NO_REPLY_ADDRESS } from "~/mailer.server";
import { db } from "@/sql-client.server";

import type { Route } from "./+types/deliver_confirmation_email";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  if (process.env.WEB_HOST === undefined) {
    throw new Error("WEB_HOST is not defined");
  }
  const payload = await request.json();
  const id = payload.event.data.new.id;

  const confirmationData = await db
    .selectFrom("identity.valid_email_confirmations")
    .innerJoin(
      "identity.users",
      "identity.users.id",
      "identity.valid_email_confirmations.user_id",
    )
    .innerJoin(
      "identity.email_passwords",
      "identity.email_passwords.user_id",
      "identity.users.id",
    )
    .select([
      "identity.valid_email_confirmations.id",
      "identity.valid_email_confirmations.confirmation_token",
      "identity.email_passwords.email_address",
    ])
    .where("identity.valid_email_confirmations.id", "=", id)
    .executeTakeFirst();

  if (!confirmationData || !confirmationData.confirmation_token) {
    throw new Response("Not found", { status: 404 });
  }

  await transport.sendMail({
    from: NO_REPLY_ADDRESS,
    to: confirmationData.email_address as string,
    subject: "[Editframe] Confirm your email address",
    html: await render(
      <EmailConfirmation
        token={confirmationData.confirmation_token}
        host={process.env.WEB_HOST}
      />,
    ),
  });

  return {};
};
