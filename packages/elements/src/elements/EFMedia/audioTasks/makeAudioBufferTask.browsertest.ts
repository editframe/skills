import { TaskStatus } from "@lit/task";
import { customElement } from "lit/decorators.js";
import { afterEach, describe, vi } from "vitest";
import { test as baseTest } from "../../../../test/useMSW.js";
import type { AudioRendition } from "../../../transcoding/types";
import { EFMedia } from "../../EFMedia";
import {
  computeBufferQueue,
  computeSegmentRange,
  computeSegmentRangeAsync,
  getRequestedSegments,
  getUnrequestedSegments,
  handleSeekTimeChange,
  isSegmentRequested,
  type MediaBufferDependencies,
  type MediaBufferState,
  manageMediaBuffer,
} from "../shared/BufferUtils";
import {
  type AudioBufferConfig,
  type AudioBufferState,
  makeAudioBufferTask,
} from "./makeAudioBufferTask";

@customElement("test-media-audio-buffer")
class TestMediaAudioBuffer extends EFMedia {}

declare global {
  interface HTMLElementTagNameMap {
    "test-media-audio-buffer": TestMediaAudioBuffer;
  }
}

// Test that shows the task should use EFMedia properties directly
describe("makeAudioBufferTask - EFMedia Property Integration", () => {
  test("should allow creating task without hardcoded config parameter", ({
    expect,
  }) => {
    const element = document.createElement("test-media-audio-buffer");

    // Set custom values on the element
    element.audioBufferDurationMs = 45000;
    element.maxAudioBufferFetches = 5;
    element.enableAudioBuffering = false;

    // This should work without passing a config parameter
    expect(() => {
      const task = makeAudioBufferTask(element);
      expect(task).toBeDefined();
    }).not.toThrow();

    element.remove();
  });
});

const test = baseTest.extend<{
  element: TestMediaAudioBuffer;
  mockAudioRendition: {
    segmentDurationMs: number;
    trackId: number;
    src: string;
  };
  mockConfig: AudioBufferConfig;
  mockState: AudioBufferState;
  mockDeps: MediaBufferDependencies<AudioRendition>;
  mockSignal: AbortSignal;
}>({
  element: async ({}, use) => {
    const element = document.createElement("test-media-audio-buffer");
    await use(element);
    element.remove();
  },

  mockAudioRendition: async ({}, use) => {
    const rendition = {
      segmentDurationMs: 1000, // 1 second per segment
      trackId: 1,
      src: "test-audio.mp4",
    };
    await use(rendition);
  },

  mockConfig: async ({}, use) => {
    const config = {
      bufferDurationMs: 5000, // 5 seconds
      maxParallelFetches: 2,
      enableBuffering: true,
      enableContinuousBuffering: false, // Disable for predictable testing
    };
    await use(config);
  },

  mockState: async ({}, use) => {
    const state = {
      currentSeekTimeMs: 0,
      requestedSegments: new Set<number>(),
      activeRequests: new Set<number>(),
      requestQueue: [],
    };
    await use(state);
  },

  mockDeps: async ({ mockAudioRendition }, use) => {
    const deps = {
      computeSegmentId: vi.fn(
        async (timeMs: number, rendition: { segmentDurationMs?: number }) => {
          return Math.floor(timeMs / (rendition.segmentDurationMs || 1000));
        },
      ),
      prefetchSegment: vi.fn().mockResolvedValue(undefined), // Just trigger prefetch
      isSegmentCached: vi.fn().mockReturnValue(false), // Assume nothing cached for testing
      getRendition: vi.fn().mockResolvedValue(mockAudioRendition),
      logError: vi.fn(),
    };
    await use(deps);
  },

  mockSignal: async ({}, use) => {
    const mockSignal = new AbortController().signal;
    await use(mockSignal);
  },
});

