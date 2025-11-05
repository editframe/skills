import debug from "debug";
import { z } from "zod";

import type { Client } from "../client.js";

const log = debug("ef:api:caption-file");

const MAX_CAPTION_SIZE = 1024 * 1024 * 2; // 2MB

export const CreateCaptionFilePayload = z.object({
  /**
   * The md5 hash of the caption file
   */
  md5: z.string(),
  /**
   * The filename of the caption file
   */
  filename: z.string(),
  /**
   * The size of the caption file in bytes
   */
  byte_size: z.number().int().max(MAX_CAPTION_SIZE),
});

export type CreateCaptionFilePayload = z.infer<typeof CreateCaptionFilePayload>;

export interface CreateCaptionFileResult {
  /**
   * Whether the caption file is complete
   */
  complete: boolean | null;
  /**
   * The id of the caption file
   */
  id: string;
  /**
   * The md5 hash of the caption file
   */
  md5: string;
}

export interface LookupCaptionFileByMd5Result {
  /**
   * Whether the caption file is complete
   */
  complete: boolean | null;
  /**
   * The id of the caption file
   */
  id: string;
  /**
   * The md5 hash of the caption file
   */
  md5: string;
}

const restrictSize = (size: number) => {
  if (size > MAX_CAPTION_SIZE) {
    throw new Error(
      `File size ${size} bytes exceeds limit ${MAX_CAPTION_SIZE} bytes\n`,
    );
  }
};

/**
 * Create a caption file
 * @param client - The authenticated client to use for the request
 * @param payload -  The payload to send to the server
 * @returns The result of the request
 * @example
 * ```ts
 * const result = await createCaptionFile(client, {
 *  id: "123",
 * filename: "caption.srt",
 * });
 * console.log(result);
 * ```
 * @category CaptionFile
 * @resource
 * @beta
 */
export const createCaptionFile = async (
  client: Client,
  payload: CreateCaptionFilePayload,
) => {
  log("Creating caption file", payload);
  restrictSize(payload.byte_size);
  const response = await client.authenticatedFetch("/api/v1/caption_files", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  log("Caption file created", response);

  if (response.ok) {
    return (await response.json()) as CreateCaptionFileResult;
  }

  throw new Error(
    `Failed to create caption ${response.status} ${response.statusText}`,
  );
};

export const uploadCaptionFile = async (
  client: Client,
  fileId: string,
  fileStream: ReadableStream,
  fileSize: number,
) => {
  log("Uploading caption file", fileId);
  restrictSize(fileSize);

  const response = await client.authenticatedFetch(
    `/api/v1/caption_files/${fileId}/upload`,
    {
      method: "POST",
      body: fileStream,
      duplex: "half",
    },
  );
  log("Caption file uploaded", response);

  if (response.ok) {
    return response.json();
  }

  throw new Error(
    `Failed to upload caption ${response.status} ${response.statusText}`,
  );
};

export const lookupCaptionFileByMd5 = async (
  client: Client,
  md5: string,
): Promise<LookupCaptionFileByMd5Result | null> => {
  const response = await client.authenticatedFetch(
    `/api/v1/caption_files/md5/${md5}`,
    {
      method: "GET",
    },
  );
  log("Caption file lookup", response);

  if (response.ok) {
    return (await response.json()) as LookupCaptionFileByMd5Result;
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(
    `Failed to lookup caption by md5 ${md5} ${response.status} ${response.statusText}`,
  );
};
