import { describe, test, expect, beforeEach } from "vitest";
import type { Redis as ValKey } from "iovalkey";

import "./zfam";
import { makeDataStore } from "./makeDataStore";

describe("zfam", () => {
  let vk: ValKey;
  beforeEach(async () => {
    vk = await makeDataStore();
  });
  describe("zfadd", () => {
    test("depth = 1", async () => {
      await vk.zfadd(["a", "1"], "scope", "suffix", 1, "value1");
      await expect(vk.zrange("scope:a", 0, -1)).resolves.toEqual(["scope:a:1"]);
      await expect(vk.zrange("scope:a:1:suffix", 0, -1)).resolves.toEqual([
        "value1",
      ]);
    });
    test("depth = 2", async () => {
      await vk.zfadd(["a", "1", "b", "1"], "scope", "suffix", 1, "value1");
      await expect(vk.zrange("scope:a", 0, -1)).resolves.toEqual(["scope:a:1"]);
      await expect(vk.zrange("scope:a:1:b", 0, -1)).resolves.toEqual([
        "scope:a:1:b:1",
      ]);
      await expect(vk.zrange("scope:a:1:b:1:suffix", 0, -1)).resolves.toEqual([
        "value1",
      ]);
    });

    test("depth = 3", async () => {
      await vk.zfadd(
        ["a", "1", "b", "1", "c", "1"],
        "scope",
        "suffix",
        1,
        "value1",
      );
      await expect(vk.zrange("scope:a", 0, -1)).resolves.toEqual(["scope:a:1"]);
      await expect(vk.zrange("scope:a:1:b", 0, -1)).resolves.toEqual([
        "scope:a:1:b:1",
      ]);
      await expect(vk.zrange("scope:a:1:b:1:c", 0, -1)).resolves.toEqual([
        "scope:a:1:b:1:c:1",
      ]);
      await expect(
        vk.zrange("scope:a:1:b:1:c:1:suffix", 0, -1),
      ).resolves.toEqual(["value1"]);
    });
  });

  test("cleans up empty data after popping in round-robin order", async () => {
    await vk.zfadd(
      ["a", "1", "b", "1", "c", "1"],
      "scope",
      "suffix",
      1,
      "value1",
    );

    await vk.zfadd(
      ["a", "1", "b", "1", "c", "1"],
      "scope",
      "suffix",
      1,
      "value2",
    );
    await vk.zfadd(
      ["a", "1", "b", "1", "c", "2"],
      "scope",
      "suffix",
      1,
      "value3",
    );
    await vk.zfadd(
      ["a", "1", "b", "2", "c", "1"],
      "scope",
      "suffix",
      1,
      "value4",
    );

    await expect(vk.zfpop(["a", "b", "c"], "scope", "suffix")).resolves.toEqual(
      ["value1", "1"],
    );

    await expect(vk.zfpop(["a", "b", "c"], "scope", "suffix")).resolves.toEqual(
      ["value4", "1"],
    );

    await expect(vk.zfpop(["a", "b", "c"], "scope", "suffix")).resolves.toEqual(
      ["value3", "1"],
    );

    await expect(vk.zfpop(["a", "b", "c"], "scope", "suffix")).resolves.toEqual(
      ["value2", "1"],
    );

    await expect(vk.keys("*")).resolves.toEqual([]);
  });
});
