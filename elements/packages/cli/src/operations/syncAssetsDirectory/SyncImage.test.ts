import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { fixture, withFixtures } from "../../../test-fixtures/fixture.js";
import {
  mockCreateFile,
  mockGetUploadFile,
  mockLookupFileByMd5,
  mockLookupFileByMd5NotFound,
} from "../../../test-fixtures/network.js";
import { SyncImage } from "./SyncImage.js";

const server = setupServer();

describe("SyncImage", async () => {
  beforeAll(() => {
    server.listen();
    process.env.EF_TOKEN = "ef_SECRET_TOKEN";
    process.env.EF_HOST = "http://localhost:3000";
  });
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());
  await withFixtures([fixture("test.png", "test.png")], async ({ files: [image], cacheImage }) => {
    test("Reads byte size", async () => {
      const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
      await expect(syncImage.byteSize()).resolves.toEqual(276);
    });
    test("prepare() probes image", async () => {
      const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
      await expect(syncImage.prepare()).resolves.toBeUndefined();
      expect(syncImage.probeResult.data.format).toMatchObject({
        format_name: "png_pipe",
      });
    });
    describe("validate()", () => {
      test("Throws when prepare() is not called", async () => {
        const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
        await expect(syncImage.validate()).rejects.toThrow();
      });
      test.skip("throws when probe is not a supported image", async () => {});
    });

    describe(".create()", () => {
      test("Throws when prepare() is not called", async () => {
        const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
        await expect(syncImage.create()).rejects.toThrow();
      });
      test("Skips creation if image file matches md5", async () => {
        server.use(
          mockLookupFileByMd5({
            md5: image!.md5,
            type: "image",
            fixture: image!,
          }),
        );
        const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
        await syncImage.prepare();
        await syncImage.create();
        expect(syncImage.isComplete()).toBe(true);
      });
      test("isComplete() returns false when not created", async () => {
        server.use(
          mockLookupFileByMd5NotFound({
            md5: image!.md5,
          }),
          mockCreateFile({
            status: "created",
            id: "123",
            type: "image",
            fixture: image!,
          }),
        );
        const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
        await syncImage.prepare();
        await syncImage.create();
        expect(syncImage.isComplete()).toBe(false);
      });
      test("isComplete() returns true when created", async () => {
        server.use(
          mockLookupFileByMd5NotFound({
            md5: image!.md5,
          }),
          mockCreateFile({
            status: "ready",
            id: "123",
            type: "image",
            fixture: image!,
          }),
        );
        const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
        await syncImage.prepare();
        await syncImage.create();
        expect(syncImage.isComplete()).toBe(true);
      });
    });
    describe(".upload()", () => {
      test("throws when not created", async () => {
        const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
        await syncImage.prepare();
        await expect(() => syncImage.upload()).rejects.toThrow();
      });
      test("uploads image", async () => {
        server.use(
          mockLookupFileByMd5NotFound({
            md5: image!.md5,
          }),
          mockCreateFile({
            status: "created",
            id: "123",
            type: "image",
            fixture: image!,
          }),
          mockGetUploadFile({
            id: "123",
            fixture: image!,
          }),
        );
        const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
        await syncImage.prepare();
        await syncImage.create();
        await expect(syncImage.upload()).resolves.toBeUndefined();
      });
    });
    describe(".markSynced()", () => {
      test("throws when not created", async () => {
        const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
        await expect(syncImage.markSynced()).rejects.toThrow();
      });
      test("marks synced", async () => {
        server.use(
          mockLookupFileByMd5NotFound({
            md5: image!.md5,
          }),
          mockCreateFile({
            status: "ready",
            id: "123",
            type: "image",
            fixture: image!,
          }),
          mockGetUploadFile({
            id: "123",
            fixture: image!,
          }),
        );
        const syncImage = new SyncImage(await cacheImage(image!), image!.md5);
        await syncImage.prepare();
        await syncImage.create();
        await syncImage.upload();
        await syncImage.markSynced();
        await expect(syncImage.syncStatus.isSynced()).resolves.toBe(true);
        await expect(syncImage.syncStatus.readInfo()).resolves.toEqual({
          version: "1",
          complete: true,
          id: "123",
          md5: image!.md5,
          byte_size: 276,
        });
      });
    });
  });
});