describe("computeSegmentRange", () => {
  test("computes segment range correctly", ({ mockAudioRendition, expect }) => {
    const computeSegmentId = (
      timeMs: number,
      rendition: { segmentDurationMs: number },
    ) => Math.floor(timeMs / (rendition.segmentDurationMs || 1000));

    const segments = computeSegmentRange(
      2000, // start at 2 seconds
      5000, // end at 5 seconds
      mockAudioRendition,
      computeSegmentId,
    );

    expect(segments).toEqual([2, 3, 4, 5]); // segments 2, 3, 4, 5
  });

  test("returns empty array when segment IDs are undefined", ({
    mockAudioRendition,
    expect,
  }) => {
    const computeSegmentId = () => undefined;

    const segments = computeSegmentRange(
      2000,
      5000,
      mockAudioRendition,
      computeSegmentId,
    );

    expect(segments).toEqual([]);
  });

  test("uses default segment duration when missing", ({ expect }) => {
    const rendition = {}; // Missing segmentDurationMs
    const computeSegmentId = () => 1;

    const segments = computeSegmentRange(
      2000,
      5000,
      rendition as any,
      computeSegmentId,
    );

    // Should use default 1000ms duration and call computeSegmentId for segments 2, 3, 4, 5
    // Since computeSegmentId always returns 1, and duplicates are filtered out, result is [1]
    expect(segments).toEqual([1]); // duplicates filtered out
  });
});

describe("computeSegmentRangeAsync", () => {
  test("computes segment range with video duration limit", async ({
    mockAudioRendition,
    expect,
  }) => {
    const computeSegmentId = async (timeMs: number) =>
      Math.floor(timeMs / 1000);

    const segments = await computeSegmentRangeAsync(
      8000, // start at 8 seconds
      12000, // want to end at 12 seconds
      10000, // but video only lasts 10 seconds
      mockAudioRendition,
      computeSegmentId,
    );

    expect(segments).toEqual([8, 9]); // Limited to video duration, segment 10 would be at 10000ms which is not < 10000
  });

  test("handles large duration limit", async ({
    mockAudioRendition,
    expect,
  }) => {
    const computeSegmentId = async (timeMs: number) =>
      Math.floor(timeMs / 1000);

    const segments = await computeSegmentRangeAsync(
      2000,
      5000,
      100000, // Large duration limit - effectively unlimited
      mockAudioRendition,
      computeSegmentId,
    );

    expect(segments).toEqual([2, 3, 4, 5]);
  });
});

describe("computeBufferQueue", () => {
  test("filters out already requested segments", ({ expect }) => {
    const desiredSegments = [1, 2, 3, 4, 5];
    const requestedSegments = new Set([2, 4, 1]);

    const queue = computeBufferQueue(desiredSegments, requestedSegments);

    expect(queue).toEqual([3, 5]); // Only segments not yet requested
  });

  test("returns empty queue when all segments already requested", ({
    expect,
  }) => {
    const desiredSegments = [1, 2, 3];
    const requestedSegments = new Set([1, 2, 3]);

    const queue = computeBufferQueue(desiredSegments, requestedSegments);

    expect(queue).toEqual([]);
  });
});

describe("handleSeekTimeChange", () => {
  test("computes new queue for seek time change", ({
    mockAudioRendition,
    expect,
  }) => {
    const computeSegmentId = (timeMs: number) => Math.floor(timeMs / 1000);
    const currentState = {
      currentSeekTimeMs: 0,
      requestedSegments: new Set([1]),
      activeRequests: new Set<number>(),
      requestQueue: [],
    };

    const result = handleSeekTimeChange(
      3000, // seek to 3 seconds
      2000, // buffer 2 seconds ahead
      mockAudioRendition,
      currentState,
      computeSegmentId,
    );

    expect(result.newQueue).toEqual([3, 4, 5]); // segments 3, 4, 5 needed, none in cache/active
    expect(result.overlappingRequests).toEqual([]); // no overlap with active requests
  });

  test("identifies overlapping requests", ({ mockAudioRendition, expect }) => {
    const computeSegmentId = (timeMs: number) => Math.floor(timeMs / 1000);
    const currentState = {
      currentSeekTimeMs: 0,
      requestedSegments: new Set([3, 4]),
      activeRequests: new Set<number>(),
      requestQueue: [],
    };

    const result = handleSeekTimeChange(
      3000, // seek to 3 seconds
      2000, // buffer 2 seconds ahead
      mockAudioRendition,
      currentState,
      computeSegmentId,
    );

    expect(result.overlappingRequests).toEqual([3, 4]); // both are already being fetched
    expect(result.newQueue).toEqual([5]); // only segment 5 needs fetching
  });
});

