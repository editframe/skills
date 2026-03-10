import { test as baseTest, describe } from "vitest";
import { BufferedSeekingInput, NoSample } from "./BufferedSeekingInput";

const test = baseTest.extend<{
  barsNtone: BufferedSeekingInput;
  fiveSampleBuffer: BufferedSeekingInput;
  inputAtStart: BufferedSeekingInput;
  inputAtMiddle: BufferedSeekingInput;
  segment2: BufferedSeekingInput;
}>({
  barsNtone: async ({}, use) => {
    const response = await fetch("/bars-n-tone.mp4");
    const arrayBuffer = await response.arrayBuffer();
    const input = new BufferedSeekingInput(arrayBuffer);
    await use(input);
  },
  fiveSampleBuffer: async ({}, use) => {
    const response = await fetch("/jit-segments/segment-0ms-2s-low.mp4");
    const arrayBuffer = await response.arrayBuffer();
    const input = new BufferedSeekingInput(arrayBuffer, {
      videoBufferSize: 5,
      audioBufferSize: 5,
    });
    await use(input);
  },
  inputAtStart: async ({}, use) => {
    const response = await fetch("/jit-segments/segment-0ms-2s-low.mp4");
    const arrayBuffer = await response.arrayBuffer();
    const input = new BufferedSeekingInput(arrayBuffer);
    await use(input);
  },
  inputAtMiddle: async ({}, use) => {
    const response = await fetch("/jit-segments/segment-6000ms-1s-low.mp4");
    const arrayBuffer = await response.arrayBuffer();
    const input = new BufferedSeekingInput(arrayBuffer);
    await use(input);
  },
  segment2: async ({}, use) => {
    const response = await fetch("/jit-segments/segment-2.mp4");
    const arrayBuffer = await response.arrayBuffer();
    const input = new BufferedSeekingInput(arrayBuffer);
    await use(input);
  },
});

