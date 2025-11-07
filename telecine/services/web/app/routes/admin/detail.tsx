import { XCircle } from "@phosphor-icons/react";
import { isRouteErrorResponse, useParams, useRouteError } from "react-router";
import { serverQuery } from "@/graphql.server";
import { useSubscriptionForQuery } from "@/graphql.client";
import { ResourceModules } from "~/components/resources/admin";
import { LinkWithSearch } from "~/components/LinkWithSearch";
import { InfoRow } from "~/components/InfoRow";
import { useNavigateOnEscape } from "~/ui/useNavigateOnEscape";
import clsx from "clsx";

import type { Route } from "./+types/detail";
import { requireAdminSession } from "@/util/requireAdminSession";
import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";

export const ErrorBoundary = () => {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <PanelOverlay>
        <div>{error.statusText}</div>
      </PanelOverlay>
    );
  }
  if (error instanceof Error) {
    return (
      <PanelOverlay>
        <div>{error.message}</div>
      </PanelOverlay>
    );
  }

  return (
    <PanelOverlay>
      <div>Unknown Error</div>
    </PanelOverlay>
  );
};

export const loader = async ({
  request,
  params: { resourceType, id },
}: Route.LoaderArgs) => {
  const session = await requireAdminSession(request);
  const searchParams = new URL(request.url).searchParams;

  if (!(resourceType in ResourceModules)) {
    throw new Response("Not Found", { status: 404 });
  }

  const resourceModule = ResourceModules[resourceType as keyof typeof ResourceModules];
  const customVariables = resourceModule.detail.buildVariables?.(searchParams) || {};

  return {
    resourceType: resourceType as keyof typeof ResourceModules,
    id,
    liveQuery: await serverQuery(
      session,
      resourceModule.detail.query as ProgressiveQueryDescriptor<any, any>,
      {
        id,
        ...customVariables,
      },
    ),
  };
};

interface ResourceDetailWrapperProps {
  liveQuery: any;
  resourceType: keyof typeof ResourceModules;
  id: string;
}

export const ResourceDetailWrapper = ({
  liveQuery,
  resourceType,
  id,
}: ResourceDetailWrapperProps) => {
  const searchParams = new URLSearchParams(window.location.search);
  const customVariables = ResourceModules[resourceType].detail.buildVariables?.(searchParams) || {};

  const subscription = useSubscriptionForQuery(
    liveQuery.token,
    ResourceModules[resourceType].detail.query as ProgressiveQueryDescriptor<
      any,
      any
    >,
    {
      id,
      ...customVariables,
    },
    liveQuery.result,
  );

  const record = subscription.data?.record;

  if (subscription.error) {
    return <div>Error: {subscription.error.message}</div>;
  }

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

const PanelOverlay = ({ children }: { children: React.ReactNode }) => {
  const { resourceType } = useParams();

  return (
    <div className={clsx(
      "fixed right-0 top-0 h-full w-1/2 overflow-y-auto border-l-4 shadow-lg z-50 transition-colors",
      "bg-white dark:bg-slate-800",
      "border-slate-500 dark:border-slate-600",
      "shadow-slate-700 dark:shadow-slate-900"
    )}>
      <div className={clsx(
        "flex justify-between items-center p-2 border-b sticky top-0 z-10 transition-colors",
        "bg-white dark:bg-slate-800",
        "border-slate-300 dark:border-slate-700"
      )}>
        <LinkWithSearch
          preventScrollReset
          className={clsx(
            "flex items-center gap-2 text-xs font-medium underline transition-colors",
            "text-slate-600 dark:text-slate-400",
            "hover:text-slate-800 dark:hover:text-slate-200",
            "decoration-slate-300 dark:decoration-slate-600",
            "hover:decoration-slate-600 dark:hover:decoration-slate-400"
          )}
          to={`/admin/${resourceType}`}
          title="Close"
        >
          <XCircle
            aria-hidden="true"
            className={clsx(
              "h-4 w-4 stroke-1 transition-colors",
              "stroke-slate-500 dark:stroke-slate-400 fill-slate-300 dark:fill-slate-600",
              "hover:stroke-slate-800 dark:hover:stroke-slate-200 hover:fill-slate-400 dark:hover:fill-slate-500"
            )}
            title="Close"
          />
          Close
        </LinkWithSearch>
      </div>
      {children}
    </div>
  );
};

export default function ResourceDetail({
  loaderData: { liveQuery, resourceType, id },
}: Route.ComponentProps) {
  useNavigateOnEscape(`/admin/${resourceType}`);

  // Otherwise render as overlay
  return (
    <PanelOverlay>
      <ResourceDetailWrapper
        liveQuery={liveQuery}
        resourceType={resourceType}
        id={id}
      />
    </PanelOverlay>
  );
}
