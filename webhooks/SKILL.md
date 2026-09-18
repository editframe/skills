---
name: webhooks
description: "Webhook notifications for render completion and file processing events. Configure an endpoint, verify HMAC signatures, and handle real-time status payloads."
license: MIT
metadata:
  author: editframe
  version: "4.0"
---


# Webhooks

Use webhooks when a server needs notifications independent of an active client connection.

For a live progress display or a one-off render, use `getRenderProgress` or `getFileProcessingProgress`. These functions consume event streams.

No SDK function registers a webhook. Configure one on an API key, through the dashboard (Settings → API Keys, or `editframe.com/resource/api_keys`). Set a **Webhook URL** (this must use HTTPS). Select which **Webhook Events** (topics) to receive. When you create or update the key, the dashboard generates a **Webhook Secret**, used to sign deliveries. Copy this secret and store it alongside the API key.

## Handling a Webhook

Verify the signature and validate the payload before acceptance. Persist the event before you return success.

The example accepts an application-defined `acceptEvent` function. It must commit to a durable inbox or queue before its promise resolves.

```typescript
import express from "express";
import crypto from "node:crypto";

type WebhookEvent = { topic: string; data: Record<string, unknown> };
type AcceptEvent = (event: WebhookEvent, fingerprint: string) => Promise<void>;

export function createWebhookRouter(secret: string, acceptEvent: AcceptEvent) {
  if (!secret) throw new Error("Webhook secret is required");
  const router = express.Router();

  router.post("/webhooks/editframe", express.raw({ type: "*/*" }), async (req, res) => {
    const signature = req.get("x-webhook-signature");
    const rawBody = req.body;
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) {
      return res.status(401).send("Invalid signature");
    }
    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).send("Raw body required");
    }

    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
    if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), expected)) {
      return res.status(401).send("Invalid signature");
    }

    let payload: WebhookEvent;
    try {
      const value = JSON.parse(rawBody.toString("utf-8"));
      if (!value || typeof value.topic !== "string" || !value.data ||
          typeof value.data !== "object" || Array.isArray(value.data)) {
        return res.status(400).send("Invalid payload");
      }
      payload = value;
    } catch {
      return res.status(400).send("Invalid JSON");
    }

    const fingerprint = crypto.createHash("sha256").update(rawBody).digest("hex");
    try {
      await acceptEvent(payload, fingerprint);
      return res.status(200).send("OK");
    } catch {
      return res.status(500).send("Event not accepted");
    }
  });

  return router;
}
```

Mount this router before middleware that parses request bodies, such as `express.json()`. That middleware would consume the signed bytes.

Keep durable acceptance brief; the delivery HTTP timeout is 30 seconds. Let a worker process the stored event afterward.

Return success for an already accepted duplicate. Record storage failures in your application logs without exposing the secret or signed body.

Every request carries `X-Webhook-Signature`: the hex-encoded HMAC-SHA256 of the raw JSON body. Re-serialized JSON can produce a different signature.

## Payload

```typescript
{ topic: string, data: {...} }
```

### Render topics: `render.created`, `render.pending`, `render.rendering`, `render.completed`, `render.failed`

`data` includes `id`, `status`, `created_at`, `completed_at`, `failed_at`, `width`, `height`, `fps`, `byte_size`, `duration_ms`, `md5`, `metadata`, `expires_at` (`null` = permanent), `download_url` (populated once complete), `error` (populated on failure).

### File topics: `file.created`, `file.uploading`, `file.processing`, `file.ready`, `file.failed`, `file.updated`

`data` includes `id`, `type` (`video`/`image`/`caption`), `status`, `filename`, `byte_size`, `md5`, `mime_type`, `width`, `height`, `expires_at`. Editframe sends `file.updated` for a file status change that doesn't match one of the other file topics.

### Legacy topics

Editframe still emits these topics, tied to the deprecated per-type file APIs. Do not build a new integration against them.

`image_file.created`, `isobmff_file.created`, `isobmff_track.created`, `unprocessed_file.created`.

## Delivery and duplicate handling

Each event arrives as one HTTP POST. Deliveries can repeat; do not assume ordering or unlimited retries.

`data.id` identifies a resource, not a delivery. Several lifecycle events can share that ID, and repeated updates can share a topic.

Use the body fingerprint to recognize identical deliveries within the endpoint's configured API-key scope. Store it atomically with the accepted event.

Identical bodies cannot distinguish separate events with identical content. Design business operations around resource state or an application-owned transition key.

Do not use a resource ID or topic-and-ID pair as a permanent notification deduplication key.

Monitor failed deliveries and reconcile important resource state through the API. A delivery acknowledgement does not prove business processing succeeded.

## Testing

```bash
npx editframe webhook -t render.completed   # sends a real test event to the URL configured on your API key
```

See the `editframe-api` skill's CLI section for more detail. There is no `--webhookURL` flag. The target URL always comes from the key's dashboard configuration. The dashboard's API key detail page has an equivalent "Test Webhook" button.

For local development, tunnel your dev server, for example with `ngrok http 3000`. Point the API key's Webhook URL at the tunnel URL while you test.
