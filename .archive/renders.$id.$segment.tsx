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
import { fromSnapshot } from "mobx-keystone";
import { Features, featureGate } from "@/util/features.server";
import { requireSession } from "@/util/requireSession";
import { parseRequestSession } from "@/util/session.server";
import debug from "debug";
import { useLoaderData } from "react-router";

const log = debug("ef:renderd");

export const loader = featureGate(
  Features.RENDER,
  requireSession(async (args) => {
    log("start");

    const session = await parseRequestSession(args.request);
    const result = await queryAs(
      session!,
      "user",
      graphql(`
        query ($id: uuid!) {
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

    const composition = fromSnapshot(LayerComposition, videoRender.snapshot);
    composition.durationMs;
    const segmentDurationMs = 2000;

    const segmentIndex = Number(args.params.segment);

    const maxSegmentIndex = Math.floor(
      composition.durationMs / segmentDurationMs,
    );

    if (
      isNaN(segmentIndex) ||
      segmentIndex < 0 ||
      segmentIndex >= maxSegmentIndex
    ) {
      throw new Response(null, { status: 404 });
    }

    return {
      videoSrc: `/_/renders/${videoRender.id}/segment/${segmentIndex}.mp4`,
    };
  }),
);

export default function RenderSegment() {
  const { videoSrc } = useLoaderData<typeof loader>();
  return (
    <>
      <video controls autoPlay src={videoSrc} width="400" />
    </>
  );
}
