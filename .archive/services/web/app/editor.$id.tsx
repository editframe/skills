import { graphql } from "@/graphql";
import { queryAs } from "@/graphql.server";
import { isRouteErrorResponse, useParams, useRouteError } from "react-router";
import { ClientOnly } from "remix-utils/client-only";
import { EditorWrapper } from "~/EditorWrapper.client";
import { Features, featureGate } from "@/util/features.server";
import { requireSession } from "@/util/requireSession";
import { parseRequestSession } from "@/util/session.server";

export const loader = featureGate(
  Features.EDITOR,
  requireSession(async ({ request, params }) => {
    const sessionInfo = await parseRequestSession(request);

    const result = await queryAs(
      sessionInfo!,
      "org-reader",
      graphql(`
        query ($projectId: uuid!) {
          video_projects_by_pk(id: $projectId) {
            id
          }
        }
      `),
      { projectId: params.id! },
    );

    if (!result.data?.video_projects_by_pk) {
      throw new Response(null, { status: 404 });
    }

    return null;
  }),
);

export const ErrorBoundary = () => {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 404:
        return <div>Project not found</div>;
      default:
        return <div>Unknown error</div>;
    }
  }
  throw error;
};

export default function Project() {
  const params = useParams();
  return (
    <ClientOnly fallback={<div>Loading...</div>}>
      {() => <EditorWrapper id={params.id!} />}
    </ClientOnly>
  );
}
