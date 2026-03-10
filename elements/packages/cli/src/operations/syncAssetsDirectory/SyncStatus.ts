import fs from "node:fs/promises";

import { z } from "zod";

const SYNC_VERSION = "1";

const SyncStatusSchema = z.object({
  version: z.string(),
  complete: z.boolean(),
  id: z.string(),
  md5: z.string(),
  byte_size: z.number(),
});

export interface SyncStatusInfo extends z.infer<typeof SyncStatusSchema> {}

export class SyncStatus {
  infoPath = `${this.basePath}.info`;

  constructor(private basePath: string) {}

  async isSynced() {
    const syncInfo = await this.readInfo();
    if (!syncInfo) {
      return false;
    }
    return syncInfo.version === SYNC_VERSION && syncInfo.complete;
  }

  async readInfo() {
    try {
      const info = await fs.readFile(this.infoPath, "utf-8");
      return SyncStatusSchema.parse(JSON.parse(info));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async markSynced(info: SyncStatusInfo) {
    await fs.writeFile(this.infoPath, JSON.stringify(info, null, 2), "utf-8");
  }
}
