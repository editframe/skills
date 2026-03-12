import { describe, test, expect } from "vitest";

import { client } from "TEST/@editframe/api/client";
import { createFile, lookupFileByMd5 } from "@editframe/api";
import { uuidv4 } from "lib0/random.js";

describe("files.md5.$md5", () => {
  test("succeeds", async () => {
    const md5 = uuidv4();
    const testFile = await createFile(client, {
      md5,
      filename: "test.mp4",
      type: "video",
      byte_size: 1024,
    });

    const result = await lookupFileByMd5(client, md5);
    expect(result).toMatchObject(testFile);
  });

  test("returns null if the file does not exist", async () => {
    const result = await lookupFileByMd5(client, uuidv4());
    expect(result).toBeNull();
  });
});
