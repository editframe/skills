import { z } from "zod";
import { requireMutateAs } from "@/graphql.server/userClient";
import { graphql } from "@/graphql";

import type { Route } from "./+types/test_webhook";
import { apiIdentityContext } from "~/middleware/context";

const schema = z.object({
  webhookURL: z.string(),
  topic: z.string(),
  api_key_id: z.string(),
});

export const action = async ({ request, context }: Route.ActionArgs) => {
  const session = context.get(apiIdentityContext);
  const payload = schema.parse(await request.json());
  await requireMutateAs(
    session,
    "org-editor",
    graphql(`
        mutation TestWebhook($api_key_id: uuid!, $topic: String!) {
          result: insert_api_webhook_events_one(object: {
            api_key_id: $api_key_id,
            topic: $topic,
          }) {
            id
          }
        }
      `),
    {
      api_key_id: payload.api_key_id,
      topic: payload.topic,
    },
  );
  return {
    message: "Webhook sent successfully",
  };
};

// const apiKeyId = session.cid;
// const { webhookURL, topic } = payload;

// const api_key = await db
//   .selectFrom("identity.api_keys")
//   .where("id", "=", apiKeyId)
//   .select(["id", "webhook_url", "org_id", "webhook_events", "name"])
//   .executeTakeFirst();

// if (!api_key) {
//   throw new Response("API Key not found", { status: 404 });
// }

// const org_id = api_key.org_id;
// const id = api_key.org_id;
// const duration_ms = 1000;
// const height = 1920;
// const width = 1080;
// const fps = 30;
// let status = "created";

// switch (topic) {
//   case "render.created":
//     status = "created";
//     break;

//   case "render.completed":
//     status = "complete";
//     break;
//   case "render.failed":
//     status = "failed";
//     break;
//   case "render.rendering":
//     status = "rendering";
//     break;
//   case "render.pending":
//     status = "pending";
//     break;

//   default:
//     return json(
//       {
//         message: "Invalid topic",
//       },
//       { status: 400 },
//     );
// }

// const playload = {
//   topic,
//   data: {
//     id,
//     org_id,
//     status,
//     duration_ms,
//     height,
//     width,
//     fps,
//   },
// };

// try {
//   const webhookSecret = await getWebhookSigningSecret(apiKeyId);
//   const { statusCode } = await sendWebhookRequest({
//     webhookURL,
//     playload,
//     params: [apiKeyId, id, org_id],
//     webhookSecret,
//     isTest: true,
//   });

//   if (statusCode !== 200) {
//     return json(
//       {
//         message: "Webhook URL is not reachable",
//       },
//       { status: statusCode },
//     );
//   }
//   return json(
//     {
//       message: "Webhook sent successfully",
//     },
//     { status: 200 },
//   );
// } catch (e) {
//   console.error("Failed to send webhook", e);
//   return Response.json({}, { status: 500 });
// }
// },
