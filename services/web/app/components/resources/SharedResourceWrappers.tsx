import { useSubscriptionForQuery } from "@/graphql.client";
import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";
import { useSearchParams } from "react-router";
import { PaginatedTable } from "~/components/Table";
import { useTableSearchParams } from "~/ui/useTableSearchParams";
import { useCallback, useMemo } from "react";
import type { DataShape } from "./types";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { InfoRow } from "~/components/InfoRow";

interface SharedResourceIndexWrapperProps<
  ResourceModules extends Record<string, any>,
> {
  liveQuery: any;
  resourceType: keyof ResourceModules;
  resourceModules: ResourceModules;
  dataShape: DataShape;
  orgId?: string;
  buildRowURL: (record: { id: string }) => string;
}

export function SharedResourceIndexWrapper<
  ResourceModules extends Record<string, any>,
>({
  liveQuery,
  resourceType,
  resourceModules,
  dataShape,
  orgId,
  buildRowURL,
}: SharedResourceIndexWrapperProps<ResourceModules>) {
  const [searchParams] = useSearchParams();
  const { limit, page } = useTableSearchParams();

  const debouncedSearchParams = useDebouncedValue(searchParams, 300);

  const whereClause = useMemo(() => {
    if (!resourceModules[resourceType]) {
      throw new Error(
        `No resource module found for resource type ${String(resourceType)}`,
      );
    }
    return resourceModules[resourceType].index.buildWhereClause?.(
      debouncedSearchParams,
    );
  }, [debouncedSearchParams, resourceType, resourceModules]);

  const customVariables = useMemo(() => {
    if (!resourceModules[resourceType]) {
      throw new Error(
        `No resource module found for resource type ${String(resourceType)}`,
      );
    }
    return (
      resourceModules[resourceType].index.buildVariables?.(
        debouncedSearchParams,
      ) || {}
    );
  }, [debouncedSearchParams, resourceType, resourceModules]);

  const subscriptionParams = useMemo(
    () => ({
      limit,
      offset: page * limit,
      ...(orgId ? { orgId } : {}),
      where_clause: whereClause as any,
      ...customVariables,
    }),
    [limit, page, orgId, whereClause, customVariables],
  );

  const subscription = useSubscriptionForQuery(
    liveQuery.token,
    resourceModules[resourceType].index.query as ProgressiveQueryDescriptor<
      any,
      any
    >,
    subscriptionParams,
    liveQuery.result,
  );

  const rows = dataShape.getRows(subscription.data);
  const count = dataShape.getCount(subscription.data);

  const transformRow = useCallback(
    (row: any) => ({
      id: row.id,
      record: row,
    }),
    [],
  );

  const tableProps = useMemo(
    () => ({
      rows: rows?.map(transformRow) as { id: string; record: unknown }[],
      buildRowURL,
      count,
      emptyResultMessage: String(resourceType),
      columns: resourceModules[resourceType].index.columns as unknown as Array<{
        name: string;
        content: React.ComponentType<{ id: string; record: unknown }>;
      }>,
    }),
    [rows, count, resourceType, transformRow, buildRowURL, resourceModules],
  );

  if (subscription.error) {
    console.error("Subscription error", subscription.error);
    const messages =
      subscription.error.graphQLErrors?.map((e) => e.message).join(", ") ??
      subscription.error.message ??
      "Unknown error";
    return (
      <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-4 text-sm text-red-700 dark:text-red-300">
        <span className="font-medium">Error:</span> {subscription.error.name}{" "}
        {messages}
      </div>
    );
  }

  const { TableHeader } = resourceModules[resourceType].index;

  return (
    <div className="space-y-3 pt-3">
      {TableHeader && (
        <div>
          <TableHeader orgId={orgId} />
        </div>
      )}
      <div className="w-full">
        <PaginatedTable {...tableProps} />
      </div>
    </div>
  );
}

interface SharedResourceDetailWrapperProps<
  ResourceModules extends Record<string, any>,
> {
  liveQuery: any;
  resourceType: keyof ResourceModules;
  resourceModules: ResourceModules;
  dataShape: DataShape;
  id: string;
  orgId?: string;
  customVariables?: Record<string, any>;
}

export function SharedResourceDetailWrapper<
  ResourceModules extends Record<string, any>,
>({
  liveQuery,
  resourceType,
  resourceModules,
  dataShape,
  id,
  orgId,
  customVariables = {},
}: SharedResourceDetailWrapperProps<ResourceModules>) {
  const subscriptionParams = useMemo(
    () => ({
      id,
      ...(orgId ? { orgId } : {}),
      ...customVariables,
    }),
    [id, orgId, customVariables],
  );

  const subscription = useSubscriptionForQuery(
    liveQuery.token,
    resourceModules[resourceType].detail.query as ProgressiveQueryDescriptor<
      any,
      any
    >,
    subscriptionParams,
    liveQuery.result,
  );

  const record = dataShape.getRecord(subscription.data);

  if (subscription.error) {
    return (
      <div className="m-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-4 text-sm text-red-700 dark:text-red-300">
        <span className="font-medium">Error:</span> {subscription.error.message}
      </div>
    );
  }

  if (!record) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto p-4">
      {resourceModules[resourceType].detail.fields.map((field: any) => (
        <InfoRow
          key={field.name}
          label={field.name}
          value={
            <field.content
              record={record}
              resourceType={String(resourceType)}
              resourceId={id}
              id={id}
            />
          }
          vertical={field.vertical}
          noHighlight={field.noHighlight}
        />
      ))}
    </div>
  );
}
