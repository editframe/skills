import { sql } from "kysely";

import { db } from "@/sql-client.server";
import { transport, NO_REPLY_ADDRESS } from "~/mailer.server";
import { render } from "@react-email/components";
import ApiExpiredReminder from "services/web/emails/api.reminder";
import { convertBackToDate } from "~/ui/convertToDate";
import { logger } from "@/logging";

import type { Route } from "./+types/deliver_api_key_expired_reminder";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  const api_keys = await db
    .selectFrom("identity.api_keys")
    .where("expired_at", "<", sql<Date>`now() + interval '1 day'`)
    .where("expired_at", ">=", sql<Date>`now()`)
    .where("expiration_reminder_sent_at", "is", null)
    .selectAll()
    .execute();

  if (!api_keys) {
    return {
      message: "No expired API keys found",
    };
  }

  for (const api_key of api_keys) {
    const { user_id, name, expired_at, org_id, updated_at } = api_key;
    if (!expired_at) {
      logger.error(`API key ${name} has no expired date`);
      continue;
    }
    if (!updated_at) {
      logger.error(`API key ${name} has no updated date`);
      continue;
    }
    const expiredDate = convertBackToDate(expired_at, updated_at.toISOString());
    logger.info(
      `Sending reminder for API key ${name} with expired date ${expiredDate}`,
      {
        name,
        expiredDate,
      },
    );
    if (expiredDate === "1 day") {
      const user = await db
        .selectFrom("identity.email_passwords")
        .where("user_id", "=", user_id)
        .select(["email_address"])
        .executeTakeFirst();

      const org = await db
        .selectFrom("identity.orgs")
        .where("id", "=", org_id)
        .select(["display_name"])
        .executeTakeFirst();

      await transport.sendMail({
        from: NO_REPLY_ADDRESS,
        to: user?.email_address as string,
        subject: `[Editframe] Your API key "${name}" is about to expire`,
        html: await render(
          <ApiExpiredReminder
            keyName={name as string}
            orgName={org?.display_name as string}
          />,
        ),
      });

      await db
        .updateTable("identity.api_keys")
        .set({
          expiration_reminder_sent_at: new Date(),
        })
        .where("id", "=", api_key.id)
        .execute();
    }
  }

  return {
    message: `Sent reminders for ${api_keys.length} API keys`,
  };
};
