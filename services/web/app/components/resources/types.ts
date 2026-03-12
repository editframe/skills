import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";

export type ContentBlock<
  RecordType,
  Keys extends keyof RecordType = keyof RecordType,
> = React.ComponentType<{
  id: string;
  record: Pick<RecordType, Keys>;
  resourceType: string;
  resourceId: string;
}>;

export interface DataShape {
  getRows(data: any): any[];
  getCount(data: any): number | undefined;
  getRecord(data: any): any;
}

export const orgScoped: DataShape = {
  getRows: (data: any) => data?.org?.rows ?? [],
  getCount: (data: any) => data?.org?.page_info?.aggregate?.count,
  getRecord: (data: any) => data?.record?.[0],
};

export const global: DataShape = {
  getRows: (data: any) => data?.rows ?? [],
  getCount: (data: any) => data?.page_info?.aggregate?.count,
  getRecord: (data: any) => data?.record,
};

export type RowTypeGlobal<Q> =
  Q extends ProgressiveQueryDescriptor<infer Data, any>
    ? Data extends { rows: (infer R)[] }
      ? NonNullable<R>
      : never
    : never;

export type DetailRecordTypeOrgScoped<Q> =
  Q extends ProgressiveQueryDescriptor<infer Data, any>
    ? Data extends { record: (infer R)[] }
      ? NonNullable<R>
      : never
    : never;

export type DetailRecordTypeGlobal<Q> =
  Q extends ProgressiveQueryDescriptor<infer Data, any>
    ? Data extends { record: infer R }
      ? NonNullable<R>
      : never
    : never;

export interface ResourceView<
  IndexQuery extends ProgressiveQueryDescriptor<any, any>,
  DetailQuery extends ProgressiveQueryDescriptor<any, any>,
  RowType = any,
  DetailRecordType = any,
> {
  index: {
    query: IndexQuery;
    TableHeader?: ({ orgId }: { orgId?: string }) => React.ReactElement;
    buildWhereClause?: (searchParams: URLSearchParams) => object;
    buildVariables?: (searchParams: URLSearchParams) => object;
    columns: {
      name: string;
      content: ContentBlock<RowType, any>;
    }[];
  };

  detail: {
    query: DetailQuery;
    buildVariables?: (searchParams: URLSearchParams) => object;
    fields: {
      name: string;
      content: ContentBlock<DetailRecordType, any>;
      vertical?: boolean;
      noHighlight?: boolean;
    }[];
  };
}
