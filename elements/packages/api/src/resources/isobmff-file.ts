import debug from "debug";
import { z } from "zod";

import type { Client } from "../client.js";

const log = debug("ef:api:isobmff-file");
const FILE_SIZE_LIMIT = 1024 * 1024 * 2; // 32MB

export const CreateISOBMFFFilePayload = z.object({
  md5: z.string(),
  filename: z.string(),
});

export type CreateISOBMFFFilePayload = z.infer<typeof CreateISOBMFFFilePayload>;

/** @deprecated Use the unified file API from ./file.js instead */
export interface CreateISOBMFFFileResult {
  /**
   * Whether the fragment index is complete. The fragment index is used internally by editframe to efficiently seek within files.
   */
  fragment_index_complete: boolean;
  /**
   * The filename of the isobmff file
   */
  filename: string;
  /**
   * The id of the isobmff file
   */
  id: string;
  /**
   * The md5 hash of the isobmff file
   */
  md5: string;
}

export interface LookupISOBMFFFileByMd5Result {
  /**
   * Whether the fragment index is complete
   */
  fragment_index_complete: boolean;
  /**
   * The filename of the isobmff file
   */
  filename: string;
  id: string;
  md5: string;
}

/** @deprecated Use the unified file API from ./file.js instead */
export interface GetISOBMFFFileTranscriptionResult {
  id: string;
  work_slice_ms: number;
  isobmff_track: {
    duration_ms: number;
  };
}

/** @deprecated Use the unified file API from ./file.js instead */
export const createISOBMFFFile = async (
  client: Client,
  payload: CreateISOBMFFFilePayload,
) => {
  log("Creating isobmff file", payload);
  const response = await client.authenticatedFetch("/api/v1/isobmff_files", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  log("ISOBMFF file created", response);

  if (response.ok) {
    return (await response.json()) as CreateISOBMFFFileResult;
  }

  throw new Error(
    `Failed to create isobmff file ${response.status} ${response.statusText}`,
  );
};

/** @deprecated Use the unified file API from ./file.js instead */
export const uploadFragmentIndex = async (
  client: Client,
  fileId: string,
  fileStream: ReadableStream,
  fileSize: number,
) => {
  log("Uploading fragment index", fileId);
  if (fileSize > FILE_SIZE_LIMIT) {
    throw new Error(`File size exceeds limit of ${FILE_SIZE_LIMIT} bytes`);
  }
  const response = await client.authenticatedFetch(
    `/api/v1/isobmff_files/${fileId}/index/upload`,
    {
      method: "POST",
      body: fileStream,
      duplex: "half",
    },
  );

  log("Fragment index uploaded", response);
  if (response.ok) {
    return response.json();
  }

  throw new Error(
    `Failed to create fragment index ${response.status} ${response.statusText}`,
  );
};

/** @deprecated Use the unified file API from ./file.js instead */
export const lookupISOBMFFFileByMd5 = async (
  client: Client,
  md5: string,
): Promise<LookupISOBMFFFileByMd5Result | null> => {
  const response = await client.authenticatedFetch(
    `/api/v1/isobmff_files/md5/${md5}`,
    {
      method: "GET",
    },
  );
  log("ISOBMFF file lookup", response);

  if (response.ok) {
    return (await response.json()) as LookupISOBMFFFileByMd5Result;
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(
    `Failed to lookup isobmff file by md5 ${md5} ${response.status} ${response.statusText}`,
  );
};

/** @deprecated Use the unified file API from ./file.js instead */
export const getISOBMFFFileTranscription = async (
  client: Client,
  id: string,
): Promise<GetISOBMFFFileTranscriptionResult | null> => {
  const response = await client.authenticatedFetch(
    `/api/v1/isobmff_files/${id}/transcription`,
  );

  if (response.ok) {
    return (await response.json()) as GetISOBMFFFileTranscriptionResult;
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(
    `Failed to get isobmff file transcription ${id} ${response.status} ${response.statusText}`,
  );
};

export const TranscribeISOBMFFFilePayload = z.object({
  trackId: z.string().optional(),
});

export type TranscribeISOBMFFFilePayload = z.infer<
  typeof TranscribeISOBMFFFilePayload
>;

/** @deprecated Use the unified file API from ./file.js instead */
export interface TranscribeISOBMFFFileResult {
  id: string;
  file_id: string;
  track_id: number;
}

/** @deprecated Use the unified file API from ./file.js instead */
export const transcribeISOBMFFFile = async (
  client: Client,
  id: string,
  payload: TranscribeISOBMFFFilePayload = {},
) => {
  const response = await client.authenticatedFetch(
    `/api/v1/isobmff_files/${id}/transcribe`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (response.ok) {
    return (await response.json()) as TranscribeISOBMFFFileResult;
  }

  throw new Error(
    `Failed to transcribe isobmff file ${id} ${response.status} ${response.statusText}`,
  );
};