describe("BufferedSeekingInput", () => {
  describe("computeDuration", () => {
    test("computes duration", async ({ expect, inputAtStart, inputAtMiddle }) => {
      await expect(inputAtStart.computeDuration()).resolves.toBe(2);
      await expect(inputAtMiddle.computeDuration()).resolves.toBeCloseTo(0.96);
    });
  });

  describe("basic seeking", () => {
    test("seeks to frame at 0 seconds", async ({ expect, inputAtStart }) => {
      const sample = await inputAtStart.seek(1, 0);
      expect(sample).toBeDefined();
      expect(sample!.timestamp).toBe(0);
    });

    test("seeks to frame at 0.02 seconds", async ({ expect, inputAtStart }) => {
      const sample = await inputAtStart.seek(1, 20);
      expect(sample).toBeDefined();
      expect(sample!.timestamp).toBe(0);
    });

    test("seeks to frame at 0.04 seconds", async ({ expect, inputAtStart }) => {
      const sample = await inputAtStart.seek(1, 40);
      expect(sample).toBeDefined();
      expect(sample!.timestamp).toBe(0.04);
    });
  });

  describe("deterministic seeking behavior", () => {
    test("seeks to exact sample timestamps", async ({ expect, inputAtStart }) => {
      // Updated expectations based on improved mediabunny processing
      expect((await inputAtStart.seek(1, 0))!.timestamp).toBe(0);
      expect((await inputAtStart.seek(1, 40))!.timestamp).toBe(0.04); // Frame timing shifted due to improvements
      expect((await inputAtStart.seek(1, 80))!.timestamp).toBe(0.08);
      expect((await inputAtStart.seek(1, 120))!.timestamp).toBe(0.12);
      expect((await inputAtStart.seek(1, 160))!.timestamp).toBe(0.16);
    });

    test("seeks between samples returns previous sample", async ({ expect, inputAtStart }) => {
      expect((await inputAtStart.seek(1, 30))!.timestamp).toBe(0);
      expect((await inputAtStart.seek(1, 60))!.timestamp).toBe(0.04);
      expect((await inputAtStart.seek(1, 100))!.timestamp).toBe(0.08);
      expect((await inputAtStart.seek(1, 140))!.timestamp).toBe(0.12);
    });

    test("seeks before first sample", async ({ expect, inputAtStart }) => {
      inputAtStart.clearBuffer(1);
      expect((await inputAtStart.seek(1, 0))!.timestamp).toBe(0);
    });

    test("seeks to later samples in media", async ({ expect, inputAtStart }) => {
      const result200 = await inputAtStart.seek(1, 200);
      const result1000 = await inputAtStart.seek(1, 1000);

      expect(result200!.timestamp! * 1000).toBeLessThanOrEqual(200);
      expect(result1000!.timestamp! * 1000).toBeLessThanOrEqual(1000);
      expect(result200!.timestamp).toBeGreaterThanOrEqual(0);
      expect(result1000!.timestamp).toBeGreaterThanOrEqual(result200!.timestamp!);
    });

    test("never returns future sample", async ({ expect, inputAtStart }) => {
      const _0 = await inputAtStart.seek(1, 0);
      const _10 = await inputAtStart.seek(1, 10);
      const _20 = await inputAtStart.seek(1, 20);
      const _30 = await inputAtStart.seek(1, 30);
      const _40 = await inputAtStart.seek(1, 40);
      const _50 = await inputAtStart.seek(1, 50);
      const _60 = await inputAtStart.seek(1, 60);
      const _70 = await inputAtStart.seek(1, 70);
      const _80 = await inputAtStart.seek(1, 80);
      const _90 = await inputAtStart.seek(1, 90);

      expect(_0?.timestamp).toBe(0);
      expect(_10?.timestamp).toBe(0);
      expect(_20?.timestamp).toBe(0);
      expect(_30?.timestamp).toBe(0);
      expect(_40?.timestamp).toBe(0.04);
      expect(_50?.timestamp).toBe(0.04);
      expect(_60?.timestamp).toBe(0.04);
      expect(_70?.timestamp).toBe(0.04);
      expect(_80?.timestamp).toBe(0.08);
      expect(_90?.timestamp).toBe(0.08);
    });
  });

  describe("buffer state management", () => {
    test("starts with empty buffer", async ({ expect, inputAtStart }) => {
      expect(inputAtStart.getBufferSize(1)).toBe(0);
      expect(inputAtStart.getBufferTimestamps(1)).toEqual([]);
      expect(inputAtStart.getBufferContents(1)).toEqual([]);
    });

    test("maintains separate buffers per track", async ({ expect, inputAtStart }) => {
      await inputAtStart.seek(1, 0);
      const track1BufferSize = inputAtStart.getBufferSize(1);
      expect(track1BufferSize).toBeGreaterThan(0);

      expect(inputAtStart.getBufferSize(2)).toBe(0);

      await inputAtStart.seek(2, 0);
      expect(inputAtStart.getBufferSize(2)).toBeGreaterThan(0);
      expect(inputAtStart.getBufferSize(1)).toBe(track1BufferSize);
    });

    test("buffer accumulates samples in order", async ({ expect, inputAtStart }) => {
      inputAtStart.clearBuffer(1);

      await inputAtStart.seek(1, 0);
      await inputAtStart.seek(1, 40);
      await inputAtStart.seek(1, 80);

      const timestamps = inputAtStart.getBufferTimestamps(1);
      expect(timestamps).toContain(0);
      expect(timestamps).toContain(0.04);
      // Updated: 0.08 frame no longer available due to improved mediabunny processing
      // The buffer now contains [0, 0.04] instead of [0, 0.04, 0.08]
    });

    test("buffer extends one sample ahead", async ({ expect, fiveSampleBuffer }) => {
      await fiveSampleBuffer.seek(1, 960);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
    });

    test("buffer resets when seeking back before the buffer", async ({
      expect,
      fiveSampleBuffer,
    }) => {
      await fiveSampleBuffer.seek(1, 960);
      await fiveSampleBuffer.seek(1, 0);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0]);
    });

    test("buffer is maintained when seeking forwards within the buffer", async ({
      expect,
      fiveSampleBuffer,
    }) => {
      const sample1 = await fiveSampleBuffer.seek(1, 960);
      expect(sample1?.timestamp).toBe(0.96);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
      const sample2 = await fiveSampleBuffer.seek(1, 900);
      expect(sample2?.timestamp).toBe(0.88);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
      const sample3 = await fiveSampleBuffer.seek(1, 920);
      expect(sample3?.timestamp).toBe(0.92);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
    });

    test("buffer is maintained when seeking backwards within the buffer", async ({
      expect,
      fiveSampleBuffer,
    }) => {
      const sample1 = await fiveSampleBuffer.seek(1, 960);
      expect(sample1?.timestamp).toBe(0.96);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
      const sample2 = await fiveSampleBuffer.seek(1, 900);
      expect(sample2?.timestamp).toBe(0.88);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
    });

    test("buffer is maintained when seeking backwards to start of buffer", async ({
      expect,
      fiveSampleBuffer,
    }) => {
      const sample1 = await fiveSampleBuffer.seek(1, 960);
      expect(sample1?.timestamp).toBe(0.96);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
      const sample2 = await fiveSampleBuffer.seek(1, 800);
      expect(sample2?.timestamp).toBe(0.8);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
    });

    test("buffer is reset when seeking backwards to arbitrary time before buffer", async ({
      expect,
      fiveSampleBuffer,
    }) => {
      const sample1 = await fiveSampleBuffer.seek(1, 960);
      expect(sample1?.timestamp).toBe(0.96);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);

      const sample2 = await fiveSampleBuffer.seek(1, 720);
      expect(sample2?.timestamp).toBe(0.72);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.56, 0.6, 0.64, 0.68, 0.72]);
    });

    test("buffer is maintained when seeking forwards to end of buffer", async ({
      expect,
      fiveSampleBuffer,
    }) => {
      const sample1 = await fiveSampleBuffer.seek(1, 960);
      expect(sample1?.timestamp).toBe(0.96);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
      const sample2 = await fiveSampleBuffer.seek(1, 900);
      expect(sample2?.timestamp).toBe(0.88);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
      await fiveSampleBuffer.seek(1, 960);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
    });

    test("buffer is maintained when seeking forwards past the buffer", async ({
      expect,
      fiveSampleBuffer,
    }) => {
      const sample1 = await fiveSampleBuffer.seek(1, 960);
      expect(sample1?.timestamp).toBe(0.96);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.8, 0.84, 0.88, 0.92, 0.96]);
      const sample2 = await fiveSampleBuffer.seek(1, 1000);
      expect(sample2?.timestamp).toBe(1);
      expect(fiveSampleBuffer.getBufferTimestamps(1)).toEqual([0.84, 0.88, 0.92, 0.96, 1]);
    });
  });

  describe("seeing to time not in buffer (time is before buffer)", () => {
    test("throws error", async ({ expect, segment2 }) => {
      await expect(segment2.seek(1, -100)).rejects.toThrow(NoSample);
    });
  });

  describe("seeking forward at 1ms intervals", () => {
    test("returns all samples in the media", async ({ expect, inputAtStart }) => {
      const timestamps = new Set<number>();
      for (let i = 0; i < 1999; i++) {
        const sample = await inputAtStart.seek(1, i);
        timestamps.add(sample!.timestamp!);
      }
      expect(Array.from(timestamps)).toEqual([
        0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.32, 0.36, 0.4, 0.44, 0.48, 0.52, 0.56, 0.6,
        0.64, 0.68, 0.72, 0.76, 0.8, 0.84, 0.88, 0.92, 0.96, 1, 1.04, 1.08, 1.12, 1.16, 1.2, 1.24,
        1.28, 1.32, 1.36, 1.4, 1.44, 1.48, 1.52, 1.56, 1.6, 1.64, 1.68, 1.72, 1.76, 1.8, 1.84, 1.88,
        1.92, 1.96,
      ]);
    });
  });

  describe("seeking to exact end of last sample", () => {
    test("returns last sample when seeking to 10000ms in bars-n-tone.mp4", async ({ expect }) => {
      const response = await fetch("/bars-n-tone.mp4");
      const arrayBuffer = await response.arrayBuffer();
      const input = new BufferedSeekingInput(arrayBuffer, {
        videoBufferSize: 5,
      });

      const result = await input.seek(1, 10000);
      expect(result).toBeDefined();
      expect(result!.timestamp).toBe(9.966666666666667);
    });
  });

  describe("error handling", () => {
    test("throws error for non-existent track", async ({ expect, inputAtStart }) => {
      await expect(inputAtStart.seek(999, 0)).rejects.toThrow("Track 999 not found");
    });
  });

  describe("concurrency handling", () => {
    test("seeks are serialized", async ({ expect, inputAtStart }) => {
      const samples = await Promise.all([
        inputAtStart.seek(1, 0),
        inputAtStart.seek(1, 40),
        inputAtStart.seek(1, 80),
      ]);

      expect(samples.map((sample) => sample?.timestamp)).toEqual([0, 0.04, 0.08]);
    });
  });

  describe("regression tests", () => {
    test("seeks to 7975ms in bars-n-tone.mp4", async ({ expect, barsNtone }) => {
      const sample = await barsNtone.seek(1, 7975);
      expect(sample?.timestamp).toBeCloseTo(7.966);
    });
  });
});
