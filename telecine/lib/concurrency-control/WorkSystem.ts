import { ValkeySystemStorage } from "./ValkeySystemStorage";
import type { WorkController } from "./WorkController";

export type OrgId = string & { __brand: "orgId" };
export const makeOrgId = (id: string): OrgId => id as OrgId;

export type WorkSlot = string;

interface SystemConfiguration {
  storagePrefix: string;
  concurrencyMax: number;
  workSlotCount: number;
  leaseDurationMs: number;
  claimLoopIntervalMs: number;
}

export class PermanentFailure extends Error {}

export class WorkSystem {
  private readonly storage = new ValkeySystemStorage(this.config.storagePrefix);

  constructor(public config: SystemConfiguration) {}

  async scaleSlots() {
    await this.storage.initSlots(this.config.workSlotCount);
    await this.storage.allocateSlots();
  }

  getUnclaimedSlotCount() {
    return this.storage.getUnclaimedSlotCount(Date.now());
  }

  setLastExecutionTime(orgId: OrgId) {
    return this.storage.setLastExecutionTime(orgId, Date.now());
  }

  getJobAllocation(orgId: OrgId, workController: WorkController<any>) {
    return this.storage.getJobAllocation(orgId, workController.id);
  }

  async claimWorkSlot(orgId: OrgId) {
    const slot = await this.storage.claimSlot(
      orgId,
      Date.now(),
      Date.now() + this.config.leaseDurationMs,
    );
    return slot;
  }

  async rotateOrg(orgId: OrgId) {
    await this.storage.rotateOrg(orgId);
  }

  async releaseWorkSlot(slot: WorkSlot) {
    await this.storage.releaseSlot(slot);
    await this.storage.allocateSlots();
  }

  async addWorker(workController: WorkController<any>) {
    await this.storage.addWorker(
      workController.orgId,
      workController.id,
      Math.min(this.config.concurrencyMax, workController.slicesToDo.length),
    );
    await this.storage.allocateSlots();
  }

  async removeWorker(workController: WorkController<any>) {
    await this.storage.removeWorker(workController.orgId, workController.id);
    await this.storage.allocateSlots();
  }
}
