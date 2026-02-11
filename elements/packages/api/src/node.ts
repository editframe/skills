import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { md5FilePath } from "@editframe/assets";
import { lookup } from "mime-types";

import type { Client } from "./client.js";
import {
  CreateImageFilePayload,
  createImageFile,
} from "./resources/image-file.js";
import {
  createUnprocessedFile,
  type UnprocessedFileUploadDetails,
  uploadUnprocessedReadableStream,
} from "./resources/unprocessed-file.js";

export { createReadableStreamFromReadable } from "./utils/createReadableStreamFromReadable.js";

export const createImageFileFromPath = async (client: Client, path: string) => {
  const fileInfo = await stat(path);

  const byte_size = fileInfo.size;

  const md5 = await md5FilePath(path);

  const mime_type = lookup(path) || null;

  return createImageFile(client, {
    ...CreateImageFilePayload.parse({
      md5,
      height: 0,
      width: 0,
      mime_type,
      filename: basename(path),
      byte_size,
    }),
  });
};

export const createUnprocessedFileFromPath = async (
  client: Client,
  path: string,
) => {
  const fileInfo = await stat(path);

  const byte_size = fileInfo.size;

  const md5 = await md5FilePath(path);

  return createUnprocessedFile(client, {
    md5,
    filename: basename(path),
    byte_size,
  });
};

export const uploadUnprocessedFile = async (
  client: Client,
  uploadDetails: UnprocessedFileUploadDetails,
  path: string,
) => {
  const { createReadStream } = await import("node:fs");
  const readStream = createReadStream(path);

  const { createReadableStreamFromReadable } =
    await import("./utils/createReadableStreamFromReadable.ts");

  return uploadUnprocessedReadableStream(
    client,
    uploadDetails,
    createReadableStreamFromReadable(readStream),
  );
};

export * from "./index.js";
