import { serverQuery } from "@/graphql.server";
import { Outlet, useLoaderData, useLocation } from "react-router";
import { extractServerTableSearchParams } from "~/ui/useTableSearchParams";
import { requireOrgId } from "@/util/requireOrgId";
import { identityContext } from "~/middleware/context";
import { SharedResourceIndexWrapper } from "~/components/resources/SharedResourceWrappers";
import { dataShape } from "~/components/resources";
import { ImageFiles } from "~/components/resources/files";
import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";

import type { Route } from "./+types/images";

const modules = { image_files: ImageFiles } as const;

export const loader = async ({ request, context, params }: Route.LoaderArgs) => {
  if ((params as any).resourceType !== "files") {
    throw new Response("Not Found", { status: 404 });
  }
  const session = context.get(identityContext);
  const searchParams = new URL(request.url).searchParams;
  const orgId = requireOrgId(request);
  const { limit, page } = extractServerTableSearchParams(searchParams);

  const whereClause = ImageFiles.index.buildWhereClause?.(searchParams);

  return {
    orgId,
    liveQuery: await serverQuery(
      session,
      ImageFiles.index.query as ProgressiveQueryDescriptor<any, any>,
      {
        limit,
        offset: page * limit,
        orgId,
        where_clause: whereClause,
      },
    ),
  };
};

export default function ImagesListing() {
  const { orgId, liveQuery } = useLoaderData<typeof loader>();
  const location = useLocation();

  return (
    <>
      <SharedResourceIndexWrapper
        key={location.pathname}
        liveQuery={liveQuery}
        resourceType="image_files"
        resourceModules={modules}
        dataShape={dataShape}
        orgId={orgId}
        buildRowURL={(record) => `/resource/files/images/${record.id}`}
      />
      <Outlet />
    </>
  );
}
