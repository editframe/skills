import { data } from "react-router";
import { writeReadableStreamToWritable } from "@react-router/node";
import { createWriteStream } from "node:fs";
import { parseRequestSession } from "@/util/session";
import { UPLOAD_TO_BUCKET } from "../../../lib/util/storageProvider.server";
import { parseByteRangeHeader } from "@/util/parseByteRangeHeader";
import { db } from "@/sql-client.server";
import { logger } from "@/logging";

type ValidUploadTypes = "audio_tracks" | "video_tracks" | "images";

export function isValidUploadType(
  uploadType: any,
): uploadType is ValidUploadTypes {
  return (
    uploadType === "audio_tracks" ||
    uploadType === "video_tracks" ||
    uploadType === "images"
  );
}

const MAX_CHUNK_SIZE = 1024 * 1024 * 8; // 8MiB

export async function receiveUploadChunk(
  request: Request,
  table: string,
  id: string,
) {
  if (!isValidUploadType(table)) {
    // DO NOT REMOVE THIS CHECK
    // THIS CHECK IS NECESSARY TO PREVENT UPLOADING TO THE WRONG TABLE
    // REMOVING THIS LINE WILL FEED USER SUPPLIED VALUES INTO A SQL QUERY
    throw new Response(null, { status: 404 });
  }

  if (!request.body) {
    throw new Response(null, { statusText: "No body", status: 400 });
  }
  const sessionInfo = await parseRequestSession(request);
  if (!sessionInfo) {
    throw new Response(null, { statusText: "Unauthorized", status: 401 });
  }
  const maybeRecord = await db
    .selectFrom(`video.${table}`)
    .where("id", "=", id)
    .where("creator_id", "=", sessionInfo.uid)
    .where("complete", "=", false)
    .select(["bytesize", "next_byte", "remote_uri"])
    .executeTakeFirst();

  if (!maybeRecord || !maybeRecord.remote_uri) {
    throw new Response(null, { statusText: "Not found", status: 404 });
  }

  const byteRangeHeader = request.headers.get("Content-Range");
  if (!byteRangeHeader) {
    throw new Response(null, {
      statusText: "Missing Content-Range header",
      status: 400,
    });
  }

  const byteRange = parseByteRangeHeader(byteRangeHeader);

  if (!byteRange) {
    throw new Response(null, {
      statusText: "Invalid Content-Range header",
      status: 400,
    });
  }

  if (
    byteRange.total !== maybeRecord.bytesize ||
    byteRange.end >= byteRange.total ||
    byteRange.start !== maybeRecord.next_byte
  ) {
    throw data(
      { error: "Invalid byte range", byteRange },
      {
        status: 400,
        headers: {
          "Content-Range": `bytes=0-${maybeRecord.bytesize - 1}/${maybeRecord.bytesize}`,
        },
      },
    );
  }

  const chunkSize = byteRange.end - byteRange.start + 1;

  if (chunkSize > MAX_CHUNK_SIZE) {
    throw data(
      { error: `Chunk size too large (max: ${MAX_CHUNK_SIZE} bytes)` },
      { status: 400 },
    );
  }

  if (UPLOAD_TO_BUCKET) {
    const remoteUrl = maybeRecord.remote_uri;
    const headers = {
      "Content-Range": `bytes ${byteRange.start}-${byteRange.end}/${byteRange.total}`,
      "Content-Length": String(chunkSize),
    };
    logger.info({ remoteUrl, headers }, "Uploading to GCS");
    if (typeof remoteUrl !== "string") {
      const response = await fetch(remoteUrl, {
        body: request.body,
        method: "PUT",
        headers,
      });
      if (!response.ok && response.status !== 308) {
        logger.error(
          {
            status: response.status,
            statusText: response.statusText,
            body: await response.text(),
          },
          "Failed to upload chunk. Message from GCS",
        );
        throw new Response(null, { status: 500 });
      }
      switch (response.status) {
        case 308: {
          await db
            .updateTable(`video.${table}`)
            .set({ next_byte: byteRange.end + 1 })
            .where("id", "=", id)
            .execute();
          return data(
            {},
            {
              status: 202,
              headers: {
                "Content-Range": `bytes=0-${byteRange.end}/${byteRange.total}`,
              },
            },
          );
        }
        case 200:
        case 201: {
          const endResult = await db
            .updateTable(`video.${table}`)
            .set({ complete: true, next_byte: byteRange.end + 1 })
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirst();

          if (!endResult) {
            throw data(
              { error: "Failed to mark as complete" },
              { status: 500 },
            );
          }
          return data(endResult, { status: 201 });
        }
      }

      response.headers;
    } else {
      const writeStream = createWriteStream(`./data/${table}/${id}`, {
        flags: "a",
        start: byteRange.start,
      });

      await writeReadableStreamToWritable(request.body, writeStream);

      logger.info(
        {
          start: byteRange.start,
          end: byteRange.end,
          size: chunkSize,
        },
        "Wrote chunk",
      );

      // still more to upload
      if (byteRange.end < maybeRecord.bytesize - 1) {
        await db
          .updateTable(`video.${table}`)
          .set({ next_byte: byteRange.end + 1 })
          .where("id", "=", id)
          .execute();

        return data(
          {},
          {
            status: 202,
            headers: {
              "Content-Range": `bytes=0-${byteRange.end}/${maybeRecord.bytesize}`,
            },
          },
        );
      }

      // Upload is complete
      const endResult = await db
        .updateTable(`video.${table}`)
        .set({ complete: true, next_byte: byteRange.end + 1 })
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirst();

      if (!endResult) {
        throw data({ error: "Failed to mark as complete" }, { status: 500 });
      }
      return data(endResult, { status: 201 });
    }
  }
}
