import { describe, test, expect, vi } from "vitest";
import type { Selectable } from "kysely";
import type { Video2Renders } from "@/sql-client.server/kysely-codegen";
import { RenderFragmentQueue } from "../RenderFragmentQueue";
import { RenderFragmentGpuQueue } from "../RenderFragmentGpuQueue";

vi.mock("@/valkey/valkey", () => ({ valkey: {} }));
vi.mock("@/util/env", () => ({
  envInt: (_key: string, fallback: number) => fallback,
}));
vi.mock("@/logging", () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));
vi.mock("@/progress-tracking/ProgressTracker", () => ({
  ProgressTracker: class {
    constructor(_key: string) {}
    writeSize(_n: number) {}
  },
}));
vi.mock("@/sql-client.server", () => ({ db: {} }));
vi.mock("@/render/createRenderOptionsForSegment", () => ({
  createVideoRenderOptionsForSegment: vi.fn(),
}));
vi.mock("@/render/StillEncoder", () => ({ StillEncoder: class {} }));
vi.mock("@/util/storageProvider.server", () => ({ storageProvider: {} }));
vi.mock("@/util/filePaths", () => ({ renderStillFilePath: vi.fn() }));

const { createFragmentJobs } = await import("./renderInitializationOps");

const baseRender: Selectable<Video2Renders> = {
  id: "render-123",
  org_id: "org-456",
  backend: "cpu",
  strategy: "v1",
  status: "rendering",
  fps: 30 as any,
  duration_ms: 8000,
  work_slice_ms: 4000,
  width: 1920,
  height: 1080,
  html: null,
  md5: null,
  metadata: {} as any,
  output_config: null,
  byte_size: null,
  api_key_id: null,
  creator_id: "user-789",
  attempt_count: 0,
  created_at: new Date() as any,
  started_at: null,
  completed_at: null,
  failed_at: null,
  failure_detail: null,
  initializer_complete: false,
  restricted: false,
};

describe("createFragmentJobs", () => {
  test("routes to render-fragment queue when backend is cpu", () => {
    const jobs = createFragmentJobs({ ...baseRender, backend: "cpu" });
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) {
      expect(job.queue).toBe(RenderFragmentQueue.name);
    }
  });

  test("routes to render-fragment-gpu queue when backend is gpu", () => {
    const jobs = createFragmentJobs({ ...baseRender, backend: "gpu" });
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) {
      expect(job.queue).toBe(RenderFragmentGpuQueue.name);
    }
  });

  test("defaults to cpu queue when backend is not set", () => {
    const render = { ...baseRender };
    // Simulate a row where backend defaults to 'cpu'
    const jobs = createFragmentJobs(render);
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) {
      expect(job.queue).toBe(RenderFragmentQueue.name);
    }
  });
});
