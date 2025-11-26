import opentelemetry from "@opentelemetry/api";
import { sleep } from "@/util/sleep";
import {
  type WorkSlot,
  type WorkSystem,
  type OrgId,
  PermanentFailure,
} from "./WorkSystem";
import { logger } from "@/logging";

export interface WorkSlice {
  onStart?: (attemptNumber: number) => Promise<void>;
  onComplete?: () => Promise<void>;
  onFail?: (errorText: string) => Promise<void>;
}

interface WorkControllerOptions<Slice extends WorkSlice> {
  system: WorkSystem;
  orgId: OrgId;
  id: string;
  slices: Slice[];
  failureLimit: number;
  executeSlice: (
    slice: Slice,
    attemptNumber: number,
    abortSignal: AbortSignal,
  ) => Promise<void>;
}
export class WorkController<Slice extends WorkSlice> {
  system: WorkSystem;
  orgId: OrgId;
  id: string;
  slicesToDo: Slice[];
  failureLimit: number;
  executeSlice: (
    slice: Slice,
    attemptNumber: number,
    abortSignal: AbortSignal,
  ) => Promise<void>;
  activeSlices = new Set<Slice>();
  completedSlices: Slice[] = [];
  claimedSlots: WorkSlot[] = [];
  workingSlots = new Set<WorkSlot>();
  sliceAttempts: Map<Slice, number> = new Map();
  abortController = new AbortController();
  failureCount = 0;

  get freeSlots() {
    return this.claimedSlots.filter((slot) => !this.workingSlots.has(slot));
  }

  constructor(options: WorkControllerOptions<Slice>) {
    this.system = options.system;
    this.orgId = options.orgId;
    this.id = options.id;
    this.slicesToDo = options.slices.slice(0);
    this.failureLimit = options.failureLimit;
    this.executeSlice = options.executeSlice;
  }

  async connect() {
    await this.system.addWorker(this);
  }

  async disconnect() {
    await this.system.removeWorker(this);
    for (const slotId of this.claimedSlots) {
      this.system.releaseWorkSlot(slotId);
    }
  }

  get failedPermanently() {
    return this.abortController.signal.aborted;
  }

  async completeSlices() {
    while (this.slicesToDo.length > 0 && !this.failedPermanently) {
      const tracer = opentelemetry.trace.getTracer("default");
      const span = tracer.startSpan("WorkController claim loop tick");
      try {
        span.setAttributes({
          startInfo: JSON.stringify({
            slicesToDo: this.slicesToDo.length,
            claimedSlots: this.claimedSlots.length,
            workingSlots: this.workingSlots.size,
            freeSlots: this.freeSlots.length,
          }),
        });

        logger.info("Claim loop interval tick");
        await this.claimSlots();
        await this.executeSlices();
        await sleep(this.system.config.claimLoopIntervalMs);
        span.setAttributes({
          endInfo: JSON.stringify({
            slicesToDo: this.slicesToDo.length,
            claimedSlots: this.claimedSlots.length,
            workingSlots: this.workingSlots.size,
            freeSlots: this.freeSlots.length,
          }),
        });
        if (this.slicesToDo.length === 0) {
          break;
        }
      } finally {
        span.end();
      }
    }

    while (this.activeSlices.size > 0 && !this.failedPermanently) {
      await sleep(this.system.config.claimLoopIntervalMs);
    }
    await this.disconnect();

    logger.info(
      "Completed slices",
      this.completedSlices,
      this.failedPermanently,
    );
    if (this.failedPermanently) {
      throw new PermanentFailure("Failed permanently");
    }
  }

  async failPermenantly() {
    logger.info("Failing permanently");
    this.abortController.abort("Permanently failed");
  }

  isPermanentFailure(error: unknown) {
    return error instanceof PermanentFailure;
  }

  async executeSlices() {
    const executionPromises: Promise<void>[] = [];
    while (this.freeSlots[0] && this.slicesToDo[0] && !this.failedPermanently) {
      const slot = this.freeSlots[0];
      const slice = this.slicesToDo.shift()!;
      this.activeSlices.add(slice);
      this.workingSlots.add(slot);
      this.system.setLastExecutionTime(this.orgId);

      let attemptNumber = this.sliceAttempts.get(slice) || 0;
      this.sliceAttempts.set(slice, ++attemptNumber);
      if (attemptNumber > 3) {
        this.failPermenantly();
        return;
      }
      try {
        logger.info(slice, "Starting slice");
        if (slice.onStart) {
          await slice.onStart(attemptNumber);
        }
      } catch (error) {
        this.failureCount++;
        if (this.isPermanentFailure(error)) {
          this.failPermenantly();
        }
        return;
      }
      executionPromises.push(
        this.executeSlice(slice, attemptNumber, this.abortController.signal)
          .then(() => {
            logger.info(slice, "Slice completed");
            if (this.failedPermanently) {
              return;
            }
            if (slice.onComplete) {
              slice.onComplete().catch((error) => {
                logger.error(
                  `Error in onSliceComplete for slice ${slice}`,
                  error,
                );
              });
            }
            this.system
              .releaseWorkSlot(slot)
              .then(() => {
                this.completedSlices.push(slice);
                this.activeSlices.delete(slice);
                this.workingSlots.delete(slot);
              })
              .catch((error) => {
                logger.error(
                  `Error releasing work slot ${slot} for slice ${slice}`,
                  error,
                );
              });
          })
          .catch((error) => {
            logger.error("Error executing slice", error);
            if (slice.onFail) {
              slice.onFail(error.message).catch((error) => {
                logger.error(`Error in onSliceFail for slice ${slice}`, error);
              });
            }
            this.failureCount++;
            logger.info({ failureCount: this.failureCount }, "Failure count");
            logger.info({ failureLimit: this.failureLimit }, "Failure limit");
            if (
              this.isPermanentFailure(error) ||
              this.failureCount >= this.failureLimit
            ) {
              logger.info("Failing permanently");
              this.failPermenantly();
              return;
            }

            // Put the slice back the head of the queue so it will be retried before moving on.
            // We want to encourage fast failure in case this is unrecoverable.
            this.slicesToDo.unshift(slice);
            this.activeSlices.delete(slice);
            this.workingSlots.delete(slot);
          }),
      );
    }
    await Promise.all(executionPromises);
  }

  async unclaimedAllocation() {
    return (
      (await this.system.getJobAllocation(this.orgId, this)) -
      this.claimedSlots.length
    );
  }

  async claimSlots() {
    while ((await this.unclaimedAllocation()) > 0) {
      const claimedSlot = await this.system.claimWorkSlot(this.orgId);
      if (!claimedSlot) {
        return;
      }
      logger.info(claimedSlot, "Claimed slot");
      await this.system.rotateOrg(this.orgId);
      this.claimedSlots.push(claimedSlot);
    }
  }
}
