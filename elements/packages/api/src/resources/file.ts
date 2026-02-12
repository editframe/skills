import debug from "debug";
import { z } from "zod";

import type { Client } from "../client.js";
import { ProgressIterator } from "../ProgressIterator.js";
import { uploadChunks } from "../uploadChunks.js";

const log = debug("ef:api:file");

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GiB
const MAX_IMAGE_SIZE = 1024 * 1024 * 16; // 16MB
const MAX_CAPTION_SIZE = 1024 * 1024 * 2; // 2MB

export const FileType = z.enum(["video", "image", "caption"]);
export type FileType = z.infer<typeof FileType>;

export const FileStatus = z.enum([
  "created",
  "uploading",
  "processing",
  "ready",
  "failed",
]);
export type FileStatus = z.infer<typeof FileStatus>;

export const CreateFilePayload = z.object({
  filename: z.string(),
  type: FileType,
  byte_size: z.number().int().positive(),
  md5: z.string().optional(),
  mime_type: z.string().optional(),
});

export type CreateFilePayload = z.infer<typeof CreateFilePayload>;

export interface FileRecord {
  id: string;
  filename: string;
  type: FileType;
  status: FileStatus;
  byte_size: number | null;
  md5: string | null;
  next_byte: number;
}

export interface CreateFileResult extends FileRecord {}

export interface FileDetail extends FileRecord {
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  created_at?: string;
  completed_at?: string | null;
  expires_at?: string | null;
  tracks?: Array<{
    track_id: number;
    type: string;
    codec_name: string;
    duration_ms: number;
    byte_size: number;
  }>;
}

export interface LookupFileByMd5Result extends FileRecord {}

export interface TranscribeFileResult {
  id: string;
  file_id: string;
  track_id: number;
}

export interface FileTranscriptionResult {
  id: string;
  work_slice_ms: number;
  status: string;
  completed_at: string | null;
  failed_at: string | null;
}

const MAX_SIZE_BY_TYPE: Record<FileType, number> = {
  video: MAX_VIDEO_SIZE,
  image: MAX_IMAGE_SIZE,
  caption: MAX_CAPTION_SIZE,
};

export const createFile = async (
  client: Client,
  payload: CreateFilePayload,
) => {
  log("Creating a file", payload);
  CreateFilePayload.parse(payload);

  const maxSize = MAX_SIZE_BY_TYPE[payload.type];
  if (payload.byte_size > maxSize) {
    throw new Error(
      `File size ${payload.byte_size} bytes exceeds limit ${maxSize} bytes for type ${payload.type}`,
    );
  }

  const response = await client.authenticatedFetch("/api/v1/files", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  log("File created", response.status, response.statusText);

  if (response.ok) {
    return (await response.json()) as CreateFileResult;
  }

  throw new Error(
    `Failed to create file ${response.status} ${response.statusText}`,
  );
};

export const uploadFile = (
  client: Client,
  uploadDetails: { id: string; byte_size: number; type: FileType },
  fileStream: ReadableStream,
) => {
  log("Uploading file", uploadDetails.id);

  const maxSize = MAX_SIZE_BY_TYPE[uploadDetails.type];

  return uploadChunks(client, {
    url: `/api/v1/files/${uploadDetails.id}/upload`,
    fileSize: uploadDetails.byte_size,
    fileStream,
    maxSize,
  });
};

export const getFileDetail = async (
  client: Client,
  id: string,
): Promise<FileDetail> => {
  const response = await client.authenticatedFetch(`/api/v1/files/${id}`, {
    method: "GET",
  });

  if (response.ok) {
    return (await response.json()) as FileDetail;
  }

  if (response.status === 404) {
    throw new Error(`File not found: ${id}`);
  }

  throw new Error(
    `Failed to get file detail ${response.status} ${response.statusText}`,
  );
};

export const lookupFileByMd5 = async (
  client: Client,
  md5: string,
): Promise<LookupFileByMd5Result | null> => {
  const response = await client.authenticatedFetch(
    `/api/v1/files/md5/${md5}`,
    {
      method: "GET",
    },
  );

  if (response.ok) {
    return (await response.json()) as LookupFileByMd5Result;
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(
    `Failed to lookup file by md5 ${md5} ${response.status} ${response.statusText}`,
  );
};

export const deleteFile = async (client: Client, id: string) => {
  const response = await client.authenticatedFetch(
    `/api/v1/files/${id}/delete`,
    {
      method: "POST",
    },
  );

  if (response.ok) {
    return (await response.json()) as { success: boolean };
  }

  throw new Error(
    `Failed to delete file ${id} ${response.status} ${response.statusText}`,
  );
};

export const getFileProcessingProgress = async (
  client: Client,
  id: string,
) => {
  const eventSource = await client.authenticatedEventSource(
    `/api/v1/files/${id}/progress`,
  );

  return new ProgressIterator(eventSource);
};

export const transcribeFile = async (
  client: Client,
  id: string,
  options: { trackId?: number } = {},
): Promise<TranscribeFileResult> => {
  const response = await client.authenticatedFetch(
    `/api/v1/files/${id}/transcribe`,
    {
      method: "POST",
      body: JSON.stringify(options),
    },
  );

  if (response.ok) {
    return (await response.json()) as TranscribeFileResult;
  }

  throw new Error(
    `Failed to transcribe file ${id} ${response.status} ${response.statusText}`,
  );
};

export const getFileTranscription = async (
  client: Client,
  id: string,
): Promise<FileTranscriptionResult | null> => {
  const response = await client.authenticatedFetch(
    `/api/v1/files/${id}/transcription`,
    {
      method: "GET",
    },
  );

  if (response.ok) {
    return (await response.json()) as FileTranscriptionResult;
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(
    `Failed to get file transcription ${id} ${response.status} ${response.statusText}`,
  );
};
