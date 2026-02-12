import { describe, test, expect } from "vitest";

import { client } from "TEST/@editframe/api/client";
import { createFile, deleteFile, getFileDetail } from "@editframe/api";

describe("files.delete", () => {
  test("deletes a file", async () => {
    const created = await createFile(client, {
      filename: "to-delete.mp4",
      type: "video",
      byte_size: 1024,
    });

    const result = await deleteFile(client, created.id);
    expect(result.success).toBe(true);

    await expect(
      getFileDetail(client, created.id),
    ).rejects.toThrowError("File not found");
  });
});
