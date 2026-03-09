import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { Client } from "../client.js";
import {
  createFile,
  getFileDetail,
  lookupFileByMd5,
  deleteFile,
  transcribeFile,
  getFileTranscription,
} from "./file.js";

const server = setupServer();
const client = new Client("ef_TEST_TOKEN", "http://localhost");

describe("File", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("createFile", () => {
    test("Creates a video file", async () => {
      server.use(
        http.post("http://localhost/api/v1/files", () =>
          HttpResponse.json(
            {
              id: "test-id",
              filename: "test.mp4",
              type: "video",
              status: "created",
              byte_size: 1024,
              md5: "abc123",
              next_byte: 0,
            },
            { status: 200 },
          ),
        ),
      );

      const result = await createFile(client, {
        filename: "test.mp4",
        type: "video",
        byte_size: 1024,
        md5: "abc123",
      });

      expect(result).toEqual({
        id: "test-id",
        filename: "test.mp4",
        type: "video",
        status: "created",
        byte_size: 1024,
        md5: "abc123",
        next_byte: 0,
      });
    });

    test("Creates an image file", async () => {
      server.use(
        http.post("http://localhost/api/v1/files", () =>
          HttpResponse.json(
            {
              id: "img-id",
              filename: "photo.jpg",
              type: "image",
              status: "created",
              byte_size: 2048,
              md5: null,
              next_byte: 0,
            },
            { status: 200 },
          ),
        ),
      );

      const result = await createFile(client, {
        filename: "photo.jpg",
        type: "image",
        byte_size: 2048,
      });

      expect(result.id).toBe("img-id");
      expect(result.type).toBe("image");
    });

    test("Creates a caption file", async () => {
      server.use(
        http.post("http://localhost/api/v1/files", () =>
          HttpResponse.json(
            {
              id: "cap-id",
              filename: "subs.vtt",
              type: "caption",
              status: "created",
              byte_size: 512,
              md5: null,
              next_byte: 0,
            },
            { status: 200 },
          ),
        ),
      );

      const result = await createFile(client, {
        filename: "subs.vtt",
        type: "caption",
        byte_size: 512,
      });

      expect(result.id).toBe("cap-id");
      expect(result.type).toBe("caption");
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/files", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        createFile(client, {
          filename: "test.mp4",
          type: "video",
          byte_size: 1024,
        }),
      ).rejects.toThrowError("Failed to create file 500 Internal Server Error");
    });

    test("Throws when video file exceeds size limit", async () => {
      await expect(
        createFile(client, {
          filename: "huge.mp4",
          type: "video",
          byte_size: 1024 * 1024 * 1024 + 1,
        }),
      ).rejects.toThrowError(/exceeds limit/);
    });

    test("Throws when image file exceeds size limit", async () => {
      await expect(
        createFile(client, {
          filename: "huge.jpg",
          type: "image",
          byte_size: 1024 * 1024 * 16 + 1,
        }),
      ).rejects.toThrowError(/exceeds limit/);
    });

    test("Throws when caption file exceeds size limit", async () => {
      await expect(
        createFile(client, {
          filename: "huge.vtt",
          type: "caption",
          byte_size: 1024 * 1024 * 2 + 1,
        }),
      ).rejects.toThrowError(/exceeds limit/);
    });
  });

  describe("getFileDetail", () => {
    test("Returns file detail with tracks for video", async () => {
      server.use(
        http.get("http://localhost/api/v1/files/test-id", () =>
          HttpResponse.json(
            {
              id: "test-id",
              filename: "test.mp4",
              type: "video",
              status: "ready",
              byte_size: 1024,
              md5: "abc123",
              next_byte: 1024,
              tracks: [
                {
                  track_id: 1,
                  type: "audio",
                  codec_name: "aac",
                  duration_ms: 5000,
                  byte_size: 512,
                },
              ],
            },
            { status: 200 },
          ),
        ),
      );

      const result = await getFileDetail(client, "test-id");
      expect(result.id).toBe("test-id");
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks![0]!.type).toBe("audio");
    });

    test("Throws when file not found", async () => {
      server.use(
        http.get("http://localhost/api/v1/files/missing-id", () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      await expect(getFileDetail(client, "missing-id")).rejects.toThrowError(
        "File not found: missing-id",
      );
    });

    test("Throws on server error", async () => {
      server.use(
        http.get("http://localhost/api/v1/files/test-id", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(getFileDetail(client, "test-id")).rejects.toThrowError(
        "Failed to get file detail 500 Internal Server Error",
      );
    });
  });

  describe("lookupFileByMd5", () => {
    test("Returns file when found", async () => {
      server.use(
        http.get("http://localhost/api/v1/files/md5/abc123", () =>
          HttpResponse.json(
            {
              id: "test-id",
              filename: "test.mp4",
              type: "video",
              status: "ready",
              byte_size: 1024,
              md5: "abc123",
              next_byte: 1024,
            },
            { status: 200 },
          ),
        ),
      );

      const result = await lookupFileByMd5(client, "abc123");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("test-id");
      expect(result!.md5).toBe("abc123");
    });

    test("Returns null when file not found", async () => {
      server.use(
        http.get("http://localhost/api/v1/files/md5/missing-md5", () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const result = await lookupFileByMd5(client, "missing-md5");
      expect(result).toBeNull();
    });

    test("Throws on server error", async () => {
      server.use(
        http.get("http://localhost/api/v1/files/md5/abc123", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(lookupFileByMd5(client, "abc123")).rejects.toThrowError(
        "Failed to lookup file by md5 abc123 500 Internal Server Error",
      );
    });
  });

  describe("deleteFile", () => {
    test("Deletes a file", async () => {
      server.use(
        http.post("http://localhost/api/v1/files/test-id/delete", () =>
          HttpResponse.json({ success: true }, { status: 200 }),
        ),
      );

      const result = await deleteFile(client, "test-id");
      expect(result).toEqual({ success: true });
    });

    test("Throws on server error", async () => {
      server.use(
        http.post("http://localhost/api/v1/files/test-id/delete", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(deleteFile(client, "test-id")).rejects.toThrowError(
        "Failed to delete file test-id 500 Internal Server Error",
      );
    });
  });

  describe("transcribeFile", () => {
    test("Starts transcription", async () => {
      server.use(
        http.post("http://localhost/api/v1/files/test-id/transcribe", () =>
          HttpResponse.json(
            {
              id: "tx-id",
              file_id: "test-id",
              track_id: 1,
            },
            { status: 200 },
          ),
        ),
      );

      const result = await transcribeFile(client, "test-id");
      expect(result.id).toBe("tx-id");
      expect(result.file_id).toBe("test-id");
    });

    test("Throws on server error", async () => {
      server.use(
        http.post("http://localhost/api/v1/files/test-id/transcribe", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(transcribeFile(client, "test-id")).rejects.toThrowError(
        "Failed to transcribe file test-id 500 Internal Server Error",
      );
    });
  });

  describe("getFileTranscription", () => {
    test("Returns transcription when found", async () => {
      server.use(
        http.get("http://localhost/api/v1/files/test-id/transcription", () =>
          HttpResponse.json(
            {
              id: "tx-id",
              work_slice_ms: 4000,
              status: "completed",
              completed_at: "2025-01-01T00:00:00Z",
              failed_at: null,
            },
            { status: 200 },
          ),
        ),
      );

      const result = await getFileTranscription(client, "test-id");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("tx-id");
      expect(result!.status).toBe("completed");
    });

    test("Returns null when no transcription found", async () => {
      server.use(
        http.get("http://localhost/api/v1/files/test-id/transcription", () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const result = await getFileTranscription(client, "test-id");
      expect(result).toBeNull();
    });

    test("Throws on server error", async () => {
      server.use(
        http.get("http://localhost/api/v1/files/test-id/transcription", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(getFileTranscription(client, "test-id")).rejects.toThrowError(
        "Failed to get file transcription test-id 500 Internal Server Error",
      );
    });
  });
});
