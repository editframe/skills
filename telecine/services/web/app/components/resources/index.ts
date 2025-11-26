import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";
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
import { ImageFiles } from "./image-files";
import { ProcessHtml } from "./process-html";
import type { ContentBlock } from "./blocks";

export const resourceUrl = (resourceType: string, id: string) =>
  `/resource/${resourceType}/${id}`;

export const relatedResourceUrl = (
  resourceType: string,
  id: string,
  relatedType: string,
  relId: string,
) => `/resource/${resourceType}/${id}/${relatedType}/${relId}`;

export type RowType<Q> =
  Q extends ProgressiveQueryDescriptor<infer Data, any>
    ? Data extends { org: { rows: (infer R)[] } | null }
      ? NonNullable<R>
      : never
    : never;

export type DetailRecordType<Q> =
  Q extends ProgressiveQueryDescriptor<infer Data, any>
    ? Data extends { record: (infer R)[] }
      ? NonNullable<R>
      : never
    : never;

export interface ResourceView<
  IndexQuery extends ProgressiveQueryDescriptor<any, any>,
  DetailQuery extends ProgressiveQueryDescriptor<any, any>,
> {
  index: {
    query: IndexQuery;
    TableHeader?: ({ orgId }: { orgId: string }) => React.ReactElement;
    buildWhereClause?: (searchParams: URLSearchParams) => object;
    columns: {
      name: string;
      content: ContentBlock<RowType<IndexQuery>, any>;
    }[];
  };

  detail: {
    query: DetailQuery;
    fields: {
      name: string;
      content: ContentBlock<DetailRecordType<DetailQuery>, any>;
      vertical?: boolean;
      noHighlight?: boolean;
    }[];
  };
}

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
  "process_html",
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
  process_html: ProcessHtml,
} as const;
