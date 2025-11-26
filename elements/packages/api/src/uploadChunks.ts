import debug from "debug";

import { CHUNK_SIZE_BYTES } from "./CHUNK_SIZE_BYTES.js";
import type { Client } from "./client.js";
import { streamChunker } from "./streamChunker.js";

const log = debug("ef:api:uploadChunk");

interface UploadChunkOptions {
  url: string;
  chunkBuffer: Uint8Array;
  chunkNumber: number;
  fileSize: number;
  chunkSizeBytes?: number;
}

/**
 * @internal
 */
export interface IteratorWithPromise<T> extends AsyncGenerator<
  T,
  void,
  unknown
> {
  whenUploaded: () => Promise<T[]>;
}

export const fakeCompleteUpload = (): IteratorWithPromise<UploadChunkEvent> => {
  const makeGenerator = async function* (): AsyncGenerator<
    UploadChunkEvent,
    void,
    unknown
  > {
    yield { type: "progress", progress: 1 };
  };

  const generator = makeGenerator() as IteratorWithPromise<UploadChunkEvent>;
  generator.whenUploaded = async () => {
    return [{ type: "progress", progress: 1 }];
  };
  return generator;
};

const uploadChunk = async (
  client: Client,
  {
    url,
    chunkBuffer,
    chunkNumber,
    fileSize,
    chunkSizeBytes = CHUNK_SIZE_BYTES,
  }: UploadChunkOptions,
) => {
  const startByte = chunkNumber * chunkSizeBytes;
  const endByte = startByte + chunkBuffer.length - 1;

  log(`Uploading chunk ${chunkNumber} for ${url}`);
  const response = await client.authenticatedFetch(url, {
    method: "POST",
    headers: {
      "Content-Range": `bytes=${startByte}-${endByte}/${fileSize}`,
      "Content-Type": "application/octet-stream",
    },
    body: chunkBuffer,
  });

  if (response.ok) {
    if (response.status === 201) {
      log(`File ${url} fully uploaded`);
      return { complete: true, body: await response.json() };
    }
    if (response.status === 202) {
      log(`File ${url} chunk ${chunkNumber} uploaded`);
      return { complete: false, body: await response.json() };
    }
  }

  throw new Error(
    `Failed to upload chunk ${chunkNumber} for ${url} ${response.status} ${response.statusText}`,
  );
};

interface UploadChunksOptions {
  url: string;
  fileStream: ReadableStream;
  fileSize: number;
  maxSize: number;
  chunkSizeBytes?: number;
}

export interface UploadChunkEvent {
  type: "progress";
  progress: number;
}

export function uploadChunks(
  client: Client,
  {
    url,
    fileSize,
    fileStream,
    maxSize,
    chunkSizeBytes = CHUNK_SIZE_BYTES,
  }: UploadChunksOptions,
): IteratorWithPromise<UploadChunkEvent> {
  const makeGenerator = async function* (): AsyncGenerator<
    UploadChunkEvent,
    void,
    unknown
  > {
    if (fileSize > maxSize) {
      throw new Error(
        `File size ${fileSize} bytes exceeds limit ${maxSize} bytes`,
      );
    }

    log("Checking upload status", url);
    const uploadStatus = await client.authenticatedFetch(url);

    yield { type: "progress", progress: 0 };

    if (uploadStatus.status === 200) {
      log("Chunk already uploaded");
      yield { type: "progress", progress: 1 };
      return;
    }

    let chunkNumber = 0;
    let complete = false;
    for await (const chunkBuffer of streamChunker(fileStream, chunkSizeBytes)) {
      log(`Uploading chunk ${chunkNumber}`);
      ({ complete } = await uploadChunk(client, {
        url: url,
        chunkBuffer,
        chunkNumber,
        fileSize,
        chunkSizeBytes,
      }));
      chunkNumber++;
      yield {
        type: "progress",
        progress: Math.min(1, chunkNumber / (fileSize / chunkSizeBytes)),
      };
    }
    if (!complete) {
      throw new Error("Did not complete upload");
    }
  };

  const generator = makeGenerator() as IteratorWithPromise<UploadChunkEvent>;
  generator.whenUploaded = async () => {
    if (fileSize > maxSize) {
      throw new Error(
        `File size ${fileSize} bytes exceeds limit ${maxSize} bytes`,
      );
    }
    const events: UploadChunkEvent[] = [];
    for await (const event of generator) {
      events.push(event);
    }
    return events;
  };
  return generator;
}
