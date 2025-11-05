import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { fixture, withFixtures } from "../../test-fixtures/fixture.js";
import {
  mockCreateImageFile,
  mockCreateIsobmffFile,
  mockCreateIsobmffTrack,
  mockGetUploadImageFile,
  mockLookupImageFileByMd5NotFound,
  mockLookupISOBMFFFileByMd5NotFound,
  mockUploadIsobmffFileIndex,
} from "../../test-fixtures/network.js";

const server = setupServer();

describe("syncAssetsDirectory", () => {
  beforeAll(() => {
    server.listen();
    process.env.EF_TOKEN = "ef_SECRET_TOKEN";
    process.env.EF_HOST = "http://localhost:3000";
  });
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  describe("Image sync", () => {
    it("Syncs assets directory when file is already uploaded", async () => {
      await withFixtures(
        [fixture("test.png", "test.png")],
        async ({
          files: [testPng],
          expectCacheFiles,
          expectInfoFileContent,
          syncAssetsDirectory,
          cacheImage,
        }) => {
          server.use(
            mockLookupImageFileByMd5NotFound({
              md5: testPng!.md5,
            }),
            mockCreateImageFile({
              complete: true,
              id: "123",
              filename: "test.png",
              fixture: testPng!,
            }),
          );
          await cacheImage(testPng!);
          await syncAssetsDirectory();
          await expectCacheFiles(testPng!, ["test.png", "test.png.info"]);

          await expectInfoFileContent("test.png.info", testPng!, {
            complete: true,
            id: "123",
          });
        },
      );
    });

    it("Syncs assets directory when file is not uploaded", async () => {
      await withFixtures(
        [fixture("test.png", "test.png")],
        async ({
          files: [testPng],
          expectCacheFiles,
          expectInfoFileContent,
          cacheImage,
          syncAssetsDirectory,
        }) => {
          server.use(
            mockLookupImageFileByMd5NotFound({
              md5: testPng!.md5,
            }),
            mockCreateImageFile({
              complete: false,
              id: "123",
              filename: "test.png",
              fixture: testPng!,
            }),
            mockGetUploadImageFile({
              complete: true,
              id: "123",
              filename: "test.png",
              fixture: testPng!,
            }),
          );
          await cacheImage(testPng!);
          await syncAssetsDirectory();
          await expectCacheFiles(testPng!, ["test.png", "test.png.info"]);

          await expectInfoFileContent("test.png.info", testPng!, {
            complete: true,
            id: "123",
          });
        },
      );
    });

    it("Syncs assets directory when file is present with different name", async () => {
      await withFixtures(
        [fixture("test.png", "test.png"), fixture("test.png", "test2.png")],
        async ({
          files: [testPng, test2Png],
          cacheImage,
          syncAssetsDirectory,
          expectCacheFiles,
          expectInfoFileContent,
        }) => {
          server.use(
            mockLookupImageFileByMd5NotFound({
              md5: testPng!.md5,
            }),
            mockCreateImageFile({
              complete: false,
              id: "123",
              filename: "test.png",
              fixture: testPng!,
            }),
            mockGetUploadImageFile({
              complete: true,
              id: "123",
              filename: "test.png",
              fixture: testPng!,
            }),
            mockCreateImageFile({
              complete: false,
              id: "123",
              filename: "test.png",
              fixture: test2Png!,
            }),
            mockGetUploadImageFile({
              complete: true,
              id: "123",
              filename: "test.png",
              fixture: test2Png!,
            }),
          );

          await cacheImage(testPng!);
          await cacheImage(test2Png!);
          await syncAssetsDirectory();
          await expectCacheFiles(testPng!, [
            "test.png",
            "test.png.info",
            "test2.png",
            "test2.png.info",
          ]);

          await expectInfoFileContent("test.png.info", testPng!, {
            complete: true,
            id: "123",
          });

          await expectInfoFileContent("test2.png.info", testPng!, {
            complete: true,
            id: "123",
          });
        },
      );
    });
  });

  describe("A/V Sync", () => {
    it("Syncs assets directory when fragment index is already uploaded", async () => {
      await withFixtures(
        [fixture("test.mp4", "test.mp4")],
        async ({
          files: [testMp4],
          generateTrack,
          generateTrackFragmentIndex,
          syncAssetsDirectory,
          expectInfoFileContent,
          expectCacheFiles,
        }) => {
          const creationArgs = {
            complete: true,
            id: "123",
            filename: "test.mp4",
            fixture: testMp4!,
          };
          server.use(
            mockLookupISOBMFFFileByMd5NotFound({
              md5: testMp4!.md5,
            }),

            mockCreateIsobmffFile(creationArgs),

            mockCreateIsobmffTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              filename: "test.mp4",
              fixture: testMp4!,
            }),

            mockCreateIsobmffFile(creationArgs),
            mockCreateIsobmffTrack({
              complete: true,
              fileId: "123",
              id: "track-2",
              filename: "test.mp4",
              fixture: testMp4!,
            }),

            mockCreateIsobmffFile(creationArgs),
            mockUploadIsobmffFileIndex({
              id: "123",
              complete: true,
            }),
          );
          await generateTrack(testMp4!, 1);
          await generateTrack(testMp4!, 2);
          await generateTrackFragmentIndex(testMp4!);

          await syncAssetsDirectory();

          await expectCacheFiles(testMp4!, [
            "isobmff.info",
            "test.mp4.track-1.mp4",
            "test.mp4.track-1.mp4.info",
            "test.mp4.track-2.mp4",
            "test.mp4.track-2.mp4.info",
            "test.mp4.tracks.json",
            "test.mp4.tracks.json.info",
          ]);

          await expectInfoFileContent("isobmff.info", testMp4!, {
            complete: true,
            id: "123",
            byte_size: 31,
          });

          await expectInfoFileContent("test.mp4.tracks.json.info", testMp4!, {
            complete: true,
            id: "123",
            byte_size: 31,
          });

          await expectInfoFileContent("test.mp4.track-1.mp4.info", testMp4!, {
            complete: true,
            id: "123:track-1",
            byte_size: 26434,
          });

          await expectInfoFileContent("test.mp4.track-2.mp4.info", testMp4!, {
            complete: true,
            id: "123:track-2",
            byte_size: 26434,
          });
        },
      );
    });

    it("Syncs assets directory when fragment index is not uploaded", async () => {
      await withFixtures(
        [fixture("test.mp4", "test.mp4")],
        async ({
          files: [testMp4],

          syncAssetsDirectory,
          expectCacheFiles,
          expectInfoFileContent,
          generateTrackFragmentIndex,
          generateTrack,
        }) => {
          const creationArgs = {
            complete: false,
            id: "123",
            filename: "test.mp4",
            fixture: testMp4!,
          };
          server.use(
            mockLookupISOBMFFFileByMd5NotFound({
              md5: testMp4!.md5,
            }),
            mockCreateIsobmffFile(creationArgs),
            mockUploadIsobmffFileIndex({
              id: "123",
              complete: true,
            }),

            mockCreateIsobmffFile(creationArgs),
            mockCreateIsobmffTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              filename: "test.mp4",
              fixture: testMp4!,
            }),

            mockCreateIsobmffFile(creationArgs),
            mockCreateIsobmffTrack({
              complete: true,
              fileId: "123",
              id: "track-2",
              filename: "test.mp4",
              fixture: testMp4!,
            }),
          );
          await generateTrackFragmentIndex(testMp4!);
          await generateTrack(testMp4!, 1);
          await generateTrack(testMp4!, 2);

          await syncAssetsDirectory();

          await expectCacheFiles(testMp4!, [
            "isobmff.info",
            "test.mp4.track-1.mp4",
            "test.mp4.track-1.mp4.info",
            "test.mp4.track-2.mp4",
            "test.mp4.track-2.mp4.info",
            "test.mp4.tracks.json",
            "test.mp4.tracks.json.info",
          ]);

          await expectInfoFileContent("isobmff.info", testMp4!, {
            complete: true,
            id: "123",
            byte_size: 31,
          });

          await expectInfoFileContent("test.mp4.tracks.json.info", testMp4!, {
            byte_size: 31,
            complete: true,
            id: "123",
          });

          await expectInfoFileContent("test.mp4.track-1.mp4.info", testMp4!, {
            byte_size: 26434,
            complete: true,
            id: "123:track-1",
          });

          await expectInfoFileContent("test.mp4.track-2.mp4.info", testMp4!, {
            byte_size: 26434,
            complete: true,
            id: "123:track-2",
          });
        },
      );
    });

    it("Syncs assets when file has already been synced with a different name", async () => {
      await withFixtures(
        [fixture("test.mp4", "test.mp4"), fixture("test.mp4", "test2.mp4")],
        async ({
          files: [testMp4, test2Mp4],
          syncAssetsDirectory,
          generateTrackFragmentIndex,
          generateTrack,
          expectInfoFileContent,
          expectCacheFiles,
        }) => {
          server.use(
            mockLookupISOBMFFFileByMd5NotFound({
              md5: testMp4!.md5,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: testMp4!,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: testMp4!,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: testMp4!,
            }),

            mockCreateIsobmffTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              filename: "test.mp4",
              fixture: test2Mp4!,
            }),

            mockCreateIsobmffTrack({
              complete: true,
              id: "track-2",
              fileId: "123",
              filename: "test.mp4",
              fixture: test2Mp4!,
            }),

            mockUploadIsobmffFileIndex({
              id: "123",
              complete: true,
            }),
          );
          server.use(
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: testMp4!,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: testMp4!,
            }),
            mockCreateIsobmffFile({
              complete: true,
              id: "123",
              filename: "test.mp4",
              fixture: testMp4!,
            }),

            mockCreateIsobmffTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              filename: "test.mp4",
              fixture: test2Mp4!,
            }),

            mockCreateIsobmffTrack({
              complete: true,
              id: "track-2",
              fileId: "123",
              filename: "test.mp4",
              fixture: test2Mp4!,
            }),

            mockUploadIsobmffFileIndex({
              id: "123",
              complete: true,
            }),
          );

          await generateTrackFragmentIndex(testMp4!);
          await generateTrack(testMp4!, 1);
          await generateTrack(testMp4!, 2);

          await generateTrackFragmentIndex(test2Mp4!);
          await generateTrack(test2Mp4!, 1);
          await generateTrack(test2Mp4!, 2);
          await syncAssetsDirectory();

          await expectCacheFiles(test2Mp4!, [
            "isobmff.info",
            "test.mp4.track-1.mp4",
            "test.mp4.track-1.mp4.info",
            "test.mp4.track-2.mp4",
            "test.mp4.track-2.mp4.info",
            "test.mp4.tracks.json",

            "test.mp4.tracks.json.info",
            "test2.mp4.track-1.mp4",
            "test2.mp4.track-1.mp4.info",
            "test2.mp4.track-2.mp4",
            "test2.mp4.track-2.mp4.info",
            "test2.mp4.tracks.json",
            "test2.mp4.tracks.json.info",
          ]);

          await expectInfoFileContent("isobmff.info", testMp4!, {
            byte_size: 31,
            complete: true,
            id: "123",
          });

          await expectInfoFileContent("test2.mp4.tracks.json.info", testMp4!, {
            byte_size: 31,
            complete: true,
            id: "123",
          });

          await expectInfoFileContent("test2.mp4.track-1.mp4.info", testMp4!, {
            byte_size: 26434,
            complete: true,
            id: "123:track-1",
          });

          await expectInfoFileContent("test2.mp4.track-2.mp4.info", testMp4!, {
            byte_size: 26434,
            complete: true,
            id: "123:track-2",
          });

          await expectInfoFileContent("test.mp4.tracks.json.info", testMp4!, {
            byte_size: 31,
            complete: true,
            id: "123",
          });

          await expectInfoFileContent("test.mp4.track-1.mp4.info", testMp4!, {
            byte_size: 26434,
            complete: true,
            id: "123:track-1",
          });

          await expectInfoFileContent("test.mp4.track-2.mp4.info", testMp4!, {
            byte_size: 26434,
            complete: true,
            id: "123:track-2",
          });
        },
      );
    });
  });
});
