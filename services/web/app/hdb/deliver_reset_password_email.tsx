import { render } from "@react-email/components";
import { transport, NO_REPLY_ADDRESS } from "~/mailer.server";
import { db } from "@/sql-client.server";
import EmailResetPassword from "services/web/emails/auth.reset_password";
import type { Route } from "./+types/deliver_reset_password_email";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  const payload = await request.json();
  const { reset_token, user_id } = payload.event.data.new;

  const email = await db
    .selectFrom("identity.email_passwords")
    .where("user_id", "=", user_id)
    .select(["email_address"])
    .executeTakeFirst();

  if (!email) {
    throw new Response("Not found", { status: 404 });
  }

  await transport.sendMail({
    from: NO_REPLY_ADDRESS,
    to: email.email_address as string,
    subject: "[Editframe] Reset your password",
    html: await render(
      <EmailResetPassword
        token={reset_token}
        host={process.env.WEB_HOST as string}
      />,
    ),
  });

  return {};
};
