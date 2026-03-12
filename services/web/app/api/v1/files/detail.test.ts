import { describe, test, expect } from "vitest";

import { client } from "TEST/@editframe/api/client";
import { createFile, getFileDetail } from "@editframe/api";

describe("files.detail", () => {
  test("returns file detail for a video file", async () => {
    const created = await createFile(client, {
      filename: "test.mp4",
      type: "video",
      byte_size: 1024,
      md5: "detail-test-md5",
    });

    const detail = await getFileDetail(client, created.id);
    expect(detail.id).toBe(created.id);
    expect(detail.filename).toBe("test.mp4");
    expect(detail.type).toBe("video");
    expect(detail.status).toBe("created");
  });

  test("returns file detail for an image file", async () => {
    const created = await createFile(client, {
      filename: "photo.jpg",
      type: "image",
      byte_size: 2048,
    });

    const detail = await getFileDetail(client, created.id);
    expect(detail.id).toBe(created.id);
    expect(detail.type).toBe("image");
  });

  test("throws 404 for non-existent file", async () => {
    await expect(
      getFileDetail(client, "00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrowError("File not found");
  });
});
