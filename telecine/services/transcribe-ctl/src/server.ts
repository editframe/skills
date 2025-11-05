import { db } from "@/sql-client.server";
import { raceTimeout } from "@/util/raceTimeout";
import { Video2TranscriptionController } from "@/util/Video2TranscriptionController.server";
import { createServer, type IncomingMessage } from "node:http";

async function validateAndParsePayload(req: IncomingMessage) {
  const { z } = await import("zod");
  const validator = z.object({
    created_at: z.string(),
    delivery_info: z.object({
      current_retry: z.number(),
      max_retries: z.number(),
    }),
    event: z.object({
      data: z.object({
        new: z.object({
          id: z.string().uuid(),
          org_id: z.string().uuid(),
          creator_id: z.string().uuid(),
          file_id: z.string().uuid(),
          track_id: z.number(),
          work_slice_ms: z.number(),
          status: z.string(),
          created_at: z.string(),
          updated_at: z.string(),
          completed_at: z.string().nullable(),
          api_key_id: z.string().uuid().nullable(),
        }),
      }),
    }),
  });

  const body = await new Promise<string>((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

  return validator.parse(JSON.parse(body));
}

const server = createServer(async (req, res) => {
  if (req.url?.startsWith("/healthz")) {
    const { valkey } = await import("@/valkey/valkey");
    return await raceTimeout(1000, "Valkey not ready", valkey.ping())
      .then(() => {
        res.writeHead(200);
        res.end("OK");
      })
      .catch((error) => {
        console.log("Valkey not ready", error);
        res.writeHead(500);
        res.end("Valkey not ready");
      });
  }
  // Intentionally avoiding logging healthz requests
  console.log("TranscribeCTL request", req.method, req.url);

  if (req.headers["x-action-secret"] !== process.env.ACTION_SECRET) {
    console.log(
      "Unauthorized access without matching x-action-secret",
      req.headers["x-action-secret"],
    );
    res.writeHead(401);
    res.end("Unauthorized");
    return;
  }

  const abortController = new AbortController();

  // TODO: correctly handle client disconnects
  // this was firing as soon as the body was read
  // req.on("close", () => {
  //   if (completed) return;
  //   abortController.abort("CLIENT_DISCONNECTED");
  // });

  try {
    const payload = await validateAndParsePayload(req);
    console.log("Received payload: ", payload);

    const { id, org_id, creator_id, work_slice_ms, file_id, track_id } =
      payload.event.data.new;

    const isLastRetry =
      payload.delivery_info.current_retry === payload.delivery_info.max_retries;

    const { storageProvider } = await import("@/util/storageProvider.server");

    console.log("Starting transcription for", id, "isLastRetry", isLastRetry);

    const track = await db
      .selectFrom("video2.isobmff_tracks")
      .where("file_id", "=", file_id)
      .where("track_id", "=", track_id)
      .selectAll()
      .executeTakeFirstOrThrow();

    const transcriptionController = new Video2TranscriptionController({
      id,
      org_id,
      creator_id,
      duration_ms: track.duration_ms,
      work_slice_ms,
      abortController,
      isLastRetry,
      storageProvider,
    });

    console.log("Starting transcription");
    await transcriptionController.transcribe();
    console.log("Transcription complete");
    res.writeHead(200);
    res.end("OK");
  } catch (error: any) {
    console.log("Error during transcription", error);
    abortController.abort("RUNTIME_ERROR");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        type: error.constructor?.name ?? "(unknown error type)",
        message: error.message ?? "(no message)",
      }),
    );
    return;
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`transcription-ctl listening on port ${PORT}`);
});
