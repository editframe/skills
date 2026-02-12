import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
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
import {
  createFile,
  type FileType,
  uploadFile,
} from "./resources/file.js";

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

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".webm",
  ".mkv",
  ".avi",
  ".m4v",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".m4a",
]);
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
]);
const CAPTION_EXTENSIONS = new Set([".vtt", ".srt", ".json"]);

function inferFileType(filePath: string): FileType {
  const ext = extname(filePath).toLowerCase();
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (CAPTION_EXTENSIONS.has(ext)) return "caption";
  return "video";
}

export const upload = async (client: Client, filePath: string) => {
  const fileInfo = await stat(filePath);
  const byte_size = fileInfo.size;
  const md5 = await md5FilePath(filePath);
  const filename = basename(filePath);
  const type = inferFileType(filePath);
  const mime_type = lookup(filePath) || undefined;

  const file = await createFile(client, {
    filename,
    type,
    byte_size,
    md5,
    mime_type,
  });

  const { createReadStream } = await import("node:fs");
  const readStream = createReadStream(filePath);
  const { createReadableStreamFromReadable } = await import(
    "./utils/createReadableStreamFromReadable.ts"
  );

  const uploadIterator = uploadFile(
    client,
    { id: file.id, byte_size, type },
    createReadableStreamFromReadable(readStream),
  );

  return { file, uploadIterator };
};

export * from "./index.js";
