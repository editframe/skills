import { render } from "@react-email/components";
import { transport, NO_REPLY_ADDRESS } from "~/mailer.server";
import { db } from "@/sql-client.server";
import NewApiEmail from "services/web/emails/api.new";
import type { Route } from "./+types/deliver_new_api_email_notification";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  const payload = await request.json();
  const { user_id, org_id, name } = payload.event.data.new;

  const org = await db
    .selectFrom("identity.orgs")
    .where("id", "=", org_id)
    .select(["primary_user_id", "display_name"])
    .executeTakeFirst();

  const orgOwner = await db
    .selectFrom("identity.email_passwords")
    .where("user_id", "=", org?.primary_user_id ?? null)
    .select(["email_address"])
    .executeTakeFirst();

  const email = await db
    .selectFrom("identity.email_passwords")
    .where("user_id", "=", user_id)
    .select(["email_address"])
    .executeTakeFirst();

  if (!email || !orgOwner) {
    throw new Response("Not found", { status: 404 });
  }

  await transport.sendMail({
    from: NO_REPLY_ADDRESS,
    to: orgOwner?.email_address as string,
    subject: `[Editframe] A new API key has been created for your organization: ${org?.display_name}`,
    html: await render(
      <NewApiEmail
        emailAddress={email.email_address}
        orgName={org?.display_name as string}
        keyName={name as string}
      />,
    ),
  });

  return {};
};
