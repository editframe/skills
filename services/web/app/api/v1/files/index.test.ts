import { describe, test, expect } from "vitest";

import { client } from "TEST/@editframe/api/client";
import { createFile } from "@editframe/api";

describe("files.index", () => {
  test("creates a video file", async () => {
    const result = await createFile(client, {
      filename: "test.mp4",
      type: "video",
      byte_size: 1024,
      md5: "abc123",
      mime_type: "video/mp4",
    });

    expect(result.id).toBeDefined();
    expect(result.filename).toBe("test.mp4");
    expect(result.type).toBe("video");
    expect(result.status).toBe("created");
    expect(result.byte_size).toBe(1024);
    expect(result.md5).toBe("abc123");
    expect(result.next_byte).toBe(0);
  });

  test("creates an image file", async () => {
    const result = await createFile(client, {
      filename: "photo.jpg",
      type: "image",
      byte_size: 2048,
      mime_type: "image/jpeg",
    });

    expect(result.id).toBeDefined();
    expect(result.type).toBe("image");
    expect(result.status).toBe("created");
  });

  test("creates a caption file", async () => {
    const result = await createFile(client, {
      filename: "subs.vtt",
      type: "caption",
      byte_size: 512,
    });

    expect(result.id).toBeDefined();
    expect(result.type).toBe("caption");
    expect(result.status).toBe("created");
  });
});