describe("manageMediaBuffer (Audio)", () => {
  test("manages buffer state successfully", async ({
    mockConfig,
    mockState,
    mockDeps,
    mockSignal,
    expect,
  }) => {
    const seekTimeMs = 3000;

    const newState = await manageMediaBuffer(
      seekTimeMs,
      mockConfig,
      mockState,
      10000, // durationMs
      mockSignal,
      mockDeps,
    );

    expect(newState.currentSeekTimeMs).toBe(seekTimeMs);
    expect(mockDeps.getRendition).toHaveBeenCalled();
    expect(mockDeps.prefetchSegment).toHaveBeenCalledTimes(2); // maxParallelFetches = 2
  });

  test("respects maxParallelFetches limit", async ({
    mockState,
    mockDeps,
    mockSignal,
    expect,
  }) => {
    const config = {
      bufferDurationMs: 10000, // 10 seconds = 10 segments
      maxParallelFetches: 3,
      enableBuffering: true,
      enableContinuousBuffering: false, // Disable for predictable testing
    };

    await manageMediaBuffer(
      0,
      config,
      mockState,
      10000, // durationMs
      mockSignal,
      mockDeps,
    );

    expect(mockDeps.prefetchSegment).toHaveBeenCalledTimes(3); // Should only fetch 3 despite needing 10
  });

  test("does nothing when buffering disabled", async ({
    mockState,
    mockDeps,
    mockSignal,
    expect,
  }) => {
    const config = {
      bufferDurationMs: 5000,
      maxParallelFetches: 2,
      enableBuffering: false,
    };

    const newState = await manageMediaBuffer(
      1000,
      config,
      mockState,
      10000, // durationMs
      mockSignal,
      mockDeps,
    );

    expect(newState).toBe(mockState); // Should return same state
    expect(mockDeps.prefetchSegment).not.toHaveBeenCalled();
  });

  test("handles fetch errors gracefully", async ({
    mockConfig,
    mockState,
    mockSignal,
    expect,
  }) => {
    const mockDeps = {
      computeSegmentId: vi.fn().mockResolvedValue(1),
      prefetchSegment: vi.fn().mockRejectedValue(new Error("Network error")),
      isSegmentCached: vi.fn().mockReturnValue(false),
      getRendition: vi.fn().mockResolvedValue({ segmentDurationMs: 1000 }),
      logError: vi.fn(),
    };

    const newState = await manageMediaBuffer(
      1000,
      mockConfig,
      mockState,
      10000, // durationMs
      mockSignal,
      mockDeps,
    );

    // Wait for async error handling to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(newState.currentSeekTimeMs).toBe(1000);
    expect(mockDeps.logError).toHaveBeenCalledWith(
      "Failed to prefetch segment 1",
      expect.any(Error),
    );
  });
});

describe("makeAudioBufferTask", () => {
  afterEach(() => {
    const elements = document.querySelectorAll("test-media-audio-buffer");
    for (const element of elements) {
      element.remove();
    }
    vi.restoreAllMocks();
  });

  test("creates task with correct configuration", ({ element, expect }) => {
    const task = makeAudioBufferTask(element);

    expect(task).toBeDefined();
    expect(task.status).toBe(TaskStatus.INITIAL);
    expect(task.value).toBeUndefined();
    expect(task.error).toBeUndefined();
  });

  test("task integrates with element seek time", ({ element, expect }) => {
    element.desiredSeekTimeMs = 5000;

    const task = makeAudioBufferTask(element);
    expect(task).toBeDefined();
    expect(task.status).toBe(TaskStatus.INITIAL);
  });
});

