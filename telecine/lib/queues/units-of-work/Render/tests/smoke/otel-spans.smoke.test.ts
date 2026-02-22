import { describe, test, expect, beforeAll } from "vitest";
import { render } from "../utils/render";

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

async function clearBuffer(): Promise<void> {
  const res = await fetch(`${OTEL_RELAY}/api/buffer`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to clear otel buffer: ${res.status}`);
  }
}

describe("OTel Span Propagation", { timeout: 60000 }, () => {
  beforeAll(async () => {
    await clearBuffer();
  });

  test("SegmentEncoder and ElectronEngine spans are exported from Electron subprocess", async () => {
    await render(
      `
      <ef-timegroup class="w-[320px] h-[180px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-purple-500"></div>
      </ef-timegroup>
      `,
      { testName: "otel-spans-smoke" },
    );

    // Give the SimpleSpanProcessor time to export all spans
    await new Promise((r) => setTimeout(r, 500));

    const segmentEncoderSpans = await querySpans({
      namePrefix: "SegmentEncoder",
      limit: 20,
    });

    expect(
      segmentEncoderSpans.length,
      "SegmentEncoder spans must appear in otel-relay after a render",
    ).toBeGreaterThan(0);

    const renderFrameSpans = segmentEncoderSpans.filter(
      (s) => s.name === "SegmentEncoder.renderFrame",
    );
    expect(
      renderFrameSpans.length,
      "SegmentEncoder.renderFrame spans must appear",
    ).toBeGreaterThan(0);

    const electronEngineSpans = await querySpans({
      namePrefix: "ElectronEngine",
      limit: 20,
    });
    expect(
      electronEngineSpans.length,
      "ElectronEngine spans must appear in otel-relay after a render",
    ).toBeGreaterThan(0);

    // All Electron-side spans must come from the telecine-electron service
    for (const span of [...segmentEncoderSpans, ...electronEngineSpans]) {
      expect(span.serviceName).toBe("telecine-electron");
    }

    // Spans must be linked to each other via parentSpanId (trace coherence)
    const traceIds = new Set([
      ...segmentEncoderSpans.map((s) => s.traceId),
      ...electronEngineSpans.map((s) => s.traceId),
    ]);
    // All spans from this one render should share a common trace
    expect(traceIds.size).toBeLessThanOrEqual(2); // getRenderInfo + renderFragment each get their own context

    // SegmentEncoder.renderFrame spans must carry renderId attribute
    for (const span of renderFrameSpans) {
      expect(span.attributes["renderId"]).toBeDefined();
      expect(span.attributes["frameNumber"]).toBeDefined();
    }

  });

  test("SegmentEncoder.renderFrame spans have expected attributes", async () => {
    const spans = await querySpans({
      namePrefix: "SegmentEncoder.renderFrame",
      limit: 20,
    });

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
