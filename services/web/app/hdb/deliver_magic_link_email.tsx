import { render } from "@react-email/components";
import MagicLink from "../../emails/auth.magic_link";
import { transport, NO_REPLY_ADDRESS } from "~/mailer.server";
import { db } from "@/sql-client.server";

import type { Route } from "./+types/deliver_magic_link_email";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  const payload = await request.json();
  const token = payload.event.data.new.token;

  const magicLinkData = await db
    .selectFrom("identity.valid_magic_links_tokens")
    .where("token", "=", token)
    .select(["email_address", "token"])
    .executeTakeFirst();

  if (!magicLinkData || !magicLinkData.email_address || !magicLinkData.token) {
    throw new Response("Not found", { status: 404 });
  }

  await transport.sendMail({
    from: NO_REPLY_ADDRESS,
    to: magicLinkData.email_address,
    subject: "[Editframe] Login with magic link",
    html: await render(
      <MagicLink
        token={magicLinkData.token}
        host={process.env.WEB_HOST || "http://localhost:3000"}
      />,
    ),
  });

  return {};
};
