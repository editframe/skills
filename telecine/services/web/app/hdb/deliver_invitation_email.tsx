import { render } from "@react-email/components";
import { transport, NO_REPLY_ADDRESS } from "~/mailer.server";
import { db } from "@/sql-client.server";
import InviteMember from "services/web/emails/org.invite-member";
import { logger } from "@/logging";

import type { Route } from "./+types/deliver_invitation_email";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  const payload = await request.json();
  logger.info(payload, "Delivering invitation email");
  const id = payload.event.data.new.id;

  const invite = await db
    .selectFrom("identity.invites")
    .innerJoin("identity.orgs", "identity.orgs.id", "identity.invites.org_id")
    .select([
      "invite_token",
      "email_address",
      "org_id",
      "identity.orgs.display_name",
    ])
    .where("identity.invites.id", "=", id)
    .executeTakeFirst();

  if (!invite) {
    throw new Response("Not found", { status: 404 });
  }

  await transport.sendMail({
    from: NO_REPLY_ADDRESS,
    to: invite.email_address as string,
    subject: `[Editframe] You're invited to join ${invite.display_name}`,
    html: render(
      <InviteMember
        host={process.env.WEB_HOST}
        token={invite.invite_token}
        org_display_name={invite.display_name}
      />,
    ),
  });

  return {};
};
