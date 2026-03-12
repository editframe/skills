// @vitest-environment node

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  FramegenEngine,
  VideoRenderOptions,
} from "./engines/FramegenEngine";
import { SegmentEncoder } from "./SegmentEncoder.server";
import * as logging from "@/logging";

// Mock dependencies
vi.mock("@/logging");
vi.mock("@/tracing", () => ({
  WithSpan:
    () =>
    (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
  WithRootSpan:
    () =>
    (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
  WithSyncSpan:
    () =>
    (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
  executeSpan: vi.fn(async (_name: string, fn: (span: any) => Promise<any>) => {
    return fn({
      setAttribute: vi.fn(),
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
      recordException: vi.fn(),
      end: vi.fn(),
    });
  }),
  executeRootSpan: vi.fn(
    async (_name: string, fn: (span: any) => Promise<any>) => {
      return fn({
        setAttribute: vi.fn(),
        setAttributes: vi.fn(),
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
      });
    },
  ),
  executeSpanSync: vi.fn((_name: string, fn: (span: any) => any) => {
    return fn({
      setAttribute: vi.fn(),
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
      recordException: vi.fn(),
      end: vi.fn(),
    });
  }),
  setSpanAttributes: vi.fn(),
  setDottedObjectAttributes: vi.fn(),
}));

vi.mock("@/util/raceTimeout", () => ({
  raceTimeout: vi
    .fn()
    .mockImplementation(
      async (timeoutMs: number, message: string, promise: Promise<any>) => {
        return promise;
      },
    ),
}));

// Minimal test engine for integration testing
class TestFramegenEngine implements FramegenEngine {
  public isBitmapEngine = true;
  private errorHandler?: (error: Error) => void;

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  async initialize(_renderOptions: VideoRenderOptions): Promise<void> {
    // Minimal initialization
  }

  async beginFrame(
    _frameNumber: number,
    _isLast: boolean,
  ): Promise<ArrayBuffer> {
    // Return minimal audio samples
    return Buffer.alloc(1024 * 8); // 1024 samples, 32-bit float stereo
  }

  async captureFrame(_frameNumber: number, _fps: number): Promise<ArrayBuffer> {
    // Return minimal video frame data
    return Buffer.alloc(480 * 270 * 4); // Small RGBA frame
  }
}

const createTestRenderOptions = (): VideoRenderOptions => ({
  mode: "canvas",
  strategy: "v1",
  showFrameBox: false,
  durationMs: 200,
  fetchHost: "http://localhost:3000",
  encoderOptions: {
    sequenceNumber: 0,
    keyframeIntervalMs: 200,
    toMs: 200,
    fromMs: 0,
    shouldPadStart: false,
    shouldPadEnd: true,
    alignedFromUs: 0,
    alignedToUs: 200000,
    isInitSegment: false,
    video: {
      width: 480,
      height: 270,
      framerate: 15,
      codec: "avc1.640029",
      bitrate: 250000,
    },
    audio: {
      sampleRate: 48000,
      codec: "mp4a.40.2",
      numberOfChannels: 2,
      bitrate: 128000,
    },
  },
});

describe("SegmentEncoder RPC Keepalive Integration", () => {
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      child: vi.fn().mockReturnThis(),
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };
    vi.mocked(logging.makeLogger).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("can use events to trigger keepalive signals during rendering", async () => {
    const engine = new TestFramegenEngine();
    const renderOptions = createTestRenderOptions();
    const abortController = new AbortController();

    const encoder = new SegmentEncoder({
      renderId: "test-render-id",
      renderOptions,
      engine,
      abortSignal: abortController.signal,
    });

    // Mock RPC context
    const mockCtx = {
      sendKeepalive: vi.fn(),
    };

    // Set up event handlers similar to ElectronRPCServer
    const frameRenderedHandler = () => {
      mockCtx.sendKeepalive();
    };

    const encodingStartedHandler = () => {
      mockCtx.sendKeepalive();
    };

    encoder.on("frameRendered", frameRenderedHandler);
    encoder.on("encodingStarted", encodingStartedHandler);

    try {
      await encoder.generateStandaloneSegment();

      // Should have called sendKeepalive at least once for encoding started
      expect(mockCtx.sendKeepalive).toHaveBeenCalled();

      // Should have called sendKeepalive for each frame
      const frameRenderedCalls = mockCtx.sendKeepalive.mock.calls.length - 1; // Subtract 1 for encodingStarted
      expect(frameRenderedCalls).toBeGreaterThan(0);
      expect(frameRenderedCalls).toBe(encoder.totalFrameCount);
    } finally {
      encoder.off("frameRendered", frameRenderedHandler);
      encoder.off("encodingStarted", encodingStartedHandler);
    }
  }, 10000);

  test("event handlers can be safely removed", async () => {
    const engine = new TestFramegenEngine();
    const renderOptions = createTestRenderOptions();
    const abortController = new AbortController();

    const encoder = new SegmentEncoder({
      renderId: "test-render-id",
      renderOptions,
      engine,
      abortSignal: abortController.signal,
    });

    const mockCtx = {
      sendKeepalive: vi.fn(),
    };

    const frameRenderedHandler = () => {
      mockCtx.sendKeepalive();
    };

    // Add and immediately remove handler
    encoder.on("frameRendered", frameRenderedHandler);
    encoder.off("frameRendered", frameRenderedHandler);

    await encoder.generateStandaloneSegment();

    // Should not have called sendKeepalive since handler was removed
    expect(mockCtx.sendKeepalive).not.toHaveBeenCalled();
  }, 10000);

  test("multiple keepalive signals sent for longer renders", async () => {
    const engine = new TestFramegenEngine();
    const renderOptions = createTestRenderOptions();
    // Longer duration to get more frames
    renderOptions.durationMs = 1000;
    renderOptions.encoderOptions.toMs = 1000;
    renderOptions.encoderOptions.alignedToUs = 1000000;

    const abortController = new AbortController();

    const encoder = new SegmentEncoder({
      renderId: "test-render-id",
      renderOptions,
      engine,
      abortSignal: abortController.signal,
    });

    const keepaliveSignals: string[] = [];
    const mockCtx = {
      sendKeepalive: vi.fn().mockImplementation(() => {
        keepaliveSignals.push(`keepalive-${Date.now()}`);
      }),
    };

    encoder.on("frameRendered", () => mockCtx.sendKeepalive());
    encoder.on("encodingStarted", () => mockCtx.sendKeepalive());

    try {
      await encoder.generateStandaloneSegment();

      // Should have multiple keepalive signals (1 for start + 1 per frame)
      expect(keepaliveSignals.length).toBeGreaterThan(5);
      expect(keepaliveSignals.length).toBe(encoder.totalFrameCount + 1); // +1 for encodingStarted
    } finally {
      encoder.removeAllListeners();
    }
  }, 15000);
});
