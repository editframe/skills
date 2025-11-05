import { test, vi, expect, type Mock, describe } from "vitest";
import {
  Video2TranscriptionController,
  type Video2TranscriptionControllerOptions,
} from "./Video2TranscriptionController.server";
import type { PersistentStorage } from "./storageProvider.server";

import { HttpResponse, http } from "msw";
import { useMSW } from "TEST/util/useMSW";

describe("Video2TranscriptionController", () => {
  const server = useMSW();

  const MockStorageProvider = vi.fn(
    () =>
      ({
        deletePath: vi.fn(),
        pathExists: vi.fn(),
        createReadStream: vi.fn(),
        createWriteStream: vi.fn(),
        mergePaths: vi.fn(),
        serveFile: vi.fn(),
        serveVideo: vi.fn(),
        createResumableWriteStream: vi.fn(),
        writeFile: vi.fn(),
        createResumableUploadURI: vi.fn(),
        getLength: vi.fn(),
      }) satisfies PersistentStorage,
  );

  const makeController = (
    options: Partial<
      Video2TranscriptionControllerOptions & { fragmentCount?: number }
    > = {},
  ) => {
    const storageProvider = MockStorageProvider();
    const controller = new Video2TranscriptionController(
      Object.assign(
        {
          id: "test-id",
          md5: "test-md5",
          org_id: "test-org_id",
          creator_id: "test-creator_id",
          duration_ms: 1000,
          work_slice_ms: 100,
          abortController: new AbortController(),
          isLastRetry: false,
          storageProvider,
          retryMinTimeout: 100,
          concurrencyMax: 1,
          globalWorkSlotCount: 1,
          claimLoopIntervalMs: 10,
        },
        options,
      ),
    );

    const fragmentCount = options.fragmentCount ?? 4;

    const fragmentSequenceNumbers = Array.from(
      { length: fragmentCount },
      (_, i) => i,
    );

    const mocks = {
      markAsTranscribing: vi.fn().mockResolvedValue(undefined),
      recordFragmentAttempt: vi.fn().mockResolvedValue(undefined),
      markFragmentAsComplete: vi.fn().mockResolvedValue(undefined),
      markAsComplete: vi.fn().mockResolvedValue(undefined),
      markAsFailed: vi.fn().mockResolvedValue(undefined),
      markFragmentAsFailed: vi.fn().mockResolvedValue(undefined),
      selectSequenceNumbers: vi.fn(() =>
        Promise.resolve({
          incompleteSequenceNumbers: fragmentSequenceNumbers.slice(),
          allSequenceNumbers: fragmentSequenceNumbers.slice(),
        }),
      ),
    };

    Object.assign(controller, mocks);

    return [controller, mocks, storageProvider] as const;
  };

  test("Transcribes on the happy path", async () => {
    const [controller, mocks, _storageProvider] = makeController();

    server.use(
      http.get(
        "http://transcribe:3000/_/transcriptions/test-id/fragment/*",
        () => {
          return HttpResponse.json({});
        },
      ),
    );

    await expect(controller.transcribe()).resolves.toBe(undefined);

    expect((controller.markAsTranscribing as Mock).mock.calls).toEqual([
      ["test-id"],
    ]);

    expect(mocks.recordFragmentAttempt.mock.calls).toEqual([
      ["test-id", 0, 1],
      ["test-id", 1, 1],
      ["test-id", 2, 1],
      ["test-id", 3, 1],
    ]);

    expect(mocks.markFragmentAsComplete.mock.calls).toEqual([
      ["test-id", 0],
      ["test-id", 1],
      ["test-id", 2],
      ["test-id", 3],
    ]);

    expect(mocks.markAsComplete.mock.calls).toEqual([["test-id"]]);
  });

  test("Transcribes on the happy path with retries for server error", async () => {
    const [controller, mocks, _storageProvider] = makeController();

    server.use(
      http.get(
        "http://transcribe:3000/_/transcriptions/test-id/fragment/2",
        () => HttpResponse.json({}, { status: 500 }),
        { once: true },
      ),
      http.get(
        "http://transcribe:3000/_/transcriptions/test-id/fragment/*",
        () => HttpResponse.json({}),
      ),
    );

    await expect(controller.transcribe()).resolves.toBe(undefined);

    expect((controller.markAsTranscribing as Mock).mock.calls).toEqual([
      ["test-id"],
    ]);

    expect(mocks.recordFragmentAttempt.mock.calls).toEqual([
      ["test-id", 0, 1],
      ["test-id", 1, 1],
      ["test-id", 2, 1],
      ["test-id", 2, 2],
      ["test-id", 3, 1],
    ]);

    expect(mocks.markFragmentAsComplete.mock.calls).toEqual([
      ["test-id", 0],
      ["test-id", 1],
      ["test-id", 2],
      ["test-id", 3],
    ]);

    expect(mocks.markAsComplete.mock.calls).toEqual([["test-id"]]);
  });

  test("Transcribes on the happy path with retries for load shedding", async () => {
    const [controller, mocks, _storageProvider] = makeController();

    server.use(
      http.get(
        "http://transcribe:3000/_/transcriptions/test-id/fragment/2",
        () => HttpResponse.json({}, { status: 429 }),
        { once: true },
      ),
      http.get(
        "http://transcribe:3000/_/transcriptions/test-id/fragment/*",
        () => HttpResponse.json({}),
      ),
    );

    await expect(controller.transcribe()).resolves.toBe(undefined);

    expect((controller.markAsTranscribing as Mock).mock.calls).toEqual([
      ["test-id"],
    ]);

    expect(mocks.recordFragmentAttempt.mock.calls).toEqual([
      ["test-id", 0, 1],
      ["test-id", 1, 1],
      ["test-id", 2, 1],
      ["test-id", 2, 2],
      ["test-id", 3, 1],
    ]);

    expect(mocks.markFragmentAsComplete.mock.calls).toEqual([
      ["test-id", 0],
      ["test-id", 1],
      ["test-id", 2],
      ["test-id", 3],
    ]);

    expect(mocks.markAsComplete.mock.calls).toEqual([["test-id"]]);
  });

  test("Cancels the render if any fragment fails", async () => {
    const [controller, mocks, _storageProvider] = makeController();

    server.use(
      http.get(
        "http://transcribe:3000/_/transcriptions/test-id/fragment/*",
        () => HttpResponse.json({}, { status: 500 }),
      ),
    );

    await expect(controller.transcribe()).rejects.toThrow("Failed permanently");

    expect((controller.markAsTranscribing as Mock).mock.calls).toEqual([
      ["test-id"],
    ]);

    expect(mocks.recordFragmentAttempt.mock.calls).toEqual([
      ["test-id", 0, 1],
      ["test-id", 0, 2],
      ["test-id", 0, 3],
    ]);

    expect(mocks.markFragmentAsFailed.mock.calls).toEqual([
      ["test-id", 0, "Server error: 500 Internal Server Error"],
      ["test-id", 0, "Server error: 500 Internal Server Error"],
      ["test-id", 0, "Server error: 500 Internal Server Error"],
    ]);

    expect(mocks.markAsComplete.mock.calls).toEqual([]);
    expect(mocks.markAsFailed.mock.calls).toEqual([]);
  });

  test("Marks render as cancelled if on the last retry", async () => {
    const [controller, mocks, _storageProvider] = makeController({
      isLastRetry: true,
    });

    server.use(
      http.get(
        "http://transcribe:3000/_/transcriptions/test-id/fragment/*",
        () => HttpResponse.json({}, { status: 500 }),
      ),
    );

    await expect(controller.transcribe()).rejects.toThrow("Failed permanently");

    expect(mocks.markAsComplete.mock.calls).toEqual([]);
    expect(mocks.markAsFailed.mock.calls).toEqual([["test-id"]]);
  });

  test("Aborts job once failure limit is reached", async () => {
    const [controller, mocks, _storageProvider] = makeController({
      failureLimit: 1,
      isLastRetry: true,
    });

    server.use(
      http.get(
        "http://transcribe:3000/_/transcriptions/test-id/fragment/*",
        () => HttpResponse.json({}, { status: 500 }),
      ),
    );

    await expect(controller.transcribe()).rejects.toThrow("Failed permanently");

    expect(mocks.recordFragmentAttempt.mock.calls).toEqual([["test-id", 0, 1]]);

    expect(mocks.markFragmentAsFailed.mock.calls).toEqual([
      ["test-id", 0, "Server error: 500 Internal Server Error"],
    ]);

    expect(mocks.markAsFailed.mock.calls).toEqual([["test-id"]]);
  });

  test("Records failure if number of fragments is less than the failure limit, and all fail", async () => {
    const [controller, mocks, _storageProvider] = makeController({
      failureLimit: 3,
      isLastRetry: true,
      fragmentCount: 1,
    });

    server.use(
      http.get(
        "http://transcribe:3000/_/transcriptions/test-id/fragment/*",
        async () => {
          return HttpResponse.json({}, { status: 500 });
        },
      ),
    );

    await expect(controller.transcribe()).rejects.toThrow("Failed permanently");

    expect(mocks.markAsComplete.mock.calls).toEqual([]);
    expect(mocks.markAsFailed.mock.calls).toEqual([["test-id"]]);
    expect(mocks.markFragmentAsFailed.mock.calls).toEqual([
      ["test-id", 0, "Server error: 500 Internal Server Error"],
      ["test-id", 0, "Server error: 500 Internal Server Error"],
      ["test-id", 0, "Server error: 500 Internal Server Error"],
    ]);
  });
});
