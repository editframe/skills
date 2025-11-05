import debug from "debug";
import { z } from "zod";
import type { Client } from "../client.js";
import { CompletionIterator } from "../ProgressIterator.js";

const log = debug("ef:api:transcriptions");

export const CreateTranscriptionPayload = z.object({
  file_id: z.string(),
  track_id: z.number().int(),
});

export type CreateTranscriptionPayload = z.infer<
  typeof CreateTranscriptionPayload
>;

export interface CreateTranscriptionResult {
  id: string;
  status: "complete" | "created" | "failed" | "pending" | "transcribing";
}

export interface TranscriptionInfoResult {
  id: string;
  status: "complete" | "created" | "failed" | "pending" | "transcribing";
}

export const createTranscription = async (
  client: Client,
  payload: CreateTranscriptionPayload,
) => {
  log("Creating transcription", payload);
  const response = await client.authenticatedFetch("/api/v1/transcriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  log("Transcription created", response);
  if (response.ok) {
    return (await response.json()) as CreateTranscriptionResult;
  }

  throw new Error(
    `Failed to create transcription ${response.status} ${response.statusText}`,
  );
};

export const getTranscriptionProgress = async (client: Client, id: string) => {
  const eventSource = await client.authenticatedEventSource(
    `/api/v1/transcriptions/${id}/progress`,
  );

  return new CompletionIterator(eventSource);
};

export const getTranscriptionInfo = async (client: Client, id: string) => {
  const response = await client.authenticatedFetch(
    `/api/v1/transcriptions/${id}`,
  );

  if (response.ok) {
    return (await response.json()) as TranscriptionInfoResult;
  }

  throw new Error(
    `Failed to get transcription info ${response.status} ${response.statusText}`,
  );
};
