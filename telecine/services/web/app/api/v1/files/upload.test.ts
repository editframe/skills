import { describe, test, expect } from "vitest";

import { client } from "TEST/@editframe/api/client";
import { createFile } from "@editframe/api";

describe("files.upload", () => {
  test("returns 202 for file awaiting upload", async () => {
    const created = await createFile(client, {
      filename: "test.mp4",
      type: "video",
      byte_size: 1024,
    });

    const response = await client.authenticatedFetch(
      `/api/v1/files/${created.id}/upload`,
    );

    expect(response.status).toBe(202);
  });

  test("returns 404 for non-existent file", async () => {
    const response = await client.authenticatedFetch(
      `/api/v1/files/00000000-0000-0000-0000-000000000000/upload`,
    );

    expect(response.status).toBe(404);
  });
});
