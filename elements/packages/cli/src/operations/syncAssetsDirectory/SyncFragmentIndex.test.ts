import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { fixture, withFixtures } from "../../../test-fixtures/fixture.js";
import {
  mockCreateFile,
  mockLookupFileByMd5,
  mockLookupFileByMd5NotFound,
  mockUploadFileIndex,
} from "../../../test-fixtures/network.js";
import { SyncFragmentIndex } from "./SyncFragmentIndex.js";

const server = setupServer();

describe("SyncFragmentIndex", async () => {
  beforeAll(() => {
    server.listen();
    process.env.EF_TOKEN = "ef_SECRET_TOKEN";
    process.env.EF_HOST = "http://localhost:3000";
  });
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());
  await withFixtures(
    [fixture("test.mp4", "test.mp4")],
    async ({ files: [video], generateTrackFragmentIndex }) => {
      test("Reads byte size", async () => {
        const syncFragmentIndex = new SyncFragmentIndex(
          await generateTrackFragmentIndex(video!),
          video!.md5,
        );
        await expect(syncFragmentIndex.byteSize()).resolves.toEqual(31);
      });
      test("prepare() is noop", async () => {
        const syncFragmentIndex = new SyncFragmentIndex(
          await generateTrackFragmentIndex(video!),
          video!.md5,
        );
        await expect(syncFragmentIndex.prepare()).resolves.toBeUndefined();
      });
      test("validate() is noop", async () => {
        const syncFragmentIndex = new SyncFragmentIndex(
          await generateTrackFragmentIndex(video!),
          video!.md5,
        );
        await expect(syncFragmentIndex.validate()).resolves.toBeUndefined();
      });
      describe(".create()", () => {
        test("uses matching data when file matches md5", async () => {
          server.use(
            mockLookupFileByMd5({
              md5: video!.md5,
              type: "video",
              status: "created",
              fixture: video!,
            }),
          );
          const syncFragmentIndex = new SyncFragmentIndex(
            await generateTrackFragmentIndex(video!),
            video!.md5,
          );
          await syncFragmentIndex.create();
          expect(syncFragmentIndex.isComplete()).toBe(false);
        });
        test("isComplete() returns false when not created", async () => {
          server.use(
            mockLookupFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateFile({
              status: "created",
              id: "123",
              type: "video",
              fixture: video!,
            }),
          );
          const syncFragmentIndex = new SyncFragmentIndex(
            await generateTrackFragmentIndex(video!),
            video!.md5,
          );
          await syncFragmentIndex.create();
          expect(syncFragmentIndex.isComplete()).toBe(false);
        });
        test("isComplete() returns true when created", async () => {
          server.use(
            mockLookupFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateFile({
              status: "ready",
              id: "123",
              type: "video",
              fixture: video!,
            }),
          );
          const syncFragmentIndex = new SyncFragmentIndex(
            await generateTrackFragmentIndex(video!),
            video!.md5,
          );
          await syncFragmentIndex.create();
          expect(syncFragmentIndex.isComplete()).toBe(true);
        });
      });
      describe(".upload()", () => {
        test("throws when not created", async () => {
          const syncFragmentIndex = new SyncFragmentIndex(
            await generateTrackFragmentIndex(video!),
            video!.md5,
          );
          await expect(syncFragmentIndex.upload()).rejects.toThrow();
        });
        test("uploads index", async () => {
          server.use(
            mockLookupFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateFile({
              status: "ready",
              id: "123",
              type: "video",
              fixture: video!,
            }),
            mockUploadFileIndex({
              id: "123",
            }),
          );
          const syncFragmentIndex = new SyncFragmentIndex(
            await generateTrackFragmentIndex(video!),
            video!.md5,
          );
          await syncFragmentIndex.create();
          await expect(syncFragmentIndex.upload()).resolves.toBeUndefined();
        });
      });
      describe(".markSynced()", () => {
        test("throws when not created", async () => {
          const syncFragmentIndex = new SyncFragmentIndex(
            await generateTrackFragmentIndex(video!),
            video!.md5,
          );
          await expect(syncFragmentIndex.markSynced()).rejects.toThrow();
        });
        test("marks synced", async () => {
          server.use(
            mockLookupFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateFile({
              status: "ready",
              id: "123",
              type: "video",
              fixture: video!,
            }),
            mockUploadFileIndex({
              id: "123",
            }),
          );
          const syncFragmentIndex = new SyncFragmentIndex(
            await generateTrackFragmentIndex(video!),
            video!.md5,
          );
          await syncFragmentIndex.create();
          await syncFragmentIndex.markSynced();
          await expect(syncFragmentIndex.syncStatus.isSynced()).resolves.toBe(true);
          await expect(syncFragmentIndex.syncStatus.readInfo()).resolves.toEqual({
            version: "1",
            complete: true,
            id: "123",
            md5: video!.md5,
            byte_size: 31,
          });

          await expect(syncFragmentIndex.fileSyncStatus.readInfo()).resolves.toEqual({
            version: "1",
            complete: true,
            id: "123",
            md5: video!.md5,
            byte_size: 31,
          });
        });
      });
    },
  );
});
