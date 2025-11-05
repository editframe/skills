import { expect, describe, beforeEach, test, beforeAll } from "vitest";
import { ValkeySystemStorage } from "./ValkeySystemStorage";
import { valkey } from "@/valkey/valkey";
import { getTestPrefix } from "TEST/util/getTestPrefix";
import { logger } from "@/logging";

describe("ValkeySystemStorage", () => {
  beforeAll(async () => {
    await valkey.flushall("SYNC");
  });
  beforeEach(async () => {
    const keys = await valkey.keys(`${getTestPrefix()}*`);
    if (keys.length > 0) {
      await valkey.del(keys);
    }
  });

  describe("allocateSlots", () => {
    test("Allocates orgs their full quota if slots are available", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(10);

      await storage.addWorker("org-1", "job-1", 5);
      await storage.addWorker("org-2", "job-1", 5);

      await storage.allocateSlots();

      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(5);
      await expect(storage.getJobAllocation("org-2", "job-1")).resolves.toBe(5);
    });

    test("Splits org quotas across jobs", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(10);

      await storage.addWorker("org-1", "job-1", 5);
      await storage.addWorker("org-1", "job-2", 5);

      await storage.allocateSlots();

      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(3);
      await expect(storage.getJobAllocation("org-1", "job-2")).resolves.toBe(2);
    });

    test("Fairly allocates when there aren't enough slots for the org", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(4);

      await storage.addWorker("org-1", "job-1", 5);
      await storage.addWorker("org-1", "job-2", 5);

      await storage.allocateSlots();

      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(2);
      await expect(storage.getJobAllocation("org-1", "job-2")).resolves.toBe(2);
    });

    test("Fairly allocates when there are multiple orgs", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(4);

      await storage.addWorker("org-1", "job-1", 5);
      await storage.addWorker("org-1", "job-2", 5);
      await storage.addWorker("org-2", "job-1", 5);
      await storage.addWorker("org-2", "job-2", 5);

      await storage.allocateSlots();

      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-1", "job-2")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-2", "job-1")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-2", "job-2")).resolves.toBe(1);
    });

    test("Fairly allocates when an org has more jobs than others", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(4);

      await storage.addWorker("org-1", "job-1", 5);
      await storage.addWorker("org-1", "job-2", 5);
      await storage.addWorker("org-2", "job-2", 5);

      await storage.allocateSlots();

      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-1", "job-2")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-2", "job-2")).resolves.toBe(2);
    });

    test("Fairly allocates when an org has too many jobs to fulfill", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(10);

      await storage.addWorker("org-1", "job-1", 5);
      await storage.addWorker("org-2", "job-1", 5);
      await storage.addWorker("org-2", "job-2", 5);
      await storage.addWorker("org-2", "job-3", 5);
      await storage.addWorker("org-2", "job-4", 5);
      await storage.addWorker("org-2", "job-5", 5);
      await storage.addWorker("org-3", "job-1", 5);

      await storage.allocateSlots();

      // Org one gets 4 slots because it's in the primary position
      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(4);

      // Org two gets it's share spread into its first jobs because it's in the secondary position
      await expect(storage.getJobAllocation("org-2", "job-1")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-2", "job-2")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-2", "job-3")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-2", "job-4")).resolves.toBe(0);
      await expect(storage.getJobAllocation("org-2", "job-5")).resolves.toBe(0);

      // Org three is not starved.
      await expect(storage.getJobAllocation("org-3", "job-1")).resolves.toBe(3);
    });

    test("gracefully handles when there are too many jobs overall", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(2);

      await storage.addWorker("org-1", "job-1", 5);
      await storage.addWorker("org-2", "job-2", 5);
      await storage.addWorker("org-3", "job-1", 5);

      await storage.allocateSlots();

      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-2", "job-2")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-3", "job-1")).resolves.toBe(0);
    });

    test.skip("returns the correct allocation for a single group", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(1_000_000);
      const promises: Promise<number>[] = [];
      for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 400; j++) {
          promises.push(storage.addWorker(`org-${i}`, `job-${i}-${j}`, 8000));
        }
      }
      const start = Date.now();
      await Promise.all(promises);
      const end = Date.now();
      logger.info(`added workers took ${end - start}ms`);
      const start2 = Date.now();
      await storage.allocateSlots();
      const end2 = Date.now();
      logger.info(`allocateSlots took ${end2 - start2}ms`);
    }, 20_000);
  });

  describe("rotateOrg", () => {
    test("rotates an org to the end of the list", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(1);
      await storage.addWorker("org-1", "job-1", 5, Date.now());
      await storage.addWorker("org-2", "job-1", 5, Date.now());
      await storage.addWorker("org-3", "job-1", 5, Date.now());

      // Initial allocation should follow insertion order priority
      await storage.allocateSlots();
      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-2", "job-1")).resolves.toBe(0);
      await expect(storage.getJobAllocation("org-3", "job-1")).resolves.toBe(0);

      // Then, we rotate org-1 to the end of the list, putting org-2 into the
      // top priority position
      await storage.rotateOrg("org-1", Date.now() + 1);
      await storage.allocateSlots();
      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(0);
      await expect(storage.getJobAllocation("org-2", "job-1")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-3", "job-1")).resolves.toBe(0);

      // Then, we rotate org-2 to the end of the list, putting org-3 into the
      // top priority position
      await storage.rotateOrg("org-2", Date.now() + 2);
      await storage.allocateSlots();
      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(0);
      await expect(storage.getJobAllocation("org-2", "job-1")).resolves.toBe(0);
      await expect(storage.getJobAllocation("org-3", "job-1")).resolves.toBe(1);

      // Then, we rotate org-3 to the end of the list, which
      // should restore the original priority ordering
      await storage.rotateOrg("org-3", Date.now() + 3);
      await storage.allocateSlots();
      await expect(storage.getJobAllocation("org-1", "job-1")).resolves.toBe(1);
      await expect(storage.getJobAllocation("org-2", "job-1")).resolves.toBe(0);
      await expect(storage.getJobAllocation("org-3", "job-1")).resolves.toBe(0);
    });
  });

  describe("initSlots", () => {
    test("initializes unclaimed slots", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(5);
      await expect(storage.getUnclaimedSlotCount(Date.now())).resolves.toBe(5);
      await expect(storage.getClaimedSlotCount(Date.now())).resolves.toBe(0);
    });

    test("grows the slot count", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(1);
      await expect(storage.getUnclaimedSlotCount(Date.now())).resolves.toEqual(
        1,
      );
      await storage.initSlots(2);
      await expect(storage.getUnclaimedSlotCount(Date.now())).resolves.toEqual(
        2,
      );
    });

    test("shrinks the slot count", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(2);
      await expect(storage.getUnclaimedSlotCount(Date.now())).resolves.toBe(2);
      await storage.initSlots(1);
      await expect(storage.getUnclaimedSlotCount(Date.now())).resolves.toBe(1);
    });

    test("returns the correct slot count", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await expect(storage.initSlots(2)).resolves.toBe(2);
      await expect(storage.initSlots(3)).resolves.toBe(3);
    });
  });

  describe("claimSlot", () => {
    test("claims an unclaimed slot with a lease", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(5);
      const now = Date.now();
      const expiresAt = now + 1;
      await storage.claimSlot("test-org", now, expiresAt);

      await expect(storage.getUnclaimedSlotCount(now)).resolves.toBe(4);
      await expect(storage.getClaimedSlotCount(now)).resolves.toBe(1);
    });

    test("marks slot as claimed by org with expiration", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(5);
      const now = Date.now();
      const expiresAt = now + 1;
      await storage.claimSlot("test-org", now, expiresAt);

      await expect(storage.getClaimedSlotCount(now)).resolves.toBe(1);
      const slotData = await valkey.hgetall(
        `${getTestPrefix()}:work_slots:slot-1`,
      );
      expect(slotData.claimedBy).toBe("test-org");
    });

    test("returns null if no slots are available", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(1);
      const now = Date.now();
      const expiresAt = now + 1;
      await storage.claimSlot("test-org", now, expiresAt);
      await expect(storage.getUnclaimedSlotCount(now)).resolves.toBe(0);
      await expect(storage.claimSlot("test-org", now, expiresAt)).resolves.toBe(
        null,
      );
    });

    test("considers slots claimed up to expiration time", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(1);
      const now = Date.now();
      const expiresAt = now + 1;
      await storage.claimSlot("test-org", now, expiresAt);
      await expect(storage.getUnclaimedSlotCount(now)).resolves.toBe(0);
      await expect(storage.claimSlot("test-org", now, expiresAt)).resolves.toBe(
        null,
      );
    });

    test("automatically frees expired slots", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(1);
      const now = Date.now();
      const expiresAt = now + 1;
      await storage.claimSlot("test-org", now, expiresAt);
      await expect(storage.getUnclaimedSlotCount(now)).resolves.toBe(0);
      const futureTime = now + 60_001; // > 60 seconds later
      await expect(storage.getUnclaimedSlotCount(futureTime)).resolves.toBe(1);
      await expect(storage.getClaimedSlotCount(futureTime)).resolves.toBe(0);
    });
  });

  describe("releaseSlot", () => {
    test("releases a claimed slot before expiration", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(1);
      const now = Date.now();
      const expiresAt = now + 60_000;
      await storage.claimSlot("test-org", now, expiresAt);
      await storage.releaseSlot("slot-1");
      await expect(storage.getUnclaimedSlotCount(now)).resolves.toBe(1);
      await expect(storage.getClaimedSlotCount(now)).resolves.toBe(0);
    });

    test("does not release an already expired slot", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(1);
      const now = Date.now();
      const expiresAt = now + 60_000;
      await storage.claimSlot("test-org", now, expiresAt);

      const futureTime = now + 60_001; // > 60 seconds later
      await storage.releaseSlot("slot-1");
      await expect(storage.getUnclaimedSlotCount(futureTime)).resolves.toBe(1);
      await expect(storage.getClaimedSlotCount(futureTime)).resolves.toBe(0);
    });
  });

  describe("getLastExecutionTime", () => {
    test("returns 0 if no execution time is set", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await expect(storage.getLastExecutionTime("test-org")).resolves.toBe(0);
    });
  });

  describe("setLastExecutionTime", () => {
    test("sets the last execution time", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      const now = Date.now();
      await storage.setLastExecutionTime("test-org", now);
      await expect(storage.getLastExecutionTime("test-org")).resolves.toBe(now);
    });
  });

  describe("getJobAllocation", () => {
    test("returns 0 if no work slots are available", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.addWorker("test-org", "work-1", 10);
      await storage.initSlots(0);
      await storage.allocateSlots();
      await expect(
        storage.getJobAllocation("test-org", "work-1"),
      ).resolves.toBe(0);
    });

    test("returns requested slots if available", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(10);
      await storage.addWorker("test-org", "work-1", 10);
      await storage.allocateSlots();
      await expect(
        storage.getJobAllocation("test-org", "work-1"),
      ).resolves.toBe(10);
    });

    test("returns fewer slots if requested slots are more than available", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(5);
      await storage.addWorker("test-org", "work-1", 10);
      await storage.allocateSlots();
      await expect(
        storage.getJobAllocation("test-org", "work-1"),
      ).resolves.toBe(5);
    });

    test("returns concurrencyMax if requested slots are more than available", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(5);
      await storage.addWorker("test-org", "work-1", 10);
      await storage.allocateSlots();
      await expect(
        storage.getJobAllocation("test-org", "work-1"),
      ).resolves.toBe(5);
    });

    test("divides concurrencyMax slots fairly within an org when multiple jobs are running", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(10);
      await storage.addWorker("test-org", "work-1", 4);
      await storage.addWorker("test-org", "work-2", 4);
      await storage.allocateSlots();
      /**
       * concurrencyMax is at the org level. So asking for 4 slots with 2 jobs
       * running for the org should return 2
       */
      await expect(
        storage.getJobAllocation("test-org", "work-1"),
      ).resolves.toBe(2);
    });

    test("floors the result of the division", async () => {
      const storage = new ValkeySystemStorage(getTestPrefix());
      await storage.initSlots(10);
      await storage.addWorker("test-org", "work-1", 3);
      await storage.addWorker("test-org", "work-2", 3);
      await storage.allocateSlots();
      await expect(
        storage.getJobAllocation("test-org", "work-1"),
      ).resolves.toBe(2);
      await expect(
        storage.getJobAllocation("test-org", "work-2"),
      ).resolves.toBe(1);
    });
  });
});
