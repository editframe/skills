import { describe, test, expect } from "vitest";

import { client } from "TEST/@editframe/api/client";
import { createISOBMFFFile } from "@editframe/api";
import { uuidv4 } from "lib0/random.js";

describe("isobmff_files.md5.$md5", () => {
  test("succeeds", async () => {
    const md5 = uuidv4();
    const testFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.mp4",
    });

    const response = await client.authenticatedFetch(
      `/api/v1/isobmff_files/md5/${md5}`,
    );

    await expect(response.json()).resolves.toMatchObject(testFile);
  });

  test("returns 404 if the isobmff file does not exist", async () => {
    const response = await client.authenticatedFetch(
      `/api/v1/isobmff_files/md5/${uuidv4()}`,
    );
    await expect(response.json()).rejects.toThrow("Not Found");
  });
});
