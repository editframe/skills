import { serverQuery } from "@/graphql.server";
import { Outlet, useLocation, useRouteError, isRouteErrorResponse } from "react-router";
import { extractServerTableSearchParams } from "~/ui/useTableSearchParams";

import { ResourceModules, dataShape } from "~/components/resources/admin";

import type { Route } from "./+types/listing";
import { requireAdminSession } from "@/util/requireAdminSession";
import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";
import { SharedResourceIndexWrapper } from "~/components/resources/SharedResourceWrappers";

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

  const resourceModule =
    ResourceModules[params.resourceType as keyof typeof ResourceModules];

  const whereClause = resourceModule.index.buildWhereClause?.(searchParams);
  const customVariables =
    resourceModule.index.buildVariables?.(searchParams) || {};

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


export default function ResourceIndex({
  loaderData: { liveQuery, resourceType },
}: Route.ComponentProps) {
  const location = useLocation();

  return (
    <>
      <SharedResourceIndexWrapper
        key={location.pathname}
        liveQuery={liveQuery}
        resourceType={resourceType}
        resourceModules={ResourceModules}
        dataShape={dataShape}
        buildRowURL={(record) => `/admin/${resourceType}/${record.id}`}
      />
      <Outlet />
    </>
  );
}
