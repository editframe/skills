import { describe, test, expect } from "vitest";
import { client } from "TEST/@editframe/api/client";
import { createRender, uploadRender } from "@editframe/api";
import { uuidv4 } from "lib0/random.js";
import { RenderWorkflow } from "@/queues/units-of-work/Render/Workflow";
import { webReadableFromBuffers } from "TEST/util/readableFromBuffers";

describe("renders.upload", () => {
  test("enqueues RenderInitializer job for tarfile upload without HTML", async () => {
    const md5 = uuidv4();
    const render = await createRender(client, {
      md5,
      fps: 30,
      width: 1920,
      height: 1080,
      duration_ms: 10_000,
      work_slice_ms: 4_000,
      strategy: "v1",
    });

    await uploadRender(
      client,
      render.id,
      webReadableFromBuffers(Buffer.from("test tarfile content")),
    );

    const jobs = await RenderWorkflow.getJobs(render.id, "queued");
    const renderInitializerJobs = jobs.filter(
      (job) => job.jobId === `${render.id}-initializer`,
    );

    expect(renderInitializerJobs).toHaveLength(1);
    const job = renderInitializerJobs[0]!;
    expect(job.payload).toMatchObject({
      id: render.id,
      md5: render.md5,
      html: null,
    });
  });

  test("does not enqueue RenderInitializer for renders with HTML field", async () => {
    const md5 = uuidv4();
    const render = await createRender(client, {
      md5,
      fps: 30,
      width: 1920,
      height: 1080,
      duration_ms: 10_000,
      work_slice_ms: 4_000,
      strategy: "v1",
      html: "<div>Test HTML</div>",
    });

    await uploadRender(
      client,
      render.id,
      webReadableFromBuffers(Buffer.from("test tarfile content")),
    );

    const jobs = await RenderWorkflow.getJobs(render.id, "queued");
    const renderInitializerJobs = jobs.filter(
      (job) => job.jobId === `${render.id}-initializer`,
    );

    expect(renderInitializerJobs).toHaveLength(0);
  });

  test("uploads tarfile successfully", async () => {
    const md5 = uuidv4();
    const render = await createRender(client, {
      md5,
      fps: 30,
      width: 1920,
      height: 1080,
      duration_ms: 10_000,
      work_slice_ms: 4_000,
      strategy: "v1",
    });

    const testContent = Buffer.from("test tarfile content");
    const result = await uploadRender(
      client,
      render.id,
      webReadableFromBuffers(testContent),
    );

    expect(result).toMatchObject({
      id: render.id,
      md5: render.md5,
    });
  });

  test("uploads tarfile successfully", async () => {
    const md5 = uuidv4();
    const render = await createRender(client, {
      md5,
      fps: 30,
      width: 1920,
      height: 1080,
      duration_ms: 10_000,
      work_slice_ms: 4_000,
      strategy: "v1",
    });

    const testContent = Buffer.from("test tarfile content");
    const result = await uploadRender(
      client,
      render.id,
      webReadableFromBuffers(testContent),
    );

    expect(result).toMatchObject({
      id: render.id,
      md5: render.md5,
    });
  });
});

