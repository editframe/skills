import fs from "node:fs/promises";
import { basename } from "node:path";

import { Readable } from "node:stream";
import {
  type CreateFileResult,
  createFile,
  type LookupFileByMd5Result,
  lookupFileByMd5,
  uploadFile,
} from "@editframe/api";
import { createReadableStreamFromReadable } from "../../utils/createReadableStreamFromReadable.js";
import { getClient } from "../../utils/index.js";
import type { SubAssetSync } from "./SubAssetSync.js";
import { SyncStatus } from "./SyncStatus.js";
export class SyncCaption implements SubAssetSync<CreateFileResult> {
  icon = "📝";
  label = "captions";
  syncStatus: SyncStatus = new SyncStatus(this.path);
  created: CreateFileResult | LookupFileByMd5Result | null = null;
  constructor(
    public path: string,
    public md5: string,
  ) {}

  async byteSize() {
    return (await fs.stat(this.path)).size;
  }

  async prepare() {}

  async validate() {}

  async create() {
    const maybeFile = await lookupFileByMd5(getClient(), this.md5);
    if (maybeFile) {
      this.created = maybeFile;
    } else {
      this.created = await createFile(getClient(), {
        md5: this.md5,
        filename: basename(this.path).replace(/\.captions.json$/, ""),
        type: "caption",
        byte_size: await this.byteSize(),
      });
    }
  }

  isComplete() {
    return this.created?.status === "ready";
  }

  async upload() {
    if (!this.created) {
      throw new Error(
        "Caption not created. Should have been prevented by .isComplete()",
      );
    }
    await uploadFile(
      getClient(),
      {
        id: this.created.id,
        byte_size: await this.byteSize(),
        type: "caption",
      },
      // It's not clear why we need to use Readable.from here, but it seems
      // to fix an issue where the request is closed early in tests
      createReadableStreamFromReadable(
        Readable.from(await fs.readFile(this.path)),
      ),
    ).whenUploaded();
  }

  async markSynced() {
    if (!this.created) {
      throw new Error(
        "Caption not created. Should have been prevented by .isComplete()",
      );
    }
    const byteSize = await this.byteSize();
    await this.syncStatus.markSynced({
      version: "1",
      complete: true,
      id: this.created.id,
      md5: this.md5,
      byte_size: byteSize,
    });
  }
}
