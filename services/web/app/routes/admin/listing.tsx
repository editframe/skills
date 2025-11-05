import { useSubscriptionForQuery } from "@/graphql.client";
import { serverQuery } from "@/graphql.server";
import {
  Outlet,
  useLocation,
  useRouteError,
  useSearchParams,
  isRouteErrorResponse,
} from "react-router";
import { PaginatedTable } from "~/components/Table";
import {
  extractServerTableSearchParams,
  useTableSearchParams,
} from "~/ui/useTableSearchParams";

import { ResourceModules } from "~/components/resources/admin";
import { useEffect, useMemo, useState, useCallback } from "react";

import type { Route } from "./+types/listing";
import { requireAdminSession } from "@/util/requireAdminSession";
import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";

export const ErrorBoundary = () => {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return <div>{error.statusText}</div>;
  }
  if (error instanceof Error) {
    return <div>{error.message}</div>;
  }
  return <div>Unknown error</div>;
};

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const session = await requireAdminSession(request);
  const searchParams = new URL(request.url).searchParams;
  const { limit, page } = extractServerTableSearchParams(searchParams);

  if (!(params.resourceType in ResourceModules)) {
    throw new Response("Not Found", { status: 404 });
  }

  const resourceModule = ResourceModules[params.resourceType as keyof typeof ResourceModules];

  const whereClause = resourceModule.index.buildWhereClause?.(searchParams);
  const customVariables = resourceModule.index.buildVariables?.(searchParams) || {};

  return {
    resourceType: params.resourceType as keyof typeof ResourceModules,
    liveQuery: await serverQuery(
      session,
      resourceModule.index.query as ProgressiveQueryDescriptor<any, any>,
      {
        limit,
        offset: page * limit,
        where_clause: whereClause as any,
        ...customVariables,
      },
    ),
  };
};

interface ResourceIndexWrapperProps {
  liveQuery: any;
  resourceType: keyof typeof ResourceModules;
}

export const ResourceIndexWrapper = ({
  liveQuery,
  resourceType,
}: ResourceIndexWrapperProps) => {
  const [searchParams] = useSearchParams();
  const { limit, page } = useTableSearchParams();

  // Add state for debounced search params
  const [debouncedSearchParams, setDebouncedSearchParams] =
    useState(searchParams);

  // Debounce search params updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchParams(searchParams);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchParams]);

  // Use debounced search params for whereClause
  const whereClause = useMemo(() => {
    if (!ResourceModules[resourceType]) {
      throw new Error("No resource module found for resource type");
    }
    return ResourceModules[resourceType].index.buildWhereClause?.(
      debouncedSearchParams,
    );
  }, [debouncedSearchParams, resourceType]);

  // Use debounced search params for custom variables
  const customVariables = useMemo(() => {
    if (!ResourceModules[resourceType]) {
      throw new Error("No resource module found for resource type");
    }
    return ResourceModules[resourceType].index.buildVariables?.(
      debouncedSearchParams,
    ) || {};
  }, [debouncedSearchParams, resourceType]);

  // Memoize subscription parameters
  const subscriptionParams = useMemo(
    () => ({
      limit,
      offset: page * limit,
      where_clause: whereClause as any,
      ...customVariables,
    }),
    [limit, page, whereClause, customVariables],
  );

  const subscription = useSubscriptionForQuery(
    liveQuery.token,
    ResourceModules[resourceType].index.query as ProgressiveQueryDescriptor<
      any,
      any
    >,
    subscriptionParams,
    liveQuery.result,
  );

  const rows = subscription.data?.rows;

  // Memoize row transformation function
  const transformRow = useCallback(
    (row: any) => ({
      id: row.id,
      record: row,
    }),
    [],
  );

  // Memoize table props
  const tableProps = useMemo(
    () => ({
      rows: rows?.map(transformRow) as { id: string; record: unknown }[],
      buildRowURL: (record: { id: string }) =>
        `/admin/${resourceType}/${record.id}`,
      emptyResultMessage: resourceType,
      columns: ResourceModules[resourceType].index.columns as unknown as Array<{
        name: string;
        content: React.ComponentType<{ id: string; record: unknown }>;
      }>,
    }),
    [rows, resourceType, transformRow],
  );

  if (subscription.error) {
    return (
      <div>
        Error: {subscription.error.name}{" "}
        {subscription.error.graphQLErrors.map((e) => e.message).join(", ")}
      </div>
    );
  }

  const { TableHeader } = ResourceModules[resourceType].index;

  return (
    <>
      {TableHeader && <TableHeader />}
      <PaginatedTable {...tableProps} />
      <Outlet />
    </>
  );
};

export default function ResourceIndex({
  loaderData: { liveQuery, resourceType },
}: Route.ComponentProps) {
  const location = useLocation();

  return (
    <ResourceIndexWrapper
      key={location.pathname}
      liveQuery={liveQuery}
      resourceType={resourceType}
    />
  );
}
