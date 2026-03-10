import type { Client } from "../client.js";
import { ProgressIterator } from "../ProgressIterator.js";

export interface IsobmffProcessInfoResult {
  id: string;
  created_at: string;
  completed_at: string | null;
  failed_at: string | null;
  isobmff_file_id: string | null;
  unprocessed_file_id: string | null;
}

export const getIsobmffProcessProgress = async (client: Client, id: string) => {
  const eventSource = await client.authenticatedEventSource(
    `/api/v1/process_isobmff/${id}/progress`,
  );

  return new ProgressIterator(eventSource);
};

export const getIsobmffProcessInfo = async (client: Client, id: string) => {
  const response = await client.authenticatedFetch(`/api/v1/process_isobmff/${id}`);

  if (response.ok) {
    return (await response.json()) as IsobmffProcessInfoResult;
  }

  throw new Error(`Failed to get isobmff process info ${response.status} ${response.statusText}`);
};
