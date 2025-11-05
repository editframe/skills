import { createRender, uploadRender } from "@editframe/api";
import { v4 } from "uuid";

import { client, org } from "./client";
import { describe, expect, test } from "vitest";
import { webReadableFromBuffers } from "tests/util/readableFromBuffers";
import { renderFilePath } from "@/util/filePaths";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

describe("createRender", () => {
  test("succeeds", async () => {
    const md5 = v4();
    await expect(
      createRender(client, {
        md5,
        fps: 30,
        width: 1920,
        height: 1080,
        duration_ms: 10_000,
        work_slice_ms: 4_000,
        strategy: "v1",
      }),
    ).resolves.toMatchObject({});
  });

  test("Yields a new record if created with the same md5", async () => {
    const md5 = v4();
    const render1 = await createRender(client, {
      md5,
      fps: 30,
      width: 1920,
      height: 1080,
      duration_ms: 10_000,
      work_slice_ms: 4_000,
      strategy: "v1",
    });

    const render2 = await createRender(client, {
      md5,
      fps: 30,
      width: 1920,
      height: 1080,
      duration_ms: 10_000,
      work_slice_ms: 4_000,
      strategy: "v1",
    });

    expect(render1.id).not.toEqual(render2.id);
  });
});

describe("uploadRender", () => {
  test("succeeds", async () => {
    const md5 = v4();
    const render = await createRender(client, {
      md5,
      fps: 30,
      width: 1920,
      height: 1080,
      duration_ms: 10_000,
      work_slice_ms: 4_000,
      strategy: "v1",
    });

    await expect(
      uploadRender(
        client,
        render.id,
        webReadableFromBuffers(Buffer.from("test")),
      ),
    ).resolves.toMatchObject({});

    const renderPath = join(
      "/app",
      "data",
      renderFilePath({ org_id: org.id, id: render.id }),
    );
    await expect(readFile(renderPath)).resolves.toEqual(Buffer.from("test"));
  });
});
