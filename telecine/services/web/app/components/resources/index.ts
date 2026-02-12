import { ApiKeys } from "./api-keys";
import { ISOBMFFFiles } from "./isobmff-files";
import { ProcessIsoBmff } from "./process-isobmff";
import { UnprocessedFiles } from "./unprocessed-files";
import { Renders } from "./renders";
import { Webhooks } from "./webhooks";
import { z } from "zod";
import { Members } from "./members";
import { Invites } from "./invites";
import { Transcriptions } from "./transcriptions";
import { Files, VideoFiles, ImageFiles as ImageFilesByType, CaptionFiles } from "./files";
import { ImageFiles } from "./image-files";
import { ProcessHtml } from "./process-html";
export type {
  ContentBlock,
  ResourceView,
  RowTypeOrgScoped as RowType,
  DetailRecordTypeOrgScoped as DetailRecordType,
} from "./types";
export { orgScoped as dataShape } from "./types";

export const resourceUrl = (resourceType: string, id: string) =>
  `/resource/${resourceType}/${id}`;

export const relatedResourceUrl = (
  resourceType: string,
  id: string,
  relatedType: string,
  relId: string,
) => `/resource/${resourceType}/${id}/${relatedType}/${relId}`;


export const ResourceType = z.enum([
  "unprocessed_files",
  "process_isobmff",
  "isobmff_files",
  "api_keys",
  "renders",
  "webhooks",
  "members",
  "invites",
  "transcriptions",
  "image_files",
  "files",
  "process_html",
  "videos",
  "images",
  "captions",
]);

export const ResourceModules = {
  unprocessed_files: UnprocessedFiles,
  process_isobmff: ProcessIsoBmff,
  isobmff_files: ISOBMFFFiles,
  api_keys: ApiKeys,
  renders: Renders,
  webhooks: Webhooks,
  members: Members,
  invites: Invites,
  transcriptions: Transcriptions,
  image_files: ImageFiles,
  files: Files,
  process_html: ProcessHtml,
  videos: VideoFiles,
  images: ImageFilesByType,
  captions: CaptionFiles,
} as const;
