import { useSubscriptionForQuery } from "@/graphql.client";
import { serverQuery } from "@/graphql.server";
import {
  Outlet,
  useLoaderData,
  useLocation,
  useSearchParams,
} from "react-router";
import { PaginatedTable } from "~/components/Table";
import {
  extractServerTableSearchParams,
  useTableSearchParams,
} from "~/ui/useTableSearchParams";

import { ResourceModules, type ResourceType } from "~/components/resources";
import { useEffect, useMemo, useState, useCallback } from "react";
import { requireOrgId } from "@/util/requireOrgId";

import type { z } from "zod";
import type { Route } from "./+types/Listing";
import { requireSession } from "@/util/requireSession.server";
import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { session } = await requireSession(request);
  const searchParams = new URL(request.url).searchParams;
  const orgId = requireOrgId(request);
  const { limit, page } = extractServerTableSearchParams(searchParams);
  if (!(params.resourceType in ResourceModules)) {
    throw new Response("Not Found", { status: 404 });
  }

  const whereClause =
    ResourceModules[
      params.resourceType as keyof typeof ResourceModules
    ].index.buildWhereClause?.(searchParams);

  return {
    orgId: orgId,
    resourceType: params.resourceType as keyof typeof ResourceModules,
    liveQuery: await serverQuery(
      session,
      ResourceModules[params.resourceType as keyof typeof ResourceModules].index
        .query as ProgressiveQueryDescriptor<any, any>,
      {
        limit,
        offset: page * limit,
        orgId,
        where_clause: whereClause as any,
      },
    ),
  };
};

interface ResourceIndexWrapperProps {
  liveQuery: any;
  resourceType: z.infer<typeof ResourceType>;
  orgId: string;
}

export const ResourceIndexWrapper = ({
  liveQuery,
  resourceType,
  orgId,
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
      throw new Error(
        `No resource module found for resource type ${resourceType}`,
      );
    }
    return ResourceModules[resourceType].index.buildWhereClause?.(
      debouncedSearchParams,
    );
  }, [debouncedSearchParams, resourceType]);

  // Memoize subscription parameters
  const subscriptionParams = useMemo(
    () => ({
      limit,
      offset: page * limit,
      orgId,
      where_clause: whereClause as any,
    }),
    [limit, page, orgId, whereClause],
  );

  const subscription = useSubscriptionForQuery(
    liveQuery.token,
    ResourceModules[resourceType].index.query,
    subscriptionParams,
    liveQuery.result,
  );

  const org = subscription.data?.org;

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
      rows: org?.rows?.map(transformRow) as { id: string; record: unknown }[],
      buildRowURL: (record: { id: string }) =>
        `/resource/${resourceType}/${record.id}`,
      count: org?.page_info?.aggregate?.count ?? 0,
      emptyResultMessage: resourceType,
      columns: ResourceModules[resourceType].index.columns as unknown as Array<{
        name: string;
        content: React.ComponentType<{ id: string; record: unknown }>;
      }>,
    }),
    [org?.rows, org?.page_info?.aggregate?.count, resourceType, transformRow],
  );

  if (subscription.error) {
    console.error("Subscription error", subscription.error);
    return (
      <div>
        Error: {subscription.error.name}{" "}
        {subscription.error.graphQLErrors.map((e) => e.message).join(", ")}
      </div>
    );
  }

  if (!org || !org.rows || !org.page_info) {
    return <div>Loading...</div>;
  }

  const { TableHeader } = ResourceModules[resourceType].index;

  return (
    <>
      {TableHeader && <TableHeader orgId={orgId} />}
      <PaginatedTable {...tableProps} />
      <Outlet />
    </>
  );
};

export default function Listing() {
  const loaderData = useLoaderData<typeof loader>();
  const { orgId, liveQuery, resourceType } = loaderData;
  const location = useLocation();

  return (
    <ResourceIndexWrapper
      key={location.pathname}
      liveQuery={liveQuery}
      resourceType={resourceType}
      orgId={orgId}
    />
  );
}
