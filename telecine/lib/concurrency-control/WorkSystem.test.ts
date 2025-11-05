import { beforeEach, describe, expect, test } from "vitest";
import { valkey } from "../valkey/valkey";
import { makeOrgId, WorkSystem } from "./WorkSystem";
import { WorkController, type WorkSlice } from "./WorkController";
import { sleep } from "@/util/sleep";
import { getTestPrefix } from "TEST/util/getTestPrefix";

describe("Work system", () => {
  beforeEach(async () => {
    const keys = await valkey.keys(`${getTestPrefix()}*`);
    if (keys.length > 0) {
      await valkey.del(keys);
    }
  });

  test("executes slices", async () => {
    const system = new WorkSystem({
      storagePrefix: getTestPrefix(),
      concurrencyMax: 80,
      workSlotCount: 100,
      leaseDurationMs: 1_000,
      claimLoopIntervalMs: 10,
    });

    const results: any[] = [];

    const c1Slice1 = { slice: "1-1" };
    const c1Slice2 = { slice: "1-2" };
    const c1Slice3 = { slice: "1-3" };

    const controller = new WorkController<{ slice: string } & WorkSlice>({
      system,
      orgId: makeOrgId("test-org"),
      id: "test-id-1",
      slices: [c1Slice1, c1Slice2, c1Slice3],
      failureLimit: 10,
      executeSlice: async (slice) => {
        results.push(slice);
        await sleep(10);
      },
    });

    const c2Slice1 = { slice: "2-1" };
    const c2Slice2 = { slice: "2-2" };
    const c2Slice3 = { slice: "2-3" };
    const controller2 = new WorkController<{ slice: string } & WorkSlice>({
      system,
      orgId: makeOrgId("test-org"),
      id: "test-id-2",
      slices: [c2Slice1, c2Slice2, c2Slice3],
      failureLimit: 10,
      executeSlice: async (slice) => {
        results.push(slice);
        await sleep(10);
      },
    });

    await controller.connect();
    await controller2.connect();
    await system.scaleSlots();
    await Promise.all([
      controller.completeSlices(),
      controller2.completeSlices(),
    ]);

    expect(results).toEqual([
      c2Slice1,
      c1Slice1,
      c1Slice2,
      c2Slice2,
      c1Slice3,
      c2Slice3,
    ]);
  });

  test("executes work fairly when resources are limited", async () => {
    const system = new WorkSystem({
      storagePrefix: getTestPrefix(),
      concurrencyMax: 10,
      workSlotCount: 1,
      leaseDurationMs: 1_000,
      claimLoopIntervalMs: 10,
    });

    const results: any[] = [];

    const a1Slice1 = { slice: "a-1-1" };
    const a1Slice2 = { slice: "a-1-2" };
    const a1Slice3 = { slice: "a-1-3" };
    const a1Slice4 = { slice: "a-1-4" };
    const a1Slice5 = { slice: "a-1-5" };

    const controller = new WorkController<{ slice: string } & WorkSlice>({
      system,
      orgId: makeOrgId("org-a"),
      id: "test-a-1",
      slices: [a1Slice1, a1Slice2, a1Slice3, a1Slice4, a1Slice5],
      failureLimit: 10,
      executeSlice: async (slice) => {
        results.push(slice);
        await sleep(10);
      },
    });

    const a2Slice1 = { slice: "a-2-1" };
    const a2Slice2 = { slice: "a-2-2" };
    const a2Slice3 = { slice: "a-2-3" };

    const controller2 = new WorkController<{ slice: string } & WorkSlice>({
      system,
      orgId: makeOrgId("org-a"),
      id: "test-a-2",
      slices: [a2Slice1, a2Slice2, a2Slice3],
      failureLimit: 10,
      executeSlice: async (slice) => {
        results.push(slice);
        await sleep(10);
      },
    });

    const b1Slice1 = { slice: "b-1-1" };
    const b1Slice2 = { slice: "b-1-2" };
    const b1Slice3 = { slice: "b-1-3" };

    const controller3 = new WorkController<{ slice: string } & WorkSlice>({
      system,
      orgId: makeOrgId("org-b"),
      id: "test-b-1",
      slices: [b1Slice1, b1Slice2, b1Slice3],
      failureLimit: 10,
      executeSlice: async (slice) => {
        results.push(slice);
        await sleep(10);
      },
    });

    await Promise.all([
      controller.connect(),
      controller2.connect(),
      controller3.connect(),
    ]);

    await system.scaleSlots();
    await Promise.all([
      controller.completeSlices(),
      controller2.completeSlices(),
      controller3.completeSlices(),
    ]);

    const bStartIndex = results.indexOf(b1Slice1);
    const aEndIndex = results.indexOf(a1Slice3);
    expect(bStartIndex).toBeLessThan(aEndIndex);
  });

  test("completes work when there is more work than slots", async () => {
    const system = new WorkSystem({
      storagePrefix: getTestPrefix(),
      concurrencyMax: 10,
      workSlotCount: 10,
      leaseDurationMs: 1_000,
      claimLoopIntervalMs: 10,
    });
    const slices = Array.from({ length: 200 }, (_, i) => ({
      slice: `slice-${i}`,
    }));
    const completedSlices: any[] = [];
    const controller = new WorkController<{ slice: string } & WorkSlice>({
      system,
      orgId: makeOrgId("test-org"),
      id: "test-id-1",
      slices,
      failureLimit: 10,
      executeSlice: async (slice) => {
        completedSlices.push(slice);
      },
    });

    await controller.connect();
    await system.scaleSlots();
    await controller.completeSlices();

    expect(completedSlices).toEqual(slices);
  });

  test("Cleans up storage after work is completed", async () => {
    const system = new WorkSystem({
      storagePrefix: getTestPrefix(),
      concurrencyMax: 10,
      workSlotCount: 10,
      leaseDurationMs: 1_000,
      claimLoopIntervalMs: 10,
    });

    const controller = new WorkController<{ slice: string } & WorkSlice>({
      system,
      orgId: makeOrgId("test-org"),
      id: "test-id-1",
      slices: [{ slice: "1-1" }],
      failureLimit: 10,
      executeSlice: async (_slice) => {},
    });

    await controller.connect();
    await system.scaleSlots();
    await controller.completeSlices();

    await expect(
      valkey.exists(`${getTestPrefix()}:resource:org:test-org`),
    ).resolves.toBe(0);

    await expect(
      valkey.exists(`${getTestPrefix()}:last_execution_time`),
    ).resolves.toBe(0);
  });
});
