import { serverQuery } from "@/graphql.server";
import { Outlet, useLoaderData, useLocation } from "react-router";
import { extractServerTableSearchParams } from "~/ui/useTableSearchParams";

import { ResourceModules, dataShape } from "~/components/resources";
import { requireOrgId } from "@/util/requireOrgId";

import type { Route } from "./+types/Listing";
import { identityContext } from "~/middleware/context";
import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";
import { SharedResourceIndexWrapper } from "~/components/resources/SharedResourceWrappers";

export const loader = async ({ request, params, context }: Route.LoaderArgs) => {
  const session = context.get(identityContext);
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


export default function Listing() {
  const loaderData = useLoaderData<typeof loader>();
  const { orgId, liveQuery, resourceType } = loaderData;
  const location = useLocation();

  return (
    <>
      <SharedResourceIndexWrapper
        key={location.pathname}
        liveQuery={liveQuery}
        resourceType={resourceType}
        resourceModules={ResourceModules}
        dataShape={dataShape}
        orgId={orgId}
        buildRowURL={(record) => `/resource/${resourceType}/${record.id}`}
      />
      <Outlet />
    </>
  );
}
