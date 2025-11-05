import { writeReadableStreamToWritable } from "@react-router/node";
import { storageProvider, UPLOAD_TO_BUCKET } from "./storageProvider.server";
import { parseByteRangeHeader } from "@/util/parseByteRangeHeader";
import { once } from "node:events";
import { logger } from "@/logging";

const MAX_CHUNK_SIZE = 1024 * 1024 * 8;

interface UploadRecord {
  byte_size: number;
  next_byte: number;
  remote_uri: string;
}

export async function receiveAssetChunk(
  request: Request,
  uploadRecord: UploadRecord,
) {
  if (!request.body) {
    throw new Response(null, {
      statusText: "Missing body",
      status: 400,
    });
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
      statusText: "Unparsable Content-Range header",
      status: 400,
    });
  }

  logger.info({ byteRange, uploadRecord }, "Validating byte range");
  if (
    byteRange.total !== uploadRecord.byte_size ||
    byteRange.end >= byteRange.total ||
    byteRange.start !== uploadRecord.next_byte
  ) {
    logger.error({ byteRange, uploadRecord }, "Invalid byte range");
    throw new Response(
      JSON.stringify({ error: "Inavalid byte range", byteRange }),
      {
        status: 400,
        statusText: "Invalid byte range",
        headers: {
          "Content-Range": `bytes=0-${uploadRecord.byte_size - 1}/${uploadRecord.byte_size}`,
          "Content-Type": "application/json",
        },
      },
    );
  }

  logger.info("Valid byte range");

  const chunkSize = byteRange.end - byteRange.start + 1;

  if (chunkSize > MAX_CHUNK_SIZE) {
    throw new Response(
      JSON.stringify({
        error: `Chunk size too large (max: ${MAX_CHUNK_SIZE} bytes)`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (UPLOAD_TO_BUCKET) {
    const remoteUrl = uploadRecord.remote_uri;
    const headers = {
      "Content-Range": `bytes ${byteRange.start}-${byteRange.end}/${byteRange.total}`,
      "Content-Length": String(chunkSize),
    };
    logger.info({ remoteUrl, headers }, "Uploading to GCS");
    const response = await fetch(remoteUrl, {
      body: request.body,
      method: "PUT",
      headers,
    });
    if (!response.ok && response.status !== 308) {
      logger.error({ response }, "Failed to upload chunk. Message from GCS");
      throw new Response(null, { status: 500 });
    }
    switch (response.status) {
      case 308: {
        return {
          nextByte: byteRange.end + 1,
          complete: false,
        } as const;
      }
      case 200:
      case 201: {
        return {
          complete: true,
          nextByte: byteRange.end + 1,
        } as const;
      }
      default: {
        logger.error(
          {
            status: response.status,
            statusText: response.statusText,
            text: await response.text(),
          },
          "Failed to upload chunk. Message from GCS",
        );
        throw new Response(null, {
          status: 500,
          statusText: "Failed to upload chunk",
        });
      }
    }
  }

  const filePath = uploadRecord.remote_uri.replace(/^local:/, "");

  const writeStream = await storageProvider.createResumableWriteStream(
    filePath,
    byteRange.start,
  );

  await writeReadableStreamToWritable(request.body, writeStream);
  await once(writeStream, "finalized");

  // still more to upload
  if (byteRange.end < uploadRecord.byte_size - 1) {
    return {
      nextByte: byteRange.end + 1,
      complete: false,
      status: 202,
      headers: {
        "Content-Range": `bytes=0-${byteRange.end}/${byteRange.total}`,
      },
    } as const;
  }

  return {
    complete: true,
    status: 201,
    nextByte: byteRange.end + 1,
  } as const;
}
