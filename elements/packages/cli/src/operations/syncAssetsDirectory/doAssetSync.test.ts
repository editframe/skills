import { describe, expect, test, vi } from "vitest";
import { doAssetSync } from "./doAssetSync.js";
import type { SubAssetSync } from "./SubAssetSync.js";
import type { SyncStatusInfo } from "./SyncStatus.js";

const collectAsyncGenerator = async (
  generator: SubAssetSync<unknown>,
): Promise<
  {
    status: "info" | "success";
    message: string;
  }[]
> => {
  const result = [];
  for await (const item of doAssetSync(generator)) {
    result.push(item);
  }
  return result;
};

const buildFakeSync = (): SubAssetSync<unknown> => {
  const fakeSyncStatus = {
    isSynced: vi.fn().mockReturnValue(false),
  } as unknown as SyncStatusInfo;
  const fakeSync = {
    label: "TEST_LABEL",
    icon: "🧪",
    path: "TEST_PATH",
    readInfo: vi.fn().mockReturnValue(Promise.resolve(null)),
    syncStatus: fakeSyncStatus,
    markSynced: vi.fn().mockReturnValue(Promise.resolve()),
    isComplete: vi.fn().mockReturnValue(false),
    prepare: vi.fn().mockReturnValue(Promise.resolve()),
    validate: vi.fn().mockReturnValue(Promise.resolve()),
    create: vi.fn().mockReturnValue(Promise.resolve()),
    upload: vi.fn().mockReturnValue(Promise.resolve()),
  } as unknown as SubAssetSync<unknown>;
  return fakeSync;
};

describe("doAssetSync", () => {
  test("Succeeds if all steps are executed without error", async () => {
    const fakeSync = buildFakeSync();
    const messages = await collectAsyncGenerator(fakeSync);
    expect(messages).toEqual([
      {
        status: "info",
        message: "🧪  Syncing TEST_LABEL: TEST_PATH",
      },
      {
        status: "success",
        message: "Synced TEST_LABEL: TEST_PATH",
      },
    ]);
  });

  test("Succeeds if asset is already synced", async () => {
    const fakeSync = buildFakeSync();
    fakeSync.syncStatus.isSynced = vi.fn().mockReturnValue(true);
    const messages = await collectAsyncGenerator(fakeSync);
    expect(messages).toEqual([
      {
        status: "info",
        message: "Sub-asset has already been synced: TEST_PATH",
      },
    ]);
  });

  test("Succeeds if asset is already uploaded", async () => {
    const fakeSync = buildFakeSync();
    fakeSync.isComplete = vi.fn().mockReturnValue(true);
    const messages = await collectAsyncGenerator(fakeSync);
    expect(messages).toEqual([
      {
        status: "info",
        message: "🧪  Syncing TEST_LABEL: TEST_PATH",
      },
      {
        status: "success",
        message: "Synced TEST_LABEL: TEST_PATH",
      },
    ]);
  });

  test("Throws if prepare fails", async () => {
    const fakeSync = buildFakeSync();
    fakeSync.prepare = vi.fn().mockReturnValue(Promise.reject(new Error("TEST_ERROR")));
    await expect(collectAsyncGenerator(fakeSync)).rejects.toThrow(
      "Error validating TEST_LABEL: TEST_ERROR",
    );
  });

  test("Throws if validate fails", async () => {
    const fakeSync = buildFakeSync();
    fakeSync.validate = vi.fn().mockReturnValue(Promise.reject(new Error("TEST_ERROR")));
    await expect(collectAsyncGenerator(fakeSync)).rejects.toThrow(
      "Error validating TEST_LABEL: TEST_ERROR",
    );
  });

  test("Throws if create fails", async () => {
    const fakeSync = buildFakeSync();
    fakeSync.create = vi.fn().mockReturnValue(Promise.reject(new Error("TEST_ERROR")));
    await expect(collectAsyncGenerator(fakeSync)).rejects.toThrow(
      "Error creating TEST_LABEL: TEST_ERROR",
    );
  });

  test("Throws if upload fails", async () => {
    const fakeSync = buildFakeSync();
    fakeSync.upload = vi.fn().mockReturnValue(Promise.reject(new Error("TEST_ERROR")));
    await expect(collectAsyncGenerator(fakeSync)).rejects.toThrow(
      "Error uploading TEST_LABEL: TEST_ERROR",
    );
  });

  test("Throws if markSynced fails", async () => {
    const fakeSync = buildFakeSync();
    fakeSync.markSynced = vi.fn().mockReturnValue(Promise.reject(new Error("TEST_ERROR")));
    await expect(collectAsyncGenerator(fakeSync)).rejects.toThrow(
      "Error marking TEST_LABEL as synced: TEST_ERROR",
    );
  });
});
