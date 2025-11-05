import { describe, test, expect } from "vitest";

import { client } from "TEST/@editframe/api/client";
import { createRender } from "@editframe/api";
import { uuidv4 } from "lib0/random.js";

describe("renders.md5.$md5", () => {
  test("succeeds", async () => {
    const md5 = uuidv4();
    const render = await createRender(client, {
      md5,
      fps: 30,
      width: 100,
      height: 100,
      duration_ms: 1000,
      work_slice_ms: 1000,
      strategy: "v1",
    });

    const response = await client.authenticatedFetch(
      `/api/v1/renders/md5/${md5}`,
    );

    await expect(response.json()).resolves.toMatchObject(render);
  });

  test("returns 404 if the render does not exist", async () => {
    const response = await client.authenticatedFetch(
      `/api/v1/renders/md5/${uuidv4()}`,
    );
    await expect(response.json()).rejects.toThrow("Not Found");
  });
});
