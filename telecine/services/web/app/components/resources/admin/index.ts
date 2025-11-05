// import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";
// import { ApiKeys } from "./api-keys";
// import { ISOBMFFFiles } from "./isobmff-files";
// import { ProcessIsoBmff } from "./process-isobmff";
// import { UnprocessedFiles } from "./unprocessed-files";
// import { Renders } from "./renders";
// import { Webhooks } from "./webhooks";
// import { Members } from "./members";
// import { Invites } from "./invites";
// import { Transcriptions } from "./transcriptions";
import { z } from "zod";
import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";
import { Users } from "./users";
import { Orgs } from "./orgs";
import { ImageFiles } from "./image-files";
import { Invites } from "./invites";
import { ApiKeys } from "./api-keys";
import { Webhooks } from "./webhooks";

export const adminResourceUrl = (resourceType: string, id: string) =>
  `/resource/${resourceType}/${id}`;

export const ResourceType = z.enum(["users", "orgs", "image_files", "invites"]);

export const ResourceModules = {
  users: Users,
  orgs: Orgs,
  image_files: ImageFiles,
  invites: Invites,
  // isobmff_files: ISOBMFFFiles,
  // unprocessed_files: UnprocessedFiles,
  // renders: Renders,
  // transcriptions: Transcriptions,
  // process_isobmff: ProcessIsoBmff,
  webhooks: Webhooks,
  api_keys: ApiKeys,
} as const;

export type ContentBlock<
  RecordType,
  Keys extends keyof RecordType = keyof RecordType,
> = React.ComponentType<{
  id: string;
  record: Pick<RecordType, Keys>;
  resourceType: string;
  resourceId: string;
}>;

export type RowType<Q> = Q extends ProgressiveQueryDescriptor<infer Data, any>
  ? Data extends { rows: (infer R)[] }
  ? NonNullable<R>
  : never
  : never;

export type DetailRecordType<Q> = Q extends ProgressiveQueryDescriptor<
  infer Data,
  any
>
  ? Data extends { record: (infer R) }
  ? NonNullable<R>
  : never
  : never;

export interface ResourceView<
  IndexQuery extends ProgressiveQueryDescriptor<any, any>,
  DetailQuery extends ProgressiveQueryDescriptor<any, any>,
> {
  index: {
    query: IndexQuery;
    TableHeader?: ({ orgId }: { orgId?: string }) => React.ReactElement;
    buildWhereClause?: (searchParams: URLSearchParams) => object;
    buildVariables?: (searchParams: URLSearchParams) => object;
    columns: {
      name: string;
      content: ContentBlock<RowType<IndexQuery>, any>;
    }[];
  };

  detail: {
    query: DetailQuery;
    buildVariables?: (searchParams: URLSearchParams) => object;
    fields: {
      name: string;
      content: ContentBlock<DetailRecordType<DetailQuery>, any>;
      vertical?: boolean;
      noHighlight?: boolean;
    }[];
  };
}
