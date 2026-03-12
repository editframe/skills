import { z } from "zod";
import { Users } from "./users";
import { Orgs } from "./orgs";
import { Files } from "./files";
import { Invites } from "./invites";
import { ApiKeys } from "./api-keys";
import { Webhooks } from "./webhooks";
export type {
  ContentBlock,
  ResourceView,
  RowTypeGlobal as RowType,
  DetailRecordTypeGlobal as DetailRecordType,
} from "../types";
export { global as dataShape } from "../types";

export const adminResourceUrl = (resourceType: string, id: string) =>
  `/admin/${resourceType}/${id}`;

export const ResourceModules = {
  users: Users,
  orgs: Orgs,
  files: Files,
  // image_files: ImageFiles,
  invites: Invites,
  // isobmff_files: ISOBMFFFiles,
  // unprocessed_files: UnprocessedFiles,
  // renders: Renders,
  // transcriptions: Transcriptions,
  // process_isobmff: ProcessIsoBmff,
  webhooks: Webhooks,
  api_keys: ApiKeys,
} as const;

export const ResourceType = z.enum(
  Object.keys(ResourceModules) as [string, ...string[]],
);
