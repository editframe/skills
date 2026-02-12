import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { fixture, withFixtures } from "../../test-fixtures/fixture.js";
import {
  mockCreateFile,
  mockCreateFileTrack,
  mockGetUploadFile,
  mockLookupFileByMd5NotFound,
  mockUploadFileIndex,
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
            mockLookupFileByMd5NotFound({
              md5: testPng!.md5,
            }),
            mockCreateFile({
              status: "ready",
              id: "123",
              type: "image",
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
            mockLookupFileByMd5NotFound({
              md5: testPng!.md5,
            }),
            mockCreateFile({
              status: "created",
              id: "123",
              type: "image",
              fixture: testPng!,
            }),
            mockGetUploadFile({
              id: "123",
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
            mockLookupFileByMd5NotFound({
              md5: testPng!.md5,
            }),
            mockCreateFile({
              status: "created",
              id: "123",
              type: "image",
              fixture: testPng!,
            }),
            mockGetUploadFile({
              id: "123",
              fixture: testPng!,
            }),
            mockCreateFile({
              status: "created",
              id: "123",
              type: "image",
              fixture: test2Png!,
            }),
            mockGetUploadFile({
              id: "123",
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
            status: "ready" as const,
            id: "123",
            type: "video" as const,
            fixture: testMp4!,
          };
          server.use(
            mockLookupFileByMd5NotFound({
              md5: testMp4!.md5,
            }),

            mockCreateFile(creationArgs),

            mockCreateFileTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              fixture: testMp4!,
            }),

            mockCreateFile(creationArgs),
            mockCreateFileTrack({
              complete: true,
              fileId: "123",
              id: "track-2",
              fixture: testMp4!,
            }),

            mockCreateFile(creationArgs),
            mockUploadFileIndex({
              id: "123",
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
            status: "created" as const,
            id: "123",
            type: "video" as const,
            fixture: testMp4!,
          };
          server.use(
            mockLookupFileByMd5NotFound({
              md5: testMp4!.md5,
            }),
            mockCreateFile(creationArgs),
            mockUploadFileIndex({
              id: "123",
            }),

            mockCreateFile(creationArgs),
            mockCreateFileTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              fixture: testMp4!,
            }),

            mockCreateFile(creationArgs),
            mockCreateFileTrack({
              complete: true,
              fileId: "123",
              id: "track-2",
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
          const fileCreationArgs = {
            status: "ready" as const,
            id: "123",
            type: "video" as const,
          };
          server.use(
            mockLookupFileByMd5NotFound({
              md5: testMp4!.md5,
            }),
            mockCreateFile({
              ...fileCreationArgs,
              fixture: testMp4!,
            }),
            mockCreateFile({
              ...fileCreationArgs,
              fixture: testMp4!,
            }),
            mockCreateFile({
              ...fileCreationArgs,
              fixture: testMp4!,
            }),

            mockCreateFileTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              fixture: test2Mp4!,
            }),

            mockCreateFileTrack({
              complete: true,
              id: "track-2",
              fileId: "123",
              fixture: test2Mp4!,
            }),

            mockUploadFileIndex({
              id: "123",
            }),
          );
          server.use(
            mockCreateFile({
              ...fileCreationArgs,
              fixture: testMp4!,
            }),
            mockCreateFile({
              ...fileCreationArgs,
              fixture: testMp4!,
            }),
            mockCreateFile({
              ...fileCreationArgs,
              fixture: testMp4!,
            }),

            mockCreateFileTrack({
              complete: true,
              id: "track-1",
              fileId: "123",
              fixture: test2Mp4!,
            }),

            mockCreateFileTrack({
              complete: true,
              id: "track-2",
              fileId: "123",
              fixture: test2Mp4!,
            }),

            mockUploadFileIndex({
              id: "123",
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
