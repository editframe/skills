---
name: editframe-webhooks
title: Webhooks
description: Webhook notifications for render completion and file processing events. Configure endpoints, verify HMAC signatures, and handle real-time status payloads.
order: 35
license: MIT
metadata:
  author: editframe
  version: "2.0"
---

# Webhooks

Receive real-time HTTP notifications when renders complete, files finish processing, or other asynchronous events occur in your Editframe account.

## Setup

Webhooks are configured on an API key, not separately. The webhook URL and events you want to receive are set at API key creation time.

**Step 1**: Create an API key with webhook configuration via the Editframe dashboard (editframe.com → API Keys → Create), or via your application's API key management endpoint. The dashboard returns a webhook secret — store it securely.

**Step 2**: Handle webhook requests:

```typescript
// 3. Handle webhook requests
app.post("/webhooks/editframe", async (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body);
  const webhookSecret = process.env.EDITFRAME_WEBHOOK_SECRET;

  // Verify signature — always verify before processing
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).send("Invalid signature");
  }

  // Respond quickly, process asynchronously
  res.status(200).send("OK");

  const { topic, data } = req.body;
  if (topic === "render.completed") {
    console.log(`Render ${data.id} completed. Download: ${data.download_url}`);
  }
});
```

**Critical:** Hash the raw request body string (`JSON.stringify(req.body)`), not the parsed object. Use `timingSafeEqual` to prevent timing attacks.

## Event Topics

Webhooks are triggered for specific event topics:

### Render Events
- `render.created` — Render job created
- `render.pending` — Render queued for processing
- `render.rendering` — Render is actively processing
- `render.completed` — Render successfully finished
- `render.failed` — Render encountered an error

### File Events
- `file.created` — File record created
- `file.uploading` — File is being uploaded
- `file.processing` — File is being processed (video only)
- `file.ready` — File is ready for use
- `file.failed` — File processing failed

### Legacy Events
- `unprocessed_file.created` — Unprocessed file created (deprecated)

## Configuration

Configure webhooks when creating or updating an API key:

**Webhook URL**: The HTTPS endpoint where Editframe will send POST requests
**Webhook Events**: Array of event topics you want to receive
**Webhook Secret**: Auto-generated HMAC secret for signature verification

See [references/getting-started.md](references/getting-started.md) for detailed setup instructions.

## Security

All webhook requests include an `X-Webhook-Signature` header containing an HMAC-SHA256 signature. Always verify this signature before processing webhook payloads.

See [references/security.md](references/security.md) for signature verification implementation.

## Delivery Guarantees

- Webhooks are delivered via HTTP POST with JSON payload
- Automatic retry with exponential backoff (3 attempts)
- 30-second timeout per attempt
- Events marked as failed after retry exhaustion
- Delivery history tracked for debugging

## Testing

Test your webhook endpoint before going live:

```bash
# Use the Editframe dashboard to send test webhooks
# Or trigger test events via the API
```

See [references/testing.md](references/testing.md) for testing strategies including local development with ngrok.

## Troubleshooting

Common issues and solutions:

- **Signature verification fails**: Ensure you're hashing the raw request body, not parsed JSON
- **Timeout errors**: Respond with 200 OK quickly, process events asynchronously
- **Missed webhooks**: Check delivery logs in the Editframe dashboard
- **Duplicate events**: Implement idempotency using event IDs

See [references/troubleshooting.md](references/troubleshooting.md) for detailed debugging guidance.

## Reference Documentation

- [references/getting-started.md](references/getting-started.md) — Set up your first webhook
- [references/events.md](references/events.md) — Event types and payload structures
- [references/security.md](references/security.md) — HMAC signature verification
- [references/testing.md](references/testing.md) — Test webhooks locally and in production
- [references/troubleshooting.md](references/troubleshooting.md) — Debug common issues
