import { render } from "@react-email/components";
import { transport, NO_REPLY_ADDRESS } from "~/mailer.server";
import { db } from "@/sql-client.server";
import EmailUpdatePassword from "services/web/emails/auth.update_password";
import type { Route } from "./+types/deliver_update_password_email";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  const payload = await request.json();
  const { id } = payload.event.data.new;

  const email = await db
    .selectFrom("identity.email_passwords")
    .where("id", "=", id)
    .select(["email_address"])
    .executeTakeFirst();

  if (!email) {
    throw new Response("Not found", { status: 404 });
  }

  await transport.sendMail({
    from: NO_REPLY_ADDRESS,
    to: email.email_address as string,
    subject: "[Editframe] Your password has been updated",
    html: await render(<EmailUpdatePassword />),
  });

  return {};
};
