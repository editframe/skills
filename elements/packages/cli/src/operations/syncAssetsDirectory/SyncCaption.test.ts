import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { fixture, withFixtures } from "../../../test-fixtures/fixture.js";
import {
  mockCreateCaptionFile,
  mockLookupCaptionFileByMd5,
  mockLookupCaptionFileByMd5NotFound,
  mockUploadCaptionFile,
} from "../../../test-fixtures/network.js";
import { SyncCaption } from "./SyncCaption.js";

const server = setupServer();

describe("SyncCaption", async () => {
  beforeAll(() => {
    server.listen();
    process.env.EF_TOKEN = "ef_SECRET_TOKEN";
    process.env.EF_HOST = "http://localhost:3000";
  });
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());
  await withFixtures(
    [fixture("test.mp4", "test.mp4")],
    async ({ files: [video], generateCaptions }) => {
      test("Reads byte size", async () => {
        const syncCaption = new SyncCaption(
          await generateCaptions(video!),
          video!.md5,
        );
        await expect(syncCaption.byteSize()).resolves.toEqual(35);
      });

      test("prepare() is noop", async () => {
        const syncCaption = new SyncCaption(
          await generateCaptions(video!),
          video!.md5,
        );
        await expect(syncCaption.prepare()).resolves.toBeUndefined();
      });

      test("validate() is noop", async () => {
        const syncCaption = new SyncCaption(
          await generateCaptions(video!),
          video!.md5,
        );
        await expect(syncCaption.validate()).resolves.toBeUndefined();
      });

      describe(".create()", () => {
        test("uses matching data when file matches md5", async () => {
          server.use(
            mockLookupCaptionFileByMd5({
              md5: video!.md5,
              fixture: video!,
            }),
          );
          const syncCaption = new SyncCaption(
            await generateCaptions(video!),
            video!.md5,
          );
          await syncCaption.create();
          expect(syncCaption.isComplete()).toBe(true);
        });
        test("isComplete() returns false when not created", async () => {
          server.use(
            mockLookupCaptionFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateCaptionFile({
              complete: false,
              id: "123",
              filename: "test.mp4",
              fixture: video!,
            }),
          );
          const syncCaption = new SyncCaption(
            await generateCaptions(video!),
            video!.md5,
          );
          await syncCaption.create();
          expect(syncCaption.isComplete()).toBe(false);
        });

        test("isComplete() returns true when created", async () => {
          server.use(
            mockLookupCaptionFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateCaptionFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: video!,
            }),
          );
          const syncCaption = new SyncCaption(
            await generateCaptions(video!),
            video!.md5,
          );
          await syncCaption.create();
          expect(syncCaption.isComplete()).toBe(true);
        });
      });

      describe(".upload()", () => {
        test("throws when not created", async () => {
          const syncCaption = new SyncCaption(
            await generateCaptions(video!),
            video!.md5,
          );
          await expect(syncCaption.upload()).rejects.toThrow();
        });

        test("uploads caption", async () => {
          server.use(
            mockLookupCaptionFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateCaptionFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: video!,
            }),
            mockUploadCaptionFile({
              id: "123",
              filename: "test.mp4",
              fixture: video!,
            }),
          );
          const syncCaption = new SyncCaption(
            await generateCaptions(video!),
            video!.md5,
          );
          await syncCaption.create();
          await expect(syncCaption.upload()).resolves.toBeUndefined();
        });
      });

      describe(".markSynced()", () => {
        test("throws when not created", async () => {
          const syncCaption = new SyncCaption(
            await generateCaptions(video!),
            video!.md5,
          );
          await expect(syncCaption.markSynced()).rejects.toThrow();
        });

        test("marks synced", async () => {
          server.use(
            mockLookupCaptionFileByMd5NotFound({
              md5: video!.md5,
            }),
            mockCreateCaptionFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: video!,
            }),
          );
          const syncCaption = new SyncCaption(
            await generateCaptions(video!),
            video!.md5,
          );
          await syncCaption.create();
          await syncCaption.markSynced();

          await expect(syncCaption.syncStatus.isSynced()).resolves.toBe(true);
          await expect(syncCaption.syncStatus.readInfo()).resolves.toEqual({
            version: "1",
            complete: true,
            id: "123",
            md5: video!.md5,
            byte_size: 35,
          });
        });
      });
    },
  );
});
