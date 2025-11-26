import { describe, expect, test } from "vitest";
import { makeOrgId, PermanentFailure, WorkSystem } from "./WorkSystem";
import { WorkController, type WorkSlice } from "./WorkController";
import { sleep } from "@/util/sleep";
import { getTestPrefix } from "TEST/util/getTestPrefix";

describe("Work controller with retries", () => {
  test("retries work", async () => {
    const system = new WorkSystem({
      storagePrefix: getTestPrefix(),
      concurrencyMax: 10,
      workSlotCount: 10,
      leaseDurationMs: 1_000,
      claimLoopIntervalMs: 10,
    });

    let failures = 0;
    const controller = new WorkController<WorkSlice & { fail: number }>({
      system,
      failureLimit: Number.POSITIVE_INFINITY,
      orgId: makeOrgId("test-org"),
      id: "test-id-1",
      slices: [{ fail: 0 }, { fail: 2 }, { fail: 0 }],
      executeSlice: async (slice, attemptNumber) => {
        if (attemptNumber <= slice.fail) {
          failures++;
          throw new Error("Failed");
        }
      },
    });

    await controller.connect();
    await system.scaleSlots();
    await controller.completeSlices();

    expect(failures).toEqual(2);
  });

  test("fails permanently when individual work items fail too many times", async () => {
    const system = new WorkSystem({
      storagePrefix: getTestPrefix(),
      concurrencyMax: 10,
      workSlotCount: 10,
      leaseDurationMs: 1_000,
      claimLoopIntervalMs: 10,
    });

    const controller = new WorkController<WorkSlice & { fail: number }>({
      system,
      failureLimit: Number.POSITIVE_INFINITY,
      orgId: makeOrgId("test-org"),
      id: "test-id-1",
      slices: [{ fail: 0 }, { fail: 4 }, { fail: 0 }],
      executeSlice: async (slice, attemptNumber) => {
        if (attemptNumber <= slice.fail) {
          throw new Error("Failed");
        }
      },
    });

    await controller.connect();
    await system.scaleSlots();
    await expect(controller.completeSlices()).rejects.toThrow(
      "Failed permanently",
    );
  });

  test("fails permanently when a slice explicitly fails permanently", async () => {
    const system = new WorkSystem({
      storagePrefix: getTestPrefix(),
      concurrencyMax: 10,
      workSlotCount: 10,
      leaseDurationMs: 1_000,
      claimLoopIntervalMs: 10,
    });

    const work: any[] = [];

    const slice1 = { id: 1, fail: 1, permanentlyFail: false };
    const slice2 = { id: 2, fail: 0, permanentlyFail: false };
    const slice3 = { id: 3, fail: 1, permanentlyFail: true };

    const controller = new WorkController<
      WorkSlice & { id: number; fail: number; permanentlyFail: boolean }
    >({
      system,
      failureLimit: Number.POSITIVE_INFINITY,
      orgId: makeOrgId("test-org"),
      id: "test-id-1",
      slices: [slice1, slice2, slice3],
      executeSlice: async (slice, attemptNumber) => {
        work.push(slice);
        if (attemptNumber <= slice.fail) {
          throw new Error("Failed");
        }
        if (slice.permanentlyFail) {
          throw new PermanentFailure("Permanently failed");
        }
      },
    });

    await controller.connect();
    await system.scaleSlots();
    await expect(controller.completeSlices()).rejects.toThrow(
      "Failed permanently",
    );
    expect(work).toEqual([slice1, slice2, slice3, slice3, slice1]);
  });

  test("triggers an abort signal in all slices when permanently failing", async () => {
    const system = new WorkSystem({
      storagePrefix: getTestPrefix(),
      concurrencyMax: 10,
      workSlotCount: 10,
      leaseDurationMs: 1_000,
      claimLoopIntervalMs: 10,
    });

    const slice1 = { id: 1, aborted: false };
    const slice2 = { id: 2, aborted: false };
    const controller = new WorkController<
      WorkSlice & { id: number; aborted: boolean }
    >({
      system,
      failureLimit: Number.POSITIVE_INFINITY,
      orgId: makeOrgId("test-org"),
      id: "test-id-1",
      slices: [slice1, slice2],
      executeSlice: async (slice, _attemptNumber, abortSignal) => {
        const markAborted = () => {
          slice.aborted = true;
        };
        abortSignal.addEventListener("abort", markAborted);
        if (slice.id === 2) {
          throw new PermanentFailure("Permanently failed");
        }
        await sleep(1000);
        abortSignal.removeEventListener("abort", markAborted);
      },
    });

    await controller.connect();
    await system.scaleSlots();
    await expect(controller.completeSlices()).rejects.toThrow(
      "Failed permanently",
    );

    expect([slice1, slice2]).toEqual([
      { id: 1, aborted: true },
      { id: 2, aborted: true },
    ]);
  });
});
