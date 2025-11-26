import { XCircle } from "@phosphor-icons/react";
import { serverQuery } from "@/graphql.server";
import { useSubscriptionForQuery } from "@/graphql.client";
import { ResourceModules } from "~/components/resources";
import { LinkWithSearch } from "~/components/LinkWithSearch";
import { InfoRow } from "~/components/InfoRow";
import { useNavigateOnEscape } from "~/ui/useNavigateOnEscape";
import clsx from "clsx";

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
    <div
      className={clsx(
        "fixed right-0 top-0 h-full w-full sm:w-1/2 overflow-y-auto shadow-lg z-50 transition-colors",
        "bg-white dark:bg-slate-900",
        "border-l-4 border-slate-300 dark:border-slate-700",
        "shadow-slate-700/50 dark:shadow-slate-900/50",
      )}
    >
      <div
        className={clsx(
          "flex justify-between items-center p-2 border-b sticky top-0 z-10 transition-colors",
          "bg-white dark:bg-slate-900",
          "border-slate-300 dark:border-slate-700",
        )}
      >
        <LinkWithSearch
          preventScrollReset
          className={clsx(
            "flex items-center gap-2 text-xs font-medium underline transition-colors",
            "text-slate-600 dark:text-slate-400",
            "hover:text-slate-800 dark:hover:text-slate-200",
            "decoration-slate-300 dark:decoration-slate-600",
            "hover:decoration-slate-600 dark:hover:decoration-slate-400",
          )}
          to={`/resource/${resourceType}`}
          title="Close"
        >
          <XCircle
            aria-hidden="true"
            className={clsx(
              "h-4 w-4 stroke-1 transition-colors",
              "stroke-slate-500 dark:stroke-slate-400 fill-slate-300 dark:fill-slate-600",
              "hover:stroke-slate-800 dark:hover:stroke-slate-200 hover:fill-slate-400 dark:hover:fill-slate-500",
            )}
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
