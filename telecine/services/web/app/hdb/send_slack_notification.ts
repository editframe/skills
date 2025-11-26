import { db } from "@/sql-client.server";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";
import { logger } from "@/logging";
import type { Route } from "./+types/send_slack_notification";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  if (!process.env.SLACK_WEBHOOK_URL) {
    throw new Error("SLACK_WEBHOOK_URL is required");
  }

  const payload = await request.json();
  const id = payload.event.data.new.id;

  const emailPassword = await db
    .selectFrom("identity.email_passwords")
    .where("user_id", "=", id)
    .select(["email_address"])
    .executeTakeFirst();

  if (!emailPassword) {
    throw new Response("Not found", { status: 404 });
  }

  const playload = {
    text: "New user signed up! :tada:",
    attachments: [
      {
        color: "#7CD197",
        fields: [
          {
            title: "Email",
            value: emailPassword.email_address,
          },
        ],
      },
    ],
  };
  if (payload.event.data.new.referral) {
    playload.attachments[0]?.fields.push({
      title: "Referral",
      value: `${payload.event.data.new.referral}`,
    });
  }

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(playload),
    });
    return {};
  } catch (error) {
    logger.error(error, "Error sending slack notification");
    throw new Response("Failed to send slack notification", { status: 500 });
  }
};
