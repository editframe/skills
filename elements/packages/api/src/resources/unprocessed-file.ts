import debug from "debug";
import { z } from "zod";

import type { Client } from "../client.js";
import { uploadChunks } from "../uploadChunks.js";
import { assertTypesMatch } from "../utils/assertTypesMatch.ts";

const log = debug("ef:api:unprocessed-file");

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GiB

export const CreateUnprocessedFilePayload = z.object({
  md5: z.string(),
  filename: z.string(),
  byte_size: z.number().int().max(MAX_FILE_SIZE),
});

export const UpdateUnprocessedFilePayload = z.object({});

export type CreateUnprocessedFilePayload = z.infer<
  typeof CreateUnprocessedFilePayload
>;

export interface UnprocessedFile {
  byte_size: number;
  next_byte: number;
  complete: boolean;
  id: string;
  md5: string;
}

export interface UnprocessedFileUploadDetails {
  id: string;
  byte_size: number;
}

// Ensure that the UnprocessedFileUploadDetails type matches the shape of the
// UnprocessedFile type, but without the optional fields.
assertTypesMatch<
  Pick<UnprocessedFile, "id" | "byte_size">,
  UnprocessedFileUploadDetails
>(true);

export interface CreateUnprocessedFileResult extends UnprocessedFile {}

export interface LookupUnprocessedFileByMd5Result extends UnprocessedFile {}

export interface UpdateUnprocessedFileResult extends UnprocessedFile {}

export interface ProcessIsobmffFileResult {
  id: string;
}

export const createUnprocessedFile = async (
  client: Client,
  payload: CreateUnprocessedFilePayload,
) => {
  log("Creating an unprocessed file", payload);
  CreateUnprocessedFilePayload.parse(payload);
  const response = await client.authenticatedFetch(
    "/api/v1/unprocessed_files",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  log(
    "Unprocessed file created",
    response.status,
    response.statusText,
    response.headers,
  );

  if (response.ok) {
    return (await response.json()) as CreateUnprocessedFileResult;
  }

  throw new Error(
    `Failed to create unprocessed file ${response.status} ${response.statusText}`,
  );
};

export const uploadUnprocessedReadableStream = (
  client: Client,
  uploadDetails: UnprocessedFileUploadDetails,
  fileStream: ReadableStream,
) => {
  log("Uploading unprocessed file", uploadDetails.id);

  return uploadChunks(client, {
    url: `/api/v1/unprocessed_files/${uploadDetails.id}/upload`,
    fileSize: uploadDetails.byte_size,
    fileStream,
    maxSize: MAX_FILE_SIZE,
  });
};

export const lookupUnprocessedFileByMd5 = async (
  client: Client,
  md5: string,
): Promise<LookupUnprocessedFileByMd5Result | null> => {
  const response = await client.authenticatedFetch(
    `/api/v1/unprocessed_files/md5/${md5}`,
    {
      method: "GET",
    },
  );

  if (response.ok) {
    return (await response.json()) as LookupUnprocessedFileByMd5Result;
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(
    `Failed to lookup unprocessed file by md5 ${md5} ${response.status} ${response.statusText}`,
  );
};

export const processIsobmffFile = async (client: Client, id: string) => {
  const response = await client.authenticatedFetch(
    `/api/v1/unprocessed_files/${id}/isobmff`,
    {
      method: "POST",
    },
  );

  if (response.ok) {
    return (await response.json()) as ProcessIsobmffFileResult;
  }

  throw new Error(
    `Failed to process isobmff file ${id} ${response.status} ${response.statusText}`,
  );
};
