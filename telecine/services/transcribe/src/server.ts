import express from "express";
import type { TrackFragmentIndex } from "@editframe/assets";

console.log("LAUNCHED SERVER");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log("Request", req.method, req.url);
  next();
  res.on("finish", () => {
    console.log(
      "Response",
      req.method,
      req.url,
      res.statusCode,
      res.statusMessage,
    );
  });
});

app.get("/healthz", (_req, res) => {
  res.writeHead(200);
  res.end();
});

app.get("/_/transcriptions/:id/fragment/:segmentId", async (req, res) => {
  console.log("Transcribe request", req.method, req.url);

  try {
    const z = await import("zod");
    const { db } = await import("@/sql-client.server");
    const { parseRequestSession } = await import("@/util/session");
    const { isobmffIndexFilePath, transcribeFragmentFilePath } = await import(
      "@/util/filePaths"
    );

    const { storageProvider } = await import("@/util/storageProvider.server");
    const { readIntoBuffer } = await import("@/util/readIntoBuffer");
    const { transcribeFragment } = await import("./transcribeFragment");

    console.log("Validating request parameters...");
    const paramsSchema = z.object({
      id: z.string(),
      segmentId: z.coerce.number().int().min(0),
    });

    const parsedParams = paramsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }

    const params = parsedParams.data;

    console.log("Validating session...");

    const session = await parseRequestSession(req);
    console.log("Session validation result:", session ? "valid" : "invalid");
    if (!session) {
      res.writeHead(401);
      res.end("Unauthorized");
      return;
    }

    console.log("Fetching transcription record...");

    const transcriptionInfo = await db
      .selectFrom("video2.transcriptions")
      .where("video2.transcriptions.id", "=", params.id)
      .select(["org_id", "track_id", "file_id", "work_slice_ms"])
      .executeTakeFirst();

    if (!transcriptionInfo) {
      res.writeHead(404);
      res.end("Transcription record not found");
      return;
    }

    console.log("Reading index file...");

    const indexFilePath = isobmffIndexFilePath({
      org_id: transcriptionInfo.org_id,
      id: transcriptionInfo.file_id,
    });

    const fragmentPath = transcribeFragmentFilePath({
      org_id: transcriptionInfo.org_id,
      id: transcriptionInfo.file_id,
      segmentId: params.segmentId,
    });

    const indexFileStream =
      await storageProvider.createReadStream(indexFilePath);
    const indexFileContents = await readIntoBuffer(indexFileStream);
    console.log("Index file read successfully, parsing contents...");

    const indexFileData = JSON.parse(
      indexFileContents.toString("utf-8"),
    ) as Record<number, TrackFragmentIndex>;

    const fragmentIndex = indexFileData[transcriptionInfo.track_id];

    console.log("Found track IDs in index:", Object.keys(indexFileData));

    if (!fragmentIndex) {
      res.writeHead(404);
      res.end("Track not found in index file");
      return;
    }

    console.log("Checking if fragment already exists...");

    if (await storageProvider.pathExists(fragmentPath)) {
      console.log("Fragment already exists, returning early");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ reason: "Resource already exists" }));
    }

    console.log("Starting transcription for fragment", params.segmentId);

    const transcription = await transcribeFragment(
      transcriptionInfo,
      fragmentIndex,
      params.segmentId,
    );
    console.log("Transcription completed successfully");

    console.log("Writing transcription to", fragmentPath);
    await storageProvider.writeFile(
      fragmentPath,
      JSON.stringify(transcription),
    );
    console.log("Transcription written to", fragmentPath);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error during transcription:", {
      type: error.constructor?.name,
      message: error.message,
      stack: error.stack,
    });
    if (!res.headersSent) {
      res.writeHead(error.statusCode ?? 500, {
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          type: error.constructor?.name ?? "(unknown error type)",
          message: error.message ?? "(no message)",
        }),
      );
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Transcription service listening on http://localhost:${PORT}`);
});
