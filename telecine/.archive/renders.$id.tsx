import { LayerComposition } from "@/editor/model/LayerComposition";
import "@/editor/model/AudioLayer/AudioLayer";
import "@/editor/model/CaptionLayer/CaptionLayer";
// import "@/editor/model/HTMLLayer/HTMLLayer";
import "@/editor/model/ImageLayer/ImageLayer";
import "@/editor/model/TextLayer/TextLayer";
import "@/editor/model/TimeGroup/TimeGroup";
import "@/editor/model/VideoLayer/VideoLayer";
import { graphql } from "@/graphql";
import { queryAs } from "@/graphql.server";
import {
  Outlet,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";
import { fromSnapshot } from "mobx-keystone";
import { Features, featureGate } from "@/util/features.server";
import { requireSession } from "@/util/requireSession";
import { parseRequestSession } from "@/util/session.server";
import { TimeCode } from "@/editor/components/TimeCode";
import { MetaFunction } from "react-router";

export const loader = featureGate(
  Features.RENDER,
  requireSession(async (args) => {
    const session = await parseRequestSession(args.request);

    const result = await queryAs(
      session!,
      "user",
      graphql(`
        query GetVideoRender($id: uuid!) {
          video_renders_by_pk(id: $id) {
            id
            snapshot
          }
        }
      `),
      {
        id: args.params.id!,
      },
    );

    if (result.error) {
      throw new Response(null, { status: 500 });
    }

    const videoRender = result.data?.video_renders_by_pk;
    if (!videoRender) {
      throw new Response(null, { status: 404 });
    }

    return { videoRender };
  }),
);

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 404:
        return <h1>Render not found</h1>;
      default:
        return <h1>Server error</h1>;
    }
  }
  throw error;
}
export const meta: MetaFunction = () => {
  return [{ title: "Show Render | Editframe" }];
};
export default function ShowRender() {
  const { videoRender } = useLoaderData<typeof loader>();
  const composition = fromSnapshot(LayerComposition, videoRender.snapshot);
  const segmentDuration = 2000;
  const segmentCount = Math.floor(composition.durationMs / segmentDuration);
  const fps = 30;
  const frameDuration = 1000 / fps;
  const segments = Array.from({ length: segmentCount }).map((_, i) => {
    return {
      fromMs: i * segmentDuration,
      toMs: (i + 1) * segmentDuration - frameDuration,
    };
  });

  return (
    <>
      <h1>Show Render {videoRender.id}</h1>
      <div style={{ display: "flex" }}>
        <dl>
          <dt>Duration</dt>
          <dd>{<TimeCode ms={composition.durationMs} />}</dd>
          <dt>Segments</dt>
          <dd>
            {segments.map((segment, index) => {
              return (
                <div key={index}>
                  <a href={`/renders/${videoRender.id}/${index}`}>
                    <TimeCode subSecond ms={segment.fromMs} /> -{" "}
                    <TimeCode subSecond ms={segment.toMs} />
                  </a>
                </div>
              );
            })}
          </dd>
        </dl>
        <div style={{ padding: "2rem" }}>
          <Outlet />
        </div>
      </div>
    </>
  );
}
