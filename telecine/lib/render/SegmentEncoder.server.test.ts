// @vitest-environment node

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Buffer } from "node:buffer";
import type {
  FramegenEngine,
  VideoRenderOptions,
} from "./engines/FramegenEngine";
import { SegmentEncoder } from "./SegmentEncoder.server";
import * as logging from "@/logging";

// IMPLEMENTATION GUIDELINES:
// - Use real implementations when they don't require external services
// - Use small, fast test videos from test-assets for realistic testing
// - Mock only expensive operations, HTTP calls, and external dependencies
// - Keep SQL/GraphQL mocking as a judgment call based on test goals

// Mock only expensive external dependencies
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

// Mock raceTimeout which uses executeSpan
vi.mock("@/util/raceTimeout", () => ({
  raceTimeout: vi
    .fn()
    .mockImplementation(
      async (timeoutMs: number, message: string, promise: Promise<any>) => {
        return promise; // Just return the promise without timeout logic for tests
      },
    ),
}));

// Simple test implementation of FramegenEngine that uses real data
class TestFramegenEngine implements FramegenEngine {
  public isBitmapEngine = true;
  private errorHandler?: (error: Error) => void;
  private frameWidth = 854;
  private frameHeight = 480;
  private testPattern: Buffer;

  constructor(width = 854, height = 480) {
    this.frameWidth = width;
    this.frameHeight = height;
    // Create a simple test pattern - alternating colors per frame
    this.testPattern = Buffer.alloc(width * height * 4); // RGBA
    for (let i = 0; i < this.testPattern.length; i += 4) {
      this.testPattern[i] = 128; // R
      this.testPattern[i + 1] = 64; // G
      this.testPattern[i + 2] = 192; // B
      this.testPattern[i + 3] = 255; // A
    }
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  async initialize(renderOptions: VideoRenderOptions): Promise<void> {
    // Minimal initialization - just validate options
    if (renderOptions.durationMs <= 0) {
      throw new Error("Invalid duration");
    }
  }

  async beginFrame(
    frameNumber: number,
    isLast: boolean,
  ): Promise<Buffer | ArrayBuffer> {
    // Return simple audio samples - 1024 samples at 48kHz
    const audioSamples = Buffer.alloc(1024 * 8); // 32-bit float stereo (8 bytes per sample pair)
    // Fill with a simple sine wave pattern
    for (let i = 0; i < audioSamples.length; i += 8) {
      const sample =
        Math.sin(((frameNumber * 1024 + i / 8) * 2 * Math.PI * 440) / 48000) *
        0.1;
      audioSamples.writeFloatLE(sample, i); // Left channel
      audioSamples.writeFloatLE(sample, i + 4); // Right channel
    }
    return audioSamples;
  }

  async captureFrame(
    frameNumber: number,
    fps: number,
  ): Promise<Buffer | ArrayBuffer> {
    // Return a simple test pattern that changes based on frame number
    const frame = Buffer.from(this.testPattern);
    // Modify pattern slightly for each frame to ensure it's different
    const offset = frameNumber % 255;
    for (let i = 0; i < frame.length; i += 4) {
      frame[i] = (frame[i] ?? 0 + offset) % 255; // Vary red channel
    }
    return frame;
  }
}

const createTestRenderOptions = (
  overrides: Partial<VideoRenderOptions> = {},
): VideoRenderOptions => ({
  mode: "canvas",
  strategy: "v1",
  showFrameBox: false,
  durationMs: 1000, // Keep short for fast tests
  fetchHost: "http://localhost:3000",
  encoderOptions: {
    sequenceNumber: 0,
    keyframeIntervalMs: 1000,
    toMs: 1000,
    fromMs: 0,
    shouldPadStart: false,
    shouldPadEnd: true,
    alignedFromUs: 0,
    alignedToUs: 1000000,
    isInitSegment: false,
    video: {
      width: 854,
      height: 480,
      framerate: 25, // Match test video framerate
      codec: "avc1.640029",
      bitrate: 1000000, // Lower bitrate for faster encoding
    },
    audio: {
      sampleRate: 48000,
      codec: "mp4a.40.2",
      numberOfChannels: 2,
      bitrate: 128000,
    },
  },
  ...overrides,
});

const createSegmentEncoder = (
  options: {
    renderOptions?: Partial<VideoRenderOptions>;
    engine?: FramegenEngine;
    renderId?: string;
    abortSignal?: AbortSignal;
  } = {},
) => {
  const mockEngine = options.engine ?? new TestFramegenEngine();
  const renderOptions = createTestRenderOptions(options.renderOptions);
  const abortController = new AbortController();

  return new SegmentEncoder({
    renderId: options.renderId ?? "test-render-id",
    renderOptions,
    engine: mockEngine,
    abortSignal: options.abortSignal ?? abortController.signal,
  });
};

describe("SegmentEncoder", () => {
  let mockLogger: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock logger
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

  describe("Constructor and Configuration", () => {
    test("initializes with correct video properties", () => {
      const encoder = createSegmentEncoder({
        renderOptions: {
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            video: {
              width: 1280,
              height: 720,
              framerate: 30,
              codec: "avc1",
              bitrate: 5000000,
            },
          },
        },
      });

      expect(encoder.width).toBe(1280);
      expect(encoder.height).toBe(720);
      expect(encoder.framerate).toBe(30);
    });

    test("calculates segment properties correctly", () => {
      const encoder = createSegmentEncoder({
        renderOptions: {
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            keyframeIntervalMs: 2000,
            toMs: 2000,
            fromMs: 0,
            video: {
              width: 854,
              height: 480,
              framerate: 25,
              codec: "avc1",
              bitrate: 1000000,
            },
          },
        },
      });

      expect(encoder.groupSize).toBe(50); // (2000/1000) * 25
      expect(encoder.segmentDurationMs).toBe(2000);
      expect(encoder.totalFrameCount).toBe(50); // Math.ceil(2000 / (1000/25))
    });

    test("handles minimum frame count edge case", () => {
      const encoder = createSegmentEncoder({
        renderOptions: {
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            toMs: 10,
            fromMs: 0,
          },
        },
      });

      expect(encoder.totalFrameCount).toBe(1);
    });

    test("sets up abort signal and error handling", () => {
      const abortController = new AbortController();
      const mockEngine = new TestFramegenEngine();
      const onErrorSpy = vi.spyOn(mockEngine, "onError");

      createSegmentEncoder({
        engine: mockEngine,
        abortSignal: abortController.signal,
      });

      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("FFmpeg Configuration Generation", () => {
    test("generates correct input arguments for bitmap engine", () => {
      const encoder = createSegmentEncoder();

      expect(encoder.bitmapImageInputArgs).toEqual([
        "-f",
        "rawvideo",
        "-pixel_format",
        "bgra",
        "-video_size",
        "854x480",
      ]);
    });

    test("generates correct input arguments for encoded engine", () => {
      const mockEngine = new TestFramegenEngine();
      mockEngine.isBitmapEngine = false;

      const encoder = createSegmentEncoder({ engine: mockEngine });

      expect(encoder.encodedImageInputArgs).toEqual(["-f", "image2pipe"]);
    });

    test("provides correct audio configuration", () => {
      const encoder = createSegmentEncoder({
        renderOptions: {
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            audio: {
              sampleRate: 44100,
              codec: "aac",
              numberOfChannels: 2,
              bitrate: 256000,
            },
          },
        },
      });

      expect(encoder.audioBitrate).toBe("256000");
      expect(encoder.audioSamplerate).toBe("44100");
    });
  });

  describe("Temporary File Management", () => {
    test("creates unique temporary file paths", async () => {
      const encoder = createSegmentEncoder();
      const paths1 = await encoder.muxerFiles();
      const paths2 = await encoder.muxerFiles();

      // Should create different temp directories
      expect(paths1.videoPath).not.toBe(paths2.videoPath);
      expect(paths1.audioPath).not.toBe(paths2.audioPath);
      expect(paths1.concatPath).not.toBe(paths2.concatPath);

      // Should include render ID
      expect(paths1.videoPath).toContain("test-render-id");
    });

    test("includes sequence number in file names", async () => {
      const encoder = createSegmentEncoder({
        renderOptions: {
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            sequenceNumber: 42,
          },
        },
      });

      const paths = await encoder.muxerFiles();

      expect(paths.videoPath).toContain("n-42-");
      expect(paths.audioPath).toContain("n-42-");
      expect(paths.concatPath).toContain("n-42-");
    });

    test("paths have correct file extensions", async () => {
      const encoder = createSegmentEncoder();
      const paths = await encoder.muxerFiles();

      expect(paths.videoPath).toMatch(/\.v\.mp4$/);
      expect(paths.audioPath).toMatch(/\.a\.aac$/);
      expect(paths.concatPath).toMatch(/\.concat$/);
    });
  });

  describe("Fragment Type Routing", () => {
    test("routes to init segment generation for init segment", async () => {
      const encoder = createSegmentEncoder({
        renderOptions: {
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            isInitSegment: true,
          },
        },
      });

      // Spy on the actual methods
      const generateInitSegmentSpy = vi
        .spyOn(encoder, "generateInitSegment")
        .mockResolvedValue(Buffer.from("init"));
      const generateMediaSegmentSpy = vi
        .spyOn(encoder, "generateMediaSegment")
        .mockResolvedValue(Buffer.from("media"));

      await encoder.generateFragmentBuffer();

      expect(generateInitSegmentSpy).toHaveBeenCalled();
      expect(generateMediaSegmentSpy).not.toHaveBeenCalled();
    });

    test("routes to media segment generation for media segment", async () => {
      const encoder = createSegmentEncoder({
        renderOptions: {
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            isInitSegment: false,
          },
        },
      });

      const generateInitSegmentSpy = vi
        .spyOn(encoder, "generateInitSegment")
        .mockResolvedValue(Buffer.from("init"));
      const generateMediaSegmentSpy = vi
        .spyOn(encoder, "generateMediaSegment")
        .mockResolvedValue(Buffer.from("media"));

      await encoder.generateFragmentBuffer();

      expect(generateInitSegmentSpy).not.toHaveBeenCalled();
      expect(generateMediaSegmentSpy).toHaveBeenCalled();
    });
  });

  describe("Abort Signal Handling", () => {
    test("throws when abort signal is triggered before rendering", () => {
      const abortController = new AbortController();
      abortController.abort();

      const encoder = createSegmentEncoder({
        abortSignal: abortController.signal,
      });

      expect(() => encoder.generateFragmentBuffer()).toThrow();
    });

    test("checks abort signal during rendering process", async () => {
      const abortController = new AbortController();

      // Create engine that aborts mid-operation
      const engine = new TestFramegenEngine();
      const originalCaptureFrame = engine.captureFrame.bind(engine);
      engine.captureFrame = vi
        .fn()
        .mockImplementation(async (frameNumber: number, fps: number) => {
          if (frameNumber > 1) {
            abortController.abort();
          }
          return originalCaptureFrame(frameNumber, fps);
        });

      const encoder = createSegmentEncoder({
        engine,
        abortSignal: abortController.signal,
      });

      // Should throw when abort signal is triggered during frame capture
      await expect(encoder.generateStandaloneSegment()).rejects.toThrow();
    });
  });

  describe("Error Handling", () => {
    test("handles engine initialization errors gracefully", async () => {
      const engine = new TestFramegenEngine();
      engine.initialize = vi
        .fn()
        .mockRejectedValue(new Error("Engine init failed"));

      const encoder = createSegmentEncoder({ engine });

      await expect(encoder.generateStandaloneSegment()).rejects.toThrow(
        "Engine init failed",
      );
    });

    test("handles frame capture errors gracefully", async () => {
      const engine = new TestFramegenEngine();
      engine.captureFrame = vi
        .fn()
        .mockRejectedValue(new Error("Frame capture failed"));

      const encoder = createSegmentEncoder({ engine });

      await expect(encoder.generateStandaloneSegment()).rejects.toThrow(
        "Frame capture failed",
      );
    });

    test("handles invalid render options", async () => {
      const engine = new TestFramegenEngine();

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: { durationMs: -1 },
      });

      await expect(encoder.generateStandaloneSegment()).rejects.toThrow(
        "Invalid duration",
      );
    });
  });

  describe("Fragmented MP4 Metadata Generation", () => {
    test("generates init segment with proper mvex/mehd metadata for duration prediction", async () => {
      const engine = new TestFramegenEngine(854, 480);
      const durationMs = 2000; // 2 second video

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            isInitSegment: true,
            toMs: durationMs,
          },
        },
      });

      const result = await encoder.generateInitSegment();

      expect(result).toBeInstanceOf(Buffer);

      // Parse the result to check for proper metadata boxes
      const ISOBoxer = (await import("codem-isoboxer")).default;
      const isoFile = ISOBoxer.parseBuffer(result);

      // Should have moov box
      const moov = isoFile.fetch("moov");
      expect(moov).toBeDefined();

      // Should have mvex (Movie Extends) box for fragmented MP4
      const mvex = isoFile.fetch("mvex");
      expect(mvex).toBeDefined();
      expect(mvex.type).toBe("mvex");

      // Should NOT have mehd box - working files don't have it
      const mehd = isoFile.fetch("mehd");
      expect(mehd).toBeUndefined();

      // Movie header should have full duration
      const mvhd = isoFile.fetch("mvhd");
      expect(mvhd).toBeDefined();
      const expectedDuration = Math.ceil(
        (durationMs / 1000) * (mvhd?.timescale || 1000),
      );
      expect(mvhd.duration).toBe(expectedDuration);

      // Should have trex (Track Extends) boxes for each track
      const trexBoxes = isoFile.fetchAll("trex");
      expect(trexBoxes.length).toBeGreaterThan(0);

      // Track and media durations should be 0 for fragmented MP4s
      const tkhds = isoFile.fetchAll("tkhd");
      for (const tkhd of tkhds) {
        expect(tkhd.duration).toBe(0);
      }

      const mdhds = isoFile.fetchAll("mdhd");
      for (const mdhd of mdhds) {
        expect(mdhd.duration).toBe(0);
      }

      // Should NOT have edit lists (edts boxes)
      const edts = isoFile.fetchAll("edts");
      expect(edts.length).toBe(0);
    }, 10000);

    test("generates media segments without mvex metadata", async () => {
      const engine = new TestFramegenEngine(854, 480);

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 500,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            sequenceNumber: 1,
            isInitSegment: false,
            toMs: 500,
            fromMs: 0,
          },
        },
      });

      const result = await encoder.generateMediaSegment();

      expect(result).toBeInstanceOf(Buffer);

      // Parse the result
      const ISOBoxer = (await import("codem-isoboxer")).default;
      const isoFile = ISOBoxer.parseBuffer(result);

      // Media segments should NOT have moov, mvex, or mehd
      expect(isoFile.fetch("moov")).toBeUndefined();
      expect(isoFile.fetch("mvex")).toBeUndefined();
      expect(isoFile.fetch("mehd")).toBeUndefined();

      // Should have moof and mdat
      expect(isoFile.fetch("moof")).toBeDefined();
      expect(isoFile.fetch("mdat")).toBeDefined();
    }, 10000);
  });

  describe("Real Video Processing Integration", () => {
    test("can process test video data through real encoder pipeline", async () => {
      // Use a real test engine with actual frame data
      const engine = new TestFramegenEngine(854, 480);

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 500, // Short duration for fast test
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            toMs: 500,
            fromMs: 0,
            video: {
              width: 854,
              height: 480,
              framerate: 25,
              codec: "avc1",
              bitrate: 500000,
            },
          },
        },
      });

      // This uses real DisposableEncoder/DisposableMuxer with real ffmpeg
      const result = await encoder.generateStandaloneSegment();

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(100); // Should have actual video data

      // Verify it's a valid MP4 by checking for ftyp box
      const ftyp = result.subarray(4, 8).toString();
      expect(ftyp).toBe("ftyp");
    }, 10000); // Allow longer timeout for real encoding

    test("generates init segment with correct structure", async () => {
      const engine = new TestFramegenEngine(854, 480);

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 500,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            isInitSegment: true,
            toMs: 500,
          },
        },
      });

      const result = await encoder.generateInitSegment();

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(50);

      // Should contain ftyp and moov boxes but not moof/mdat
      const content = result.toString("hex");
      expect(content).toContain("66747970"); // 'ftyp' in hex
      expect(content).toContain("6d6f6f76"); // 'moov' in hex
      expect(content).not.toContain("6d6f6f66"); // should not contain 'moof'
    }, 10000);

    test("generates media segment with correct sequence numbering", async () => {
      const engine = new TestFramegenEngine(854, 480);

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 500,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            sequenceNumber: 1,
            isInitSegment: false,
            toMs: 500,
            fromMs: 0,
          },
        },
      });

      const result = await encoder.generateMediaSegment();

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(50);

      // Should contain moof but not ftyp/moov
      const content = result.toString("hex");
      expect(content).toContain("6d6f6f66"); // 'moof' in hex
      expect(content).not.toContain("66747970"); // should not contain 'ftyp'
      expect(content).not.toContain("6d6f6f76"); // should not contain 'moov'
    }, 10000);
  });

  describe("Event Emission", () => {
    test("emits frameRendered event after each frame is captured", async () => {
      const engine = new TestFramegenEngine(480, 270);
      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 200,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            toMs: 200,
            video: {
              width: 480,
              height: 270,
              framerate: 15,
              codec: "avc1",
              bitrate: 250000,
            },
          },
        },
      });

      const frameEvents: Array<{ frameNumber: number; totalFrames: number }> =
        [];
      encoder.on("frameRendered", (data) => {
        frameEvents.push(data);
      });

      await encoder.generateStandaloneSegment();

      // Should emit an event for each rendered frame
      expect(frameEvents.length).toBeGreaterThan(0);
      expect(frameEvents.length).toBe(encoder.totalFrameCount);

      // Events should have correct structure
      frameEvents.forEach((event, index) => {
        expect(event.frameNumber).toBe(index);
        expect(event.totalFrames).toBe(encoder.totalFrameCount);
      });
    }, 6000);

    test("emits encodingStarted event when encoding begins", async () => {
      const engine = new TestFramegenEngine(480, 270);
      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 200,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            toMs: 200,
            video: {
              width: 480,
              height: 270,
              framerate: 15,
              codec: "avc1",
              bitrate: 250000,
            },
          },
        },
      });

      const events: string[] = [];
      encoder.on("encodingStarted", () => {
        events.push("encodingStarted");
      });

      await encoder.generateStandaloneSegment();

      expect(events).toContain("encodingStarted");
      expect(events.length).toBe(1); // Should only emit once
    }, 6000);

    test("can remove event listeners", async () => {
      const engine = new TestFramegenEngine(480, 270);
      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 200,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            toMs: 200,
            video: {
              width: 480,
              height: 270,
              framerate: 15,
              codec: "avc1",
              bitrate: 250000,
            },
          },
        },
      });

      const frameEvents: any[] = [];
      const listener = (data: any) => frameEvents.push(data);

      encoder.on("frameRendered", listener);
      encoder.off("frameRendered", listener);

      await encoder.generateStandaloneSegment();

      // Should not receive any events after removing listener
      expect(frameEvents.length).toBe(0);
    }, 6000);
  });

  describe("Stdout Isolation", () => {
    test("generateMediaSegment does not write to console.log (stdout contamination fix)", async () => {
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const engine = new TestFramegenEngine(480, 270);

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 200,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            sequenceNumber: 1,
            isInitSegment: false,
            toMs: 200,
            fromMs: 0,
            video: {
              width: 480,
              height: 270,
              framerate: 15,
              codec: "avc1",
              bitrate: 250000,
            },
          },
        },
      });

      await encoder.generateMediaSegment();

      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    }, 10000);

    test("constructor does not write to console.error when no abort/error occurs", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      createSegmentEncoder();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Performance and Resource Management", () => {
    test("completes encoding within reasonable time", async () => {
      const engine = new TestFramegenEngine(480, 270); // Small resolution

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 200, // Very short
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            toMs: 200,
            video: {
              width: 480,
              height: 270,
              framerate: 15,
              codec: "avc1",
              bitrate: 250000,
            },
          },
        },
      });

      const startTime = performance.now();
      const result = await encoder.generateStandaloneSegment();
      const endTime = performance.now();

      expect(result).toBeInstanceOf(Buffer);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    }, 6000);

    test("logs performance timing information", async () => {
      const engine = new TestFramegenEngine(480, 270);

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 200,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            toMs: 200,
            video: {
              width: 480,
              height: 270,
              framerate: 15,
              codec: "avc1",
              bitrate: 250000,
            },
          },
        },
      });

      await encoder.generateStandaloneSegment();

      // Should log timing information during actual encoding
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          timings: expect.any(Object),
          percentageBreakdown: expect.any(Object),
        }),
        "Timing report",
      );
    }, 6000);
  });

  describe("generateConcatDirective", () => {
    function createTestSegmentEncoderForConcat(
      alignedDurationUs: number,
      segmentDurationMs: number = 500,
    ): SegmentEncoder {
      return createSegmentEncoder({
        renderOptions: {
          durationMs: segmentDurationMs,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            fromMs: 0,
            toMs: segmentDurationMs,
            alignedFromUs: 0,
            alignedToUs: alignedDurationUs,
            sequenceNumber: 1,
            isInitSegment: false,
            shouldPadStart: false,
            shouldPadEnd: false,
            keyframeIntervalMs: 2000,
          },
        },
      });
    }

    test("generates valid concat directive for normal duration segments", () => {
      // 500ms segment (normal case)
      const encoder = createTestSegmentEncoderForConcat(500_000); // 500ms in microseconds

      const result = encoder.generateConcatDirective(
        "/test/audio.aac",
        false,
        false,
      );

      expect(result.inpointUs).toBeLessThan(result.outpointUs);
      expect(result.durationUs).toBeGreaterThan(0);
      expect(result.directive).toContain("file '/test/audio.aac'");
    });

    test("handles very short segments correctly with clamping fix", () => {
      // 11ms segment (previously problematic case, now fixed with clamping)
      const encoder = createTestSegmentEncoderForConcat(11_000); // 11ms in microseconds

      const result = encoder.generateConcatDirective(
        "/test/audio.aac",
        false,
        false,
      );

      // With fix: inpoint is clamped to outpoint, preventing invalid ranges
      expect(result.inpointUs).toBe(result.outpointUs); // Clamped to equal values
      expect(result.inpointUs).toBe(11_000); // Clamped down from ~21333us to 11000us
      expect(result.outpointUs).toBe(11_000); // Original outpoint value
      expect(result.durationUs).toBe(0); // Zero duration but valid range

      // Verify directive contains expected values
      expect(result.directive).toContain("inpoint 11000.0000000000us");
      expect(result.directive).toContain("outpoint 11000.0000000000us");
      expect(result.directive).toContain("duration 0.0000000000us");
    });

    test("handles edge case with exactly one audio frame duration", () => {
      // Exactly 21.33ms (one audio frame) - boundary case where clamping just kicks in
      const encoder = createTestSegmentEncoderForConcat(21_333);

      const result = encoder.generateConcatDirective(
        "/test/audio.aac",
        false,
        false,
      );

      // With clamping: inpoint gets clamped from ~21333.33us down to 21333us
      expect(result.inpointUs).toBe(21_333); // Clamped to outpoint value
      expect(result.outpointUs).toBe(21_333);
      expect(result.durationUs).toBe(0); // Zero duration segment
    });

    test("documents the fix by showing what raw values would have been", () => {
      // This test shows what the problematic values would have been without clamping
      // AUDIO_FRAME_DURATION_US is approximately 21333.33us
      const AUDIO_FRAME_DURATION_US = 21333.333333333332;

      // For an 11ms segment, raw inpoint would be ~21333us but outpoint only 11000us
      const rawInpointUs = AUDIO_FRAME_DURATION_US; // No padding
      const outpointUs = 11_000; // 11ms duration

      // This would create an invalid range before the fix
      expect(rawInpointUs).toBeGreaterThan(outpointUs);
      expect(rawInpointUs - outpointUs).toBeCloseTo(10333.33, 1); // ~10ms invalid overlap

      // The clamping fix prevents this by ensuring inpoint <= outpoint
      const clampedInpointUs = Math.min(rawInpointUs, outpointUs);
      expect(clampedInpointUs).toBe(outpointUs);
      expect(clampedInpointUs).toBe(11_000);
    });

    test("handles padding correctly with sufficient duration", () => {
      // Test with start/end padding using much longer duration to avoid edge cases
      const encoder = createTestSegmentEncoderForConcat(500_000); // 500ms - definitely long enough

      const resultWithPadding = encoder.generateConcatDirective(
        "/test/audio.aac",
        true,
        true,
      );
      const resultWithoutPadding = encoder.generateConcatDirective(
        "/test/audio.aac",
        false,
        false,
      );

      // With sufficient duration, padding behaves as expected
      expect(resultWithoutPadding.inpointUs).toBeCloseTo(21333.33, 1); // ~21.33ms baseline
      expect(resultWithPadding.inpointUs).toBeGreaterThan(
        resultWithoutPadding.inpointUs,
      ); // Start padding adds to inpoint
      expect(resultWithPadding.outpointUs).toBeLessThan(
        resultWithoutPadding.outpointUs,
      ); // End padding reduces outpoint
    });

    test("includes expected format in directive string", () => {
      const encoder = createTestSegmentEncoderForConcat(100_000);

      const result = encoder.generateConcatDirective(
        "/path/to/test.aac",
        false,
        false,
      );

      expect(result.directive).toContain("file '/path/to/test.aac'");
      expect(result.directive).toContain("inpoint");
      expect(result.directive).toContain("outpoint");
      expect(result.directive).toContain("duration");
      expect(result.directive).toContain("us"); // microsecond units
    });
  });

  describe("Frame Pipeline Overlap", () => {
    test("captureFrame(N) completes before beginFrame(N+1) starts", async () => {
      // Safety invariant: beginFrame(N+1) must not start until captureFrame(N) has completed,
      // to avoid DOM state mutation that would break the frame verification strip.
      const captureEndedForFrame: boolean[] = [];
      const beginFrameStartedWithPriorCaptureDone: boolean[] = [];

      const engine = new TestFramegenEngine(480, 270);

      const originalCaptureFrame = engine.captureFrame.bind(engine);
      engine.captureFrame = vi
        .fn()
        .mockImplementation(async (frameNumber: number, fps: number) => {
          const result = await originalCaptureFrame(frameNumber, fps);
          captureEndedForFrame[frameNumber] = true;
          return result;
        });

      const originalBeginFrame = engine.beginFrame.bind(engine);
      engine.beginFrame = vi
        .fn()
        .mockImplementation(async (frameNumber: number, isLast: boolean) => {
          if (frameNumber > 0) {
            beginFrameStartedWithPriorCaptureDone[frameNumber] =
              captureEndedForFrame[frameNumber - 1] === true;
          }
          return originalBeginFrame(frameNumber, isLast);
        });

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 200,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            toMs: 200,
            video: {
              width: 480,
              height: 270,
              framerate: 15,
              codec: "avc1",
              bitrate: 250000,
            },
          },
        },
      });

      await encoder.generateStandaloneSegment();

      expect(encoder.totalFrameCount).toBeGreaterThanOrEqual(3);

      // For every frame N+1, captureFrame(N) must have completed before beginFrame(N+1) starts
      for (let n = 1; n < encoder.totalFrameCount; n++) {
        expect(beginFrameStartedWithPriorCaptureDone[n]).toBe(true);
      }
    }, 10000);

    test("write(N) is in flight while beginFrame(N+1) executes", async () => {
      // Performance invariant: write(N) and beginFrame(N+1) run concurrently.
      // In serial mode: captureFrame(N) → write(N) fully drains → beginFrame(N+1)
      // In pipelined mode: captureFrame(N) → Promise.all([write(N), beginFrame(N+1)])
      //
      // We verify pipelined behavior by making beginFrame(1) slow (setImmediate delay)
      // and checking that write(0) has NOT yet completed (callback not fired) when
      // beginFrame(1) starts. We simulate a slow write by making the write callback
      // deferred via setImmediate too — and check ordering.
      //
      // In serial mode: write(0) fires callback BEFORE beginFrame(1) starts.
      //   → write0Complete=true when beginFrame(1) starts.
      // In pipelined mode: write(0) and beginFrame(1) run in parallel.
      //   → write0Complete=false when beginFrame(1) starts (if write is also deferred).

      let write0Complete = false;
      let write0CompleteWhenBeginFrame1Started = true; // assume serial (guilty) until proven

      const engine = new TestFramegenEngine(480, 270);

      // Defer write(0)'s callback via setImmediate to simulate async drain
      const originalBuildVideoEncoder =
        SegmentEncoder.prototype.buildVideoEncoder;
      SegmentEncoder.prototype.buildVideoEncoder = function (paths: any) {
        const encoder = originalBuildVideoEncoder.call(this, paths);
        const originalWrite = encoder.process.stdin.write.bind(
          encoder.process.stdin,
        );
        let writeCount = 0;
        (encoder.process.stdin as any).write = function (
          chunk: any,
          encoding: any,
          callback: any,
        ) {
          const idx = writeCount++;
          if (idx === 0 && typeof callback === "function") {
            const cb = callback;
            return (originalWrite as any)(chunk, encoding, (err: any) => {
              // Defer the callback to ensure async gap for pipelining to be observable
              setImmediate(() => {
                write0Complete = true;
                cb(err);
              });
            });
          }
          return (originalWrite as any)(chunk, encoding, callback);
        };
        return encoder;
      };

      const originalBeginFrame = engine.beginFrame.bind(engine);
      engine.beginFrame = vi
        .fn()
        .mockImplementation(async (frameNumber: number, isLast: boolean) => {
          if (frameNumber === 1) {
            write0CompleteWhenBeginFrame1Started = write0Complete;
          }
          return originalBeginFrame(frameNumber, isLast);
        });

      const encoder = createSegmentEncoder({
        engine,
        renderOptions: {
          durationMs: 200,
          encoderOptions: {
            ...createTestRenderOptions().encoderOptions,
            toMs: 200,
            video: {
              width: 480,
              height: 270,
              framerate: 15,
              codec: "avc1",
              bitrate: 250000,
            },
          },
        },
      });

      try {
        await encoder.generateStandaloneSegment();
      } finally {
        SegmentEncoder.prototype.buildVideoEncoder = originalBuildVideoEncoder;
      }

      // In pipelined execution: beginFrame(1) starts before the deferred write(0) callback fires,
      // so write0Complete is false when beginFrame(1) starts.
      expect(write0CompleteWhenBeginFrame1Started).toBe(false);
    }, 10000);
  });
});
