import { http, HttpResponse, delay } from "msw";
import { test, expect, describe, beforeEach } from "vitest";
import { useMSW } from "TEST/util/useMSW";
import { HTTPWorkSliceController } from "./HTTPWorkSliceController";
import { getTestPrefix } from "TEST/util/getTestPrefix";
import { type OrgId, PermanentFailure, WorkSystem } from "./WorkSystem";

const makeTestSystem = async () => {
  const system = new WorkSystem({
    storagePrefix: getTestPrefix(),
    concurrencyMax: 10,
    workSlotCount: 10,
    leaseDurationMs: 1_000,
    claimLoopIntervalMs: 10,
  });
  await system.scaleSlots();
  return system;
};

const makeWorkController = async (sliceUrls: string[]) => {
  const system = await makeTestSystem();
  const slices = sliceUrls.map((url) => ({
    url,
    method: "GET",
    headers: {},
  }));
  const controller = new HTTPWorkSliceController({
    system,
    orgId: "test-org" as OrgId,
    id: "test-job",
    slices,
    failureLimit: Number.POSITIVE_INFINITY,
  });
  await controller.connect();
  return { system, controller, slices };
};

describe("HTTPWorkSliceController", () => {
  const server = useMSW();

  const mockStatus = (url: string, status: number, delayMs?: number) =>
    http.get(
      url,
      async ({ request }) => {
        if (delayMs) {
          const abortPromise = new Promise((_, reject) => {
            request.signal.addEventListener("abort", () => {
              abortedRequests.add(url);
              reject(new Error("Aborted"));
            });
          });

          await Promise.race([delay(delayMs), abortPromise]);
        }
        return HttpResponse.json({}, { status });
      },
      { once: true },
    );

  const abortedRequests = new Set<string>();

  beforeEach(() => {
    abortedRequests.clear();
  });

  test("200 responses are treated as success", async () => {
    server.use(mockStatus("https://example.com/slice-1", 200));

    const {
      controller,
      slices: [slice1],
    } = await makeWorkController(["https://example.com/slice-1"]);

    await controller.completeSlices();

    expect(controller.completedSlices).toEqual([slice1]);
  });

  test("404 responses are treated as permanent failure", async () => {
    server.use(mockStatus("https://example.com/slice-1", 404));

    const {
      controller,
      slices: [slice1],
    } = await makeWorkController(["https://example.com/slice-1"]);

    await expect(controller.completeSlices()).rejects.toThrow(PermanentFailure);

    expect(controller.completedSlices).toEqual([]);
    expect(controller.sliceAttempts.get(slice1!)).toEqual(1);
  });

  test("429 responses are treated as temporary failure", async () => {
    server.use(
      mockStatus("https://example.com/slice-1", 429),
      mockStatus("https://example.com/slice-1", 200),
    );

    const {
      controller,
      slices: [slice1],
    } = await makeWorkController(["https://example.com/slice-1"]);

    await controller.completeSlices();

    expect(controller.completedSlices).toEqual([slice1]);
    expect(controller.sliceAttempts.get(slice1!)).toEqual(2);
  });

  test("400 responses are treated as permanent failure", async () => {
    server.use(mockStatus("https://example.com/slice-1", 400));

    const {
      controller,
      slices: [slice1],
    } = await makeWorkController(["https://example.com/slice-1"]);

    await expect(controller.completeSlices()).rejects.toThrow(PermanentFailure);

    expect(controller.completedSlices).toEqual([]);
    expect(controller.sliceAttempts.get(slice1!)).toEqual(1);
  });

  test("500 responses are treated as transient failure", async () => {
    server.use(mockStatus("https://example.com/slice-1", 500));
    server.use(mockStatus("https://example.com/slice-1", 200));

    const {
      controller,
      slices: [slice1],
    } = await makeWorkController(["https://example.com/slice-1"]);

    await controller.completeSlices();

    expect(controller.completedSlices).toEqual([slice1]);
    expect(controller.sliceAttempts.get(slice1!)).toEqual(1);
  });

  test("When an unknown status code is returned, active requests are cancelled", async () => {
    server.use(
      mockStatus("https://example.com/slice-1", 400),
      mockStatus("https://example.com/slice-2", 200),
    );

    const {
      controller,
      slices: [slice1, slice2],
    } = await makeWorkController([
      "https://example.com/slice-1",
      "https://example.com/slice-2",
    ]);

    await expect(controller.completeSlices()).rejects.toThrow(PermanentFailure);

    expect(controller.completedSlices).toEqual([]);
    expect(controller.sliceAttempts.get(slice1!)).toEqual(1);
    expect(controller.sliceAttempts.get(slice2!)).toEqual(1);
  });

  test("When a permanent failure occurs, active requests are aborted", async () => {
    server.use(
      mockStatus("https://example.com/slice-1", 400, 100),
      mockStatus("https://example.com/slice-2", 200, 500),
    );

    const {
      controller,
      slices: [slice1, slice2],
    } = await makeWorkController([
      "https://example.com/slice-1",
      "https://example.com/slice-2",
    ]);

    await expect(controller.completeSlices()).rejects.toThrow(PermanentFailure);

    expect(controller.completedSlices).toEqual([]);
    expect(controller.sliceAttempts.get(slice1!)).toEqual(1);
    expect(controller.sliceAttempts.get(slice2!)).toEqual(1);
    expect(abortedRequests.has("https://example.com/slice-2")).toBe(true);
  });
});
