import { describe, test, expect } from "vitest";
import { db } from "@/sql-client.server";
import { makeTestAgent } from "TEST/util/test";

const OTEL_RELAY = "http://tracing:4319";

interface FlatSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  serviceName: string;
  attributes: Record<string, string>;
}

async function querySpans(params: Record<string, string | number>): Promise<FlatSpan[]> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const res = await fetch(`${OTEL_RELAY}/api/spans?${qs}`);
  if (!res.ok) throw new Error(`otel-relay responded ${res.status}`);
  const body = await res.json();
  return body ?? [];
}

async function waitForSpans(
  params: Record<string, string | number>,
  predicate: (spans: FlatSpan[]) => boolean,
  timeoutMs = 15000,
): Promise<FlatSpan[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const spans = await querySpans(params);
    if (predicate(spans)) return spans;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`waitForSpans timed out after ${timeoutMs}ms`);
}

async function waitForRender(renderId: string, timeoutMs = 60000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await db
      .selectFrom("video2.renders")
      .where("id", "=", renderId)
      .select("status")
      .executeTakeFirstOrThrow();
    if (row.status === "complete" || row.status === "failed") return row.status;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Render ${renderId} did not complete within ${timeoutMs}ms`);
}

describe("OTel Span Propagation", { timeout: 90000 }, () => {
  test("SegmentEncoder and ElectronEngine spans are exported from Electron subprocess", async () => {
    const agent = await makeTestAgent("otel-spans-smoke@example.org");

    const render = await db
      .insertInto("video2.renders")
      .values({
        org_id: agent.org.id,
        creator_id: agent.user.user_id,
        api_key_id: null,
        html: `<ef-timegroup class="w-[320px] h-[180px]" mode="fixed" duration="100ms">
  <div class="w-full h-full bg-purple-500"></div>
</ef-timegroup>`,
        status: "created",
        strategy: "v1",
        fps: 30,
        output_config: { container: "mp4", video: { codec: "h264" }, audio: { codec: "aac" } },
        metadata: {},
        work_slice_ms: 4000,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const renderId = render.id;
    const finalStatus = await waitForRender(renderId);
    expect(finalStatus, `render ${renderId} must complete`).toBe("complete");

    const allSegmentEncoderSpans = await waitForSpans(
      { "attr.renderId": renderId, namePrefix: "SegmentEncoder", limit: 20 },
      (spans) => spans.some((s) => s.serviceName === "telecine-electron"),
    );
    const segmentEncoderSpans = allSegmentEncoderSpans.filter(
      (s) => s.serviceName === "telecine-electron",
    );

    expect(
      segmentEncoderSpans.length,
      "SegmentEncoder spans from telecine-electron must appear in otel-relay after render",
    ).toBeGreaterThan(0);

    const renderFrameSpans = segmentEncoderSpans.filter(
      (s) => s.name === "SegmentEncoder.renderFrame",
    );
    expect(renderFrameSpans.length, "SegmentEncoder.renderFrame spans must appear").toBeGreaterThan(0);

    const renderTraceId = renderFrameSpans[0]!.traceId;
    const electronEngineSpans = await querySpans({
      namePrefix: "ElectronEngine",
      traceId: renderTraceId,
      limit: 20,
    });
    expect(
      electronEngineSpans.length,
      "ElectronEngine spans must appear in the same trace as SegmentEncoder spans",
    ).toBeGreaterThan(0);

    for (const span of electronEngineSpans) {
      expect(span.serviceName).toBe("telecine-electron");
    }

    const frameTraceIds = new Set(renderFrameSpans.map((s) => s.traceId));
    expect(frameTraceIds.size).toBe(1);
  });

  test("SegmentEncoder.renderFrame spans have expected attributes", async () => {
    const agent = await makeTestAgent("otel-spans-smoke-attrs@example.org");

    const render = await db
      .insertInto("video2.renders")
      .values({
        org_id: agent.org.id,
        creator_id: agent.user.user_id,
        api_key_id: null,
        html: `<ef-timegroup class="w-[320px] h-[180px]" mode="fixed" duration="100ms">
  <div class="w-full h-full bg-blue-500"></div>
</ef-timegroup>`,
        status: "created",
        strategy: "v1",
        fps: 30,
        output_config: { container: "mp4", video: { codec: "h264" }, audio: { codec: "aac" } },
        metadata: {},
        work_slice_ms: 4000,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const renderId = render.id;
    const finalStatus = await waitForRender(renderId);
    expect(finalStatus, `render ${renderId} must complete`).toBe("complete");

    const spans = await waitForSpans(
      { "attr.renderId": renderId, namePrefix: "SegmentEncoder.renderFrame", limit: 20 },
      (s) => s.length > 0,
    );

    expect(spans.length).toBeGreaterThan(0);

    const span = spans[0]!;
    expect(span.attributes["frameNumber"]).toBeDefined();
    expect(span.attributes["totalFrameCount"]).toBeDefined();
    expect(span.attributes["width"]).toBeDefined();
    expect(span.attributes["height"]).toBeDefined();
    expect(span.attributes["framerate"]).toBeDefined();
    expect(span.attributes["imageBufferBytes"]).toBeDefined();
    expect(Number(span.attributes["imageBufferBytes"])).toBeGreaterThan(0);
  });
});