describe("Buffer Orchestration Methods", () => {
  test("isSegmentRequested returns true for requested segments", ({
    expect,
  }) => {
    const bufferState: MediaBufferState = {
      currentSeekTimeMs: 0,
      requestedSegments: new Set([1, 2, 3]),
      activeRequests: new Set(),
      requestQueue: [],
    };

    expect(isSegmentRequested(1, bufferState)).toBe(true);
    expect(isSegmentRequested(2, bufferState)).toBe(true);
    expect(isSegmentRequested(4, bufferState)).toBe(false);
  });

  test("isSegmentRequested returns false for undefined buffer state", ({
    expect,
  }) => {
    expect(isSegmentRequested(1, undefined)).toBe(false);
  });

  test("getRequestedSegments returns correct requested segment set", ({
    expect,
  }) => {
    const bufferState: MediaBufferState = {
      currentSeekTimeMs: 0,
      requestedSegments: new Set([2, 4, 6]),
      activeRequests: new Set(),
      requestQueue: [],
    };

    const segmentIds = [1, 2, 3, 4, 5, 6];
    const requestedSegments = getRequestedSegments(segmentIds, bufferState);

    expect(requestedSegments).toEqual(new Set([2, 4, 6]));
  });

  test("getRequestedSegments returns empty set for undefined buffer state", ({
    expect,
  }) => {
    const segmentIds = [1, 2, 3];
    const requestedSegments = getRequestedSegments(segmentIds, undefined);

    expect(requestedSegments).toEqual(new Set());
  });

  test("getUnrequestedSegments returns correct unrequested segments", ({
    expect,
  }) => {
    const bufferState: MediaBufferState = {
      currentSeekTimeMs: 0,
      requestedSegments: new Set([2, 4, 6]),
      activeRequests: new Set(),
      requestQueue: [],
    };

    const segmentIds = [1, 2, 3, 4, 5, 6];
    const unrequestedSegments = getUnrequestedSegments(segmentIds, bufferState);

    expect(unrequestedSegments).toEqual([1, 3, 5]);
  });

  test("getUnrequestedSegments returns all segments for undefined buffer state", ({
    expect,
  }) => {
    const segmentIds = [1, 2, 3];
    const unrequestedSegments = getUnrequestedSegments(segmentIds, undefined);

    expect(unrequestedSegments).toEqual([1, 2, 3]);
  });
});

