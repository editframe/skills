---
name: webhooks
description: "Webhook notifications for render completion, file processing and pipeline run events. Configure an endpoint, verify HMAC signatures, and handle real-time status payloads."
license: MIT
metadata:
  author: editframe
  version: "4.0"
---


# Webhooks

Use webhooks when a server needs notifications independent of an active client connection.

For a live progress display or a one-off render, use `getRenderProgress` or `getFileProcessingProgress`. These functions consume event streams.

No SDK function registers a webhook. Configure one on an API key, through the dashboard (API → API Keys, or `editframe.com/resource/api_keys`). Set a **Webhook URL** (this must use HTTPS). Select which **Webhook Events** (topics) to receive. When you create or update the key, the dashboard generates a **Webhook Secret**, used to sign deliveries. Copy this secret and store it alongside the API key.

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

### Pipeline topics (preview)

Pipelines are in preview. Editframe enables them for each organization. Editframe sends pipeline topics only to organizations with pipelines enabled. To ask for access, send an email to hello@editframe.com.

| Topic | Editframe sends it when | `data` |
|---|---|---|
| `pipeline_run.created` | A run is created (`pending`). | Run |
| `pipeline_run.started` | A run starts its steps (`running`). | Run |
| `pipeline_run.retried` | A `failed` or `cancelled` run is retried. | Run |
| `pipeline_run.completed` | A run succeeded. | Run |
| `pipeline_run.failed`, `pipeline_run.filtered`, `pipeline_run.cancelled` | A run ends with that status. | Run |
| `pipeline_step.started` | A step starts. | Step |
| `pipeline_step.progress` | The `watermark_ms` of a segment step increases. At most one event for each step every 10 seconds. | Step |
| `pipeline_step.waiting_external` | An endpoint answered `202`. The step waits for the callback. | Step |
| `pipeline_step.waiting_review` | A review step opens a review task. | Step |
| `pipeline_step.retrying` | A step will start a new attempt, after a retryable failure or a retry of the run. | Step |
| `pipeline_step.completed`, `pipeline_step.failed`, `pipeline_step.skipped`, `pipeline_step.cancelled` | A step succeeds, fails, skips or is cancelled. | Step |
| `pipeline_review.decided` | A person or an API key approves or rejects a review. | Review |
| `pipeline_review.expired` | A review expires without a decision. | Review |
| `pipeline_group.created` | A group is created, `open` or `closed`. | Group |
| `pipeline_group.closed` | An open group is closed, and some of its runs did not finish. | Group |
| `pipeline_group.completed` | All runs of a closed group finished. | Group |
| `pipeline_group.reopened` | A retried run makes a completed group `closed` again. | Group |
| `file.receiving` | A streamed upload starts. | File |
| `file.sealed` | A streamed upload is sealed. This topic replaces `file.processing` for streamed uploads. | File |

- Run `data`: `id`, `pipeline_id`, `pipeline_version`, `pipeline_digest`, `group_id`, `file_id`, `external_id`, `metadata`, `status`, `sequence`, `created_at`, `completed_at`, `error`.
- Step `data`: `id`, `pipeline_run_id`, `run_metadata`, `step_key`, `namespace`, `type`, `status`, `attempt`, `sequence`, `started_at`, `completed_at`, `watermark_ms`, `review_task_id`, `error`.
- Review `data`: `id`, `pipeline_run_id`, `run_metadata`, `step_run_id`, `step_key`, `attempt`, `status` (`approved`, `rejected` or `expired`), `decision` (`{ decision, decided_by: { type, id }, reason }`, or `null` after expiry), `sequence`, `created_at`, `expires_at`, `decided_at`. The event does not contain the corrections of an approval. Get the review with `getPipelineReview` to read them.
- Group `data`: `id`, `pipeline_id`, `pipeline_version`, `external_id`, `metadata`, `status`, `completion_count`, `runs` (`total`, `succeeded`, `failed`, `filtered`, `cancelled`), `created_at`, `closed_at`, `completed_at`.
- `metadata` and `run_metadata` contain the `metadata` of the run or group when it was created.
- A run ends `filtered` only when filters or reviews stop all branches. A run with a stopped branch and a successful final step sends `pipeline_run.completed`. Each skipped step sends `pipeline_step.skipped`.
- File `data` has the same fields as the other file topics.
- `error` is `null` or `{ message, code }`.

Obey these rules:

- Select each pipeline topic on the API key. Editframe sends no topic that the key does not list.
- Create runs and groups with that API key. Editframe sends run, step and review topics only to the API key that created the run, and group topics only to the API key that created the group.
- Use `sequence` to order the run, step and review events of one run. Deliveries can arrive out of order.
- Expect `pipeline_step.started` again for the same `attempt`. A step that waits for a free worker slot sends it again when it starts.
- Expect no event when a step is created or becomes ready, and no review event when a review task opens. `pipeline_step.waiting_review` announces the task.
- Expect only `pipeline_group.completed` when you close a group whose runs all finished. After `pipeline_group.reopened`, expect `pipeline_group.completed` again.

For an organization with pipelines enabled, the API key form in the dashboard lists the pipeline topics under **Pipeline events**. A save of the form keeps the topics that the form does not list. The page of a run in the dashboard lists the webhook events of the run and its steps, with each delivery attempt.

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

Change the Webhook URL of an API key in the dashboard. Editframe then sends one test event to the new URL:

```typescript
{ topic: "webhook.test", data: { id: "<API key ID>", org_id: "<organization ID>" } }
```

The event carries `X-Webhook-Signature`, from the key's webhook secret. Accept the `webhook.test` topic in your handler.

To test a render or file topic, create a real render or upload a small file.

For local development, tunnel your dev server, for example with `ngrok http 3000`. Point the API key's Webhook URL at the tunnel URL while you test.

## Send Feedback

Send feedback to Editframe about problems and about improvements:

- If Editframe or this skill causes a problem, find a workaround and continue the task. Then report the problem and the workaround.
- If you find an improvement that can help other tasks too, not only your current task, send a suggestion. For example, suggest a clearer instruction, a missing example, a better default, or a new feature.

Send one report for each different problem or suggestion. If the report fails, continue the task.

```bash
curl -sS https://editframe.com/api/v1/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EDITFRAME_API_KEY" \
  --data-binary @- <<'JSON'
{
  "category": "bug",
  "skill": "webhooks",
  "summary": "One line that names the problem or the suggestion",
  "details": "For a problem: steps, expected result, actual result, and errors. For a suggestion: the change and how it helps.",
  "workaround": "The workaround that you used. Omit this field for a suggestion."
}
JSON
```

Set `category` to `bug`, `documentation`, `feature_request`, `performance`, or `other`. The API key is optional. A report without a key is anonymous. Do not put secrets, API keys, or personal data in a report. See the `editframe-api` skill for all fields, limits, and responses.
