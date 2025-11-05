import { requireQueryAs } from "@/graphql.server/userClient";
import { isobmffIndexFilePath } from "@/util/filePaths";
import { appFunction } from "@/util/appFunction.server";
import { z } from "zod";
import { readIntoBuffer } from "@/util/readIntoBuffer";
import { storageProvider } from "@/util/storageProvider.server";
import type { TrackFragmentIndex } from "@editframe/assets";
import { graphql } from "@/graphql";

// Add params schema
const paramsSchema = z.object({
  id: z.string().uuid(),
});

export const loader = appFunction(
  {
    requireSession: true,
    params: paramsSchema,
  },
  async ({ params, session }) => {
    const file = await requireQueryAs(
      session,
      "org-reader",
      graphql(`
      query GetIsobmffFile($id: uuid!) {
        result: video2_isobmff_files_by_pk(id: $id) {
          id
          org_id
        }
      }
    `),
      { id: params.id },
    );

    const indexBuffer = await readIntoBuffer(
      await storageProvider.createReadStream(
        isobmffIndexFilePath({
          org_id: file.org_id,
          id: file.id,
        }),
      ),
    );

    const index: Record<number, TrackFragmentIndex> = JSON.parse(
      indexBuffer.toString(),
    );

    // Generate MPD XML
    const mpd = generateMPD(file, index);

    return new Response(mpd, {
      headers: {
        "Content-Type": "application/dash+xml",
      },
    });
  },
);

interface TrackFragment {
  track: number;
  type: "video" | "audio";
  width?: number;
  height?: number;
  channel_count?: number;
  sample_rate?: number;
  sample_size?: number;
  timescale: number;
  sample_count: number;
  codec: string;
  duration: number;
  initSegment: { offset: number; size: number };
  segments: Array<{
    cts: number;
    dts: number;
    duration: number;
    offset: number;
    size: number;
  }>;
}

function generateMPD(file: any, index: Record<number, TrackFragment>) {
  const duration = Math.max(
    ...Object.values(index).map((t) => t.duration / t.timescale),
  );

  return `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" 
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd"
     type="static"
     mediaPresentationDuration="PT${duration.toFixed(3)}S"
     minBufferTime="PT1.5S"
     profiles="urn:mpeg:dash:profile:isoff-on-demand:2011">
  <Period id="1" start="PT0S">
    ${Object.values(index)
      .map((track) => generateAdaptationSet(file, track))
      .join("\n")}
  </Period>
</MPD>`;
}

function generateAdaptationSet(file: any, track: TrackFragment) {
  const totalBytes = track.segments.reduce(
    (sum, segment) => sum + segment.size,
    0,
  );
  const durationSeconds = track.duration / track.timescale;
  const bandwidth = Math.ceil((totalBytes * 8) / durationSeconds);
  const baseUrl = `/video2/isobmff_files/${file.id}/tracks`;

  const segmentList = `
      <SegmentList timescale="${track.timescale}">
        <Initialization sourceURL="${baseUrl}/${track.track}.mp4" range="${track.initSegment.offset}-${track.initSegment.offset + track.initSegment.size - 1}"/>
        <SegmentTimeline>
          ${track.segments
            .map((segment) => {
              return `<S t="${segment.cts}" d="${segment.duration}"/>`;
            })
            .join("\n          ")}
        </SegmentTimeline>
        ${track.segments
          .map((segment) => {
            const start = segment.offset;
            const end = segment.offset + segment.size - 1;
            return `<SegmentURL media="${baseUrl}/${track.track}.mp4" mediaRange="${start}-${end}"/>`;
          })
          .join("\n        ")}
      </SegmentList>`;

  const representation = `
      <Representation 
        id="${track.track}"
        mimeType="${track.type === "video" ? "video/mp4" : "audio/mp4"}"
        codecs="${track.codec}"
        bandwidth="${bandwidth}"
        ${
          track.type === "video"
            ? `width="${track.width}" height="${track.height}"`
            : `audioSamplingRate="${track.sample_rate}"`
        }>
        ${segmentList}
      </Representation>`;

  if (track.type === "video") {
    return `
    <AdaptationSet 
      contentType="video"
      segmentAlignment="true"
      bitstreamSwitching="true">
      ${representation}
    </AdaptationSet>`;
  }
  return `
    <AdaptationSet 
      contentType="audio"
      segmentAlignment="true"
      bitstreamSwitching="true">
      ${representation}
    </AdaptationSet>`;
}