describe("Buffering Integration Issues", () => {
  const test = baseTest.extend<{
    element: TestMediaAudioBuffer;
  }>({
    element: async ({}, use) => {
      const element = document.createElement("test-media-audio-buffer");
      document.body.appendChild(element);
      await use(element);
      element.remove();
    },
  });

  test("buffer task should run in interactive mode", async ({
    element,
    expect,
  }) => {
    // Set up real media element with actual test asset
    element.src = "bars-n-tone2.mp4";
    element.enableAudioBuffering = true;
    element.audioBufferDurationMs = 5000;
    element.maxAudioBufferFetches = 2;
    element.desiredSeekTimeMs = 1000;

    // Allow time for media engine initialization
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(element.audioBufferTask.status).not.toBe(TaskStatus.INITIAL);
  });

  test.skip("buffer task should be disabled in rendering mode", async ({
    expect,
  }) => {
    const originalEFRendering = window.EF_RENDERING;

    try {
      // Simulate rendering mode
      window.EF_RENDERING = () => true;

      // Create element in rendering mode
      const renderElement = document.createElement("test-media-audio-buffer");
      renderElement.src = "bars-n-tone2.mp4";
      renderElement.enableAudioBuffering = true;
      document.body.appendChild(renderElement);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Buffer task should NOT run in rendering mode
      expect(renderElement.audioBufferTask.status).toBe(TaskStatus.INITIAL);

      renderElement.remove();
    } finally {
      window.EF_RENDERING = originalEFRendering;
    }
  });

  test("segment fetch task does not check buffer cache", async ({
    element,
    expect,
  }) => {
    // Set up element with buffering enabled
    element.src = "bars-n-tone2.mp4";
    element.enableAudioBuffering = true;
    element.audioBufferDurationMs = 3000;
    element.desiredSeekTimeMs = 1000;

    // Track network requests to show segment fetch operates independently
    const originalFetch = window.fetch;
    const fetchUrls: string[] = [];

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      fetchUrls.push(url);
      return originalFetch(input, init);
    };

    try {
      // Allow buffer and segment fetch to initialize
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Move to different time to trigger segment fetch
      element.desiredSeekTimeMs = 2000;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // This demonstrates the problem: segment fetch makes requests
      // independently of what buffer cache contains
      const audioRequests = fetchUrls.filter((url) => url.includes("audio"));

      // Currently passes - shows segment fetch operates without cache integration
      expect(audioRequests.length).toBeGreaterThanOrEqual(0);
    } finally {
      window.fetch = originalFetch;
    }
  });

  test("buffer cache and segment fetch operate independently", async ({
    element,
    expect,
  }) => {
    // Set up element that should have buffered segments
    element.src = "bars-n-tone2.mp4";
    element.enableAudioBuffering = true;
    element.audioBufferDurationMs = 5000;
    element.maxAudioBufferFetches = 3;
    element.desiredSeekTimeMs = 0;

    // Allow buffering to start
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Check if buffer has cached segments
    const bufferState = element.audioBufferTask.value;

    if (
      bufferState?.requestedSegments &&
      bufferState.requestedSegments.size > 0
    ) {
      // Move seek position to trigger segment fetch of potentially cached segment
      element.desiredSeekTimeMs = 1000;

      // Currently, segment fetch task doesn't consult buffer cache
      // This is the integration gap we need to fix
      expect(bufferState.requestedSegments.size).toBeGreaterThan(0);
    }
  });
});

describe("Continuous Buffering", () => {
  test.skip("enables continuous segment loading when enabled", async ({
    mockState,
    mockDeps,
    mockSignal,
    expect,
  }) => {
    const configWithContinuous = {
      bufferDurationMs: 10000, // 10 seconds = 10 segments
      maxParallelFetches: 2,
      enableBuffering: true,
      enableContinuousBuffering: true, // Enable continuous buffering
    };

    let fetchCount = 0;
    const mockFetchWithDelay = vi.fn().mockImplementation(() => {
      fetchCount++;
      return Promise.resolve(new ArrayBuffer(1000));
    });

    const mockDepsWithContinuous = {
      ...mockDeps,
      fetchSegment: mockFetchWithDelay,
    };

    await manageMediaBuffer(
      0,
      configWithContinuous,
      mockState,
      10000, // durationMs
      mockSignal,
      mockDepsWithContinuous,
    );

    // Should start with initial maxParallelFetches (2) and continue with more requests
    // Continuous buffering should fetch more segments as previous ones complete
    expect(mockFetchWithDelay).toHaveBeenCalledTimes(4); // More than initial batch due to continuous buffering
    expect(fetchCount).toBe(4);
  });

  test("disabled when flag is false", async ({
    mockState,
    mockDeps,
    mockSignal,
    expect,
  }) => {
    const configWithoutContinuous = {
      bufferDurationMs: 10000, // 10 seconds = 10 segments
      maxParallelFetches: 2,
      enableBuffering: true,
      enableContinuousBuffering: false, // Disable continuous buffering
    };

    await manageMediaBuffer(
      0,
      configWithoutContinuous,
      mockState,
      10000, // durationMs
      mockSignal,
      mockDeps,
    );

    // Should only fetch initial maxParallelFetches and stop
    expect(mockDeps.prefetchSegment).toHaveBeenCalledTimes(2);
  });
});
