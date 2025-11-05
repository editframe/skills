import { describe, test, expect } from "vitest";

import { client } from "TEST/@editframe/api/client";
import { createUnprocessedFile } from "@editframe/api";
import { uuidv4 } from "lib0/random.js";

describe("unprocessed_files.md5.$md5", () => {
  test("succeeds", async () => {
    const md5 = uuidv4();
    const unprocessedFile = await createUnprocessedFile(client, {
      md5,
      filename: "test.mp4",
      byte_size: 1000,
    });

    const response = await client.authenticatedFetch(
      `/api/v1/unprocessed_files/md5/${md5}`,
    );

    await expect(response.json()).resolves.toMatchObject(unprocessedFile);
  });

  test("returns 404 if the render does not exist", async () => {
    const response = await client.authenticatedFetch(
      `/api/v1/unprocessed_files/md5/${uuidv4()}`,
    );
    console.log(response);
    await expect(response.json()).rejects.toThrow("Not Found");
  });
});
