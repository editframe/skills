import { graphql } from "@/graphql";
import { Features, featureGate } from "@/util/features.server";
import { Link, useLoaderData } from "react-router";
import { progressiveQuery, useSubscriptionForQuery } from "@/graphql.client";
import { requireSession } from "@/util/requireSession";
import { serverQuery } from "@/graphql.server";
import { LoaderFunctionArgs } from "react-router";

const AllRenders = progressiveQuery(
  "user",
  graphql(`
    query GetRenders {
      video_renders {
        id
      }
    }
  `),
);

export const loader = featureGate(
  Features.RENDER,
  requireSession(async (args: LoaderFunctionArgs) => {
    return serverQuery(args, AllRenders, {});
  }),
);

export default function Renders() {
  const data = useLoaderData<typeof loader>();

  const result = useSubscriptionForQuery(
    data.token,
    AllRenders,
    {},
    data.result, // used as initial data for hydration
  );

  if (result.error || !result.data) {
    throw result.error;
  }
  const { video_renders } = result.data;

  return (
    <div>
      <h1>Renders</h1>
      {video_renders.length === 0 && <p>No renders yet.</p>}
      <Link to="/renders/new">New Render</Link>
      <ul>
        {video_renders.map((render: any) => {
          return (
            <li key={render.id}>
              <Link to={`/renders/${render.id}`}>{render.id}</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
