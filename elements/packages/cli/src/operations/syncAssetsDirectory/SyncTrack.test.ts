import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { fixture, withFixtures } from "../../../test-fixtures/fixture.js";
import {
  mockCreateIsobmffFile,
  mockCreateIsobmffTrack,
  mockGetIsobmffTrackUpload,
  mockLookupISOBMFFFileByMd5,
  mockLookupISOBMFFFileByMd5NotFound,
} from "../../../test-fixtures/network.js";
import { SyncTrack } from "./SyncTrack.js";

const server = setupServer();

describe("SyncTrack", async () => {
  beforeAll(() => {
    server.listen();
    process.env.EF_TOKEN = "ef_SECRET_TOKEN";
    process.env.EF_HOST = "http://localhost:3000";
  });
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());
  await withFixtures(
    [fixture("test.mp4", "test.mp4")],
    async ({ files: [video], generateTrack }) => {
      test("Reads byte size", async () => {
        const syncTrack = new SyncTrack(
          await generateTrack(video!, 1),
          video!.md5,
        );
        await expect(syncTrack.byteSize()).resolves.toEqual(26434);
      });
      describe("prepare()", () => {
        test("Uses existing ISOBMFF file if md5 matches", async () => {
          server.use(
            mockLookupISOBMFFFileByMd5({
              complete: true,
              id: "123",
              md5: video!.md5,
              fixture: video!,
            }),
          );
          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await syncTrack.prepare();
          expect(syncTrack.isoFile).toBeDefined();
        });

        test("Creates ISOBMFF file", async () => {
          server.use(
            mockLookupISOBMFFFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: video!,
            }),
          );
          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await syncTrack.prepare();
          expect(syncTrack.isoFile).toBeDefined();
        });

        test("Probes track", async () => {
          server.use(
            mockLookupISOBMFFFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: video!,
            }),
          );
          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await syncTrack.prepare();
          expect(syncTrack.probeResult).toBeDefined();
        });
      });

      describe("validate()", () => {
        test("throws when prepare() is not called", async () => {
          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await expect(syncTrack.validate()).rejects.toThrow();
        });

        test.skip("throws when track has bad duration", async () => {});
        test.skip("throws when track has bad codec_type", async () => {});
        test.skip("throws when no isoFile exists", async () => {});
      });

      describe(".create()", () => {
        test("throws if prepare() is not called", async () => {
          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await expect(syncTrack.create()).rejects.toThrow();
        });

        test("isComplete() returns false when not complete", async () => {
          server.use(
            mockLookupISOBMFFFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: video!,
            }),
            mockCreateIsobmffTrack({
              complete: false,
              id: "track-1",
              fileId: "123",
              fixture: video!,
            }),
          );

          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await syncTrack.prepare();
          await syncTrack.create();
          expect(syncTrack.isComplete()).toBe(false);
        });

        test("isComplete() returns true when complete", async () => {
          server.use(
            mockLookupISOBMFFFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: video!,
            }),
            mockCreateIsobmffTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              fixture: video!,
            }),
          );

          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await syncTrack.prepare();
          await syncTrack.create();
          expect(syncTrack.isComplete()).toBe(true);
        });
      });

      describe(".upload()", () => {
        test("throws when not created", async () => {
          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await expect(syncTrack.upload()).rejects.toThrow();
        });
        test("uploads track", async () => {
          server.use(
            mockLookupISOBMFFFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: video!,
            }),
            mockCreateIsobmffTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              fixture: video!,
            }),
            mockGetIsobmffTrackUpload({
              complete: true,
              id: "track-1",
              trackId: 1,
              fileId: "123",
            }),
          );
          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await syncTrack.prepare();
          await syncTrack.create();
          await expect(syncTrack.upload()).resolves.toBeUndefined();
        });
      });
      describe(".markSynced()", () => {
        test("throws when not created", async () => {
          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await expect(syncTrack.markSynced()).rejects.toThrow();
        });
        test("marks synced", async () => {
          server.use(
            mockLookupISOBMFFFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              fixture: video!,
            }),
            mockCreateIsobmffTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              fixture: video!,
            }),
          );
          const syncTrack = new SyncTrack(
            await generateTrack(video!, 1),
            video!.md5,
          );
          await syncTrack.prepare();
          await syncTrack.create();
          await syncTrack.markSynced();
          await expect(syncTrack.syncStatus.isSynced()).resolves.toBe(true);
          await expect(syncTrack.syncStatus.readInfo()).resolves.toEqual({
            version: "1",
            complete: true,
            id: "123:track-1",
            md5: video!.md5,
            byte_size: 26434,
          });

          await expect(syncTrack.fileSyncStatus.readInfo()).resolves.toEqual({
            version: "1",
            complete: true,
            id: "123",
            md5: video!.md5,
            byte_size: 26434,
          });
        });
      });
    },
  );
});
