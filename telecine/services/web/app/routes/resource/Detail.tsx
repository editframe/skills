import { XCircleIcon } from "@heroicons/react/24/outline";
import { serverQuery } from "@/graphql.server";
import { useSubscriptionForQuery } from "@/graphql.client";
import { ResourceModules } from "~/components/resources";
import { LinkWithSearch } from "~/components/LinkWithSearch";
import { InfoRow } from "~/components/InfoRow";
import { useNavigateOnEscape } from "~/ui/useNavigateOnEscape";

import type { Route } from "./+types/Detail";
import { requireSession } from "@/util/requireSession.server";
import { requireOrgId } from "@/util/requireOrgId";
import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";

export const loader = async ({
  params: { resourceType, id },
  request,
}: Route.LoaderArgs) => {
  const { session } = await requireSession(request);

  const orgId = requireOrgId(request);

  if (!(resourceType in ResourceModules)) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    orgId,
    resourceType: resourceType as keyof typeof ResourceModules,
    id,
    liveQuery: await serverQuery(
      session,
      ResourceModules[resourceType as keyof typeof ResourceModules].detail
        .query as ProgressiveQueryDescriptor<any, any>,
      {
        id,
        orgId,
      },
    ),
  };
};

interface ResourceDetailWrapperProps {
  liveQuery: any;
  resourceType: keyof typeof ResourceModules;
  orgId: string;
  id: string;
}

export const ResourceDetailWrapper = ({
  liveQuery,
  resourceType,
  orgId,
  id,
}: ResourceDetailWrapperProps) => {
  const subscription = useSubscriptionForQuery(
    liveQuery.token,
    ResourceModules[resourceType].detail.query as ProgressiveQueryDescriptor<
      any,
      any
    >,
    { id, orgId },
    liveQuery.result,
  );

  const records = subscription.data?.record;

  if (subscription.error) {
    return <div>Error: {subscription.error.message}</div>;
  }

  if (!records) {
    return <div>Loading...</div>;
  }
  const record = records[0];
  if (!record) {
    return <div>No record found</div>;
  }

  return (
    <div className="mx-auto p-4">
      {ResourceModules[resourceType].detail.fields.map((field) => (
        <InfoRow
          key={field.name}
          label={field.name}
          value={
            <field.content
              record={record}
              resourceType={resourceType}
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
};

export default function ResourceDetail({
  loaderData: { orgId, liveQuery, resourceType, id },
}: Route.ComponentProps) {
  useNavigateOnEscape(`/resource/${resourceType}`);

  // Otherwise render as overlay
  return (
    <div className="fixed right-0 top-0 h-full w-1/2 overflow-y-auto bg-white border-l-4 border-grey-500 shadow-lg shadow-gray-700 z-50">
      <div className="flex justify-between items-center p-2 border-b border-gray-300 sticky top-0 bg-white z-10">
        <LinkWithSearch
          preventScrollReset
          className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-800 underline decoration-gray-300 hover:decoration-gray-600"
          to={`/resource/${resourceType}`}
          title="Close"
        >
          <XCircleIcon
            aria-hidden="true"
            className="h-4 w-4 stroke-gray-500 stroke-1 fill-gray-300 hover:stroke-gray-800 hover:fill-gray-400"
            title="Close"
          />
          Close
        </LinkWithSearch>
      </div>

      <ResourceDetailWrapper
        liveQuery={liveQuery}
        resourceType={resourceType}
        orgId={orgId}
        id={id}
      />
    </div>
  );
}
