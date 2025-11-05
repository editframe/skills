import { db } from "@/sql-client.server";
import { transport, NO_REPLY_ADDRESS } from "~/mailer.server";
import { render } from "@react-email/components";
import WelcomeEmail from "../../emails/welcome";
import type { Route } from "./+types/onboarding";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  const payload = await request.json();
  const user_id = payload.event.data.new.user_id;

  const userEmail = await db
    .selectFrom("identity.email_passwords")
    .where("user_id", "=", user_id)
    .selectAll()
    .executeTakeFirst();

  if (!userEmail) {
    throw new Response("Not found", { status: 404 });
  }

  await transport.sendMail({
    from: NO_REPLY_ADDRESS,
    to: userEmail.email_address as string,
    subject: "[Editframe] Welcome to Editframe",
    html: render(<WelcomeEmail />),
  });

  return {};
};
