import { formatMs } from "~/ui/formatMs";
import { db } from "@/sql-client.server";
import { logger } from "@/logging";

import type { Route } from "./+types/send_render_completed_slack";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  if (!process.env.SLACK_TRANSACTIONS_URL) {
    throw new Error("SLACK_TRANSACTIONS_URL is required");
  }
  const payload = await request.json();
  const {
    id,
    status,
    duration_ms,
    height,
    width,
    fps,
    completed_at,
    created_at,
    org_id,
    api_key_id,
  } = payload.event.data.new;

  const org = await db
    .selectFrom("identity.orgs")
    .where("id", "=", org_id)
    .select(["display_name", "id"])
    .executeTakeFirst();

  const api_key = await db
    .selectFrom("identity.api_keys")
    .where("id", "=", api_key_id)
    .select(["name"])
    .executeTakeFirst();

  if (status === "complete" || status === "failed") {
    try {
      const renderDuration =
        new Date(completed_at).getTime() - new Date(created_at).getTime();
      const payload = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text:
                status === "complete"
                  ? "✅ Render Completed"
                  : "❌ Render Failed",
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*ID:* <https://editframe.com/admin/renders/${id}|${id}>`,
              },
              {
                type: "mrkdwn",
                text: `*Duration:* ${formatMs(duration_ms)}`,
              },
              {
                type: "mrkdwn",
                text: `*Dimensions:* ${width}x${height}`,
              },
              {
                type: "mrkdwn",
                text: `*FPS:* ${fps}`,
              },
            ],
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `*Org:* <https://editframe.com/admin/orgs/${org?.id}|${org?.display_name}> • *API Key:* <https://editframe.com/admin/keys/${api_key_id}|${api_key?.name}>${status === "complete" ? ` • *Render Time:* ${formatMs(renderDuration)}` : ""}`,
              },
            ],
          },
        ],
      };

      try {
        await fetch(process.env.SLACK_TRANSACTIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        logger.info(payload, "Slack notification has been sent");
        return {};
      } catch (error) {
        logger.error(error, "Error sending slack notification");
        throw new Response("Failed to send slack notification", {
          status: 500,
        });
      }
    } catch (e) {
      logger.error(e, "Failed to send webhook");
      throw new Response("Failed to send webhook", { status: 500 });
    }
  } else {
    return {};
  }
};
