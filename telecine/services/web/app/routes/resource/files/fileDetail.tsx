import { XCircle } from "@phosphor-icons/react";
import { serverQuery } from "@/graphql.server";
import { dataShape } from "~/components/resources";
import { LinkWithSearch } from "~/components/LinkWithSearch";
import { useNavigateOnEscape } from "~/ui/useNavigateOnEscape";
import clsx from "clsx";
import { useLocation } from "react-router";

import type { Route } from "./+types/fileDetail";
import { identityContext } from "~/middleware/context";
import { requireOrgId } from "@/util/requireOrgId";
import type { ProgressiveQueryDescriptor } from "@/graphql.client/progressiveQuery";
import { SharedResourceDetailWrapper } from "~/components/resources/SharedResourceWrappers";
import { DetailQuery, Files } from "~/components/resources/files";

const modules = { files: Files } as const;

export const loader = async ({
  params: { id },
  request,
  context,
}: Route.LoaderArgs) => {
  const session = context.get(identityContext);
  const orgId = requireOrgId(request);

  return {
    orgId,
    id,
    liveQuery: await serverQuery(
      session,
      DetailQuery as ProgressiveQueryDescriptor<any, any>,
      { id, orgId },
    ),
  };
};

export default function FileDetail({
  loaderData: { orgId, liveQuery, id },
}: Route.ComponentProps) {
  const location = useLocation();
  const parentPath = location.pathname.split("/").slice(0, -1).join("/");

  useNavigateOnEscape(parentPath);

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
          to={parentPath}
          title="Close"
        >
          <XCircle
            aria-hidden="true"
            className={clsx(
              "h-4 w-4 stroke-1 transition-colors",
              "stroke-slate-500 dark:stroke-slate-400 fill-slate-300 dark:fill-slate-600",
              "hover:stroke-slate-800 dark:hover:stroke-slate-200 hover:fill-slate-400 dark:hover:fill-slate-500",
            )}
          />
          Close
        </LinkWithSearch>
      </div>

      <SharedResourceDetailWrapper
        liveQuery={liveQuery}
        resourceType="files"
        resourceModules={modules}
        dataShape={dataShape}
        orgId={orgId}
        id={id}
      />
    </div>
  );
}
