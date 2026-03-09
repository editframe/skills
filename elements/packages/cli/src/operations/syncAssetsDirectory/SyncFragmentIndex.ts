import fs from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { Readable } from "node:stream";

import {
  type CreateFileResult,
  createFile,
  type LookupFileByMd5Result,
  lookupFileByMd5,
  uploadFileIndex,
} from "@editframe/api";

import { createReadableStreamFromReadable } from "../../utils/createReadableStreamFromReadable.js";
import { getClient } from "../../utils/index.js";
import type { SubAssetSync } from "./SubAssetSync.js";
import { SyncStatus } from "./SyncStatus.js";

export class SyncFragmentIndex implements SubAssetSync<CreateFileResult> {
  icon = "📋";
  label = "fragment index";
  syncStatus = new SyncStatus(this.path);
  fileSyncStatus = new SyncStatus(join(dirname(this.path), "isobmff"));
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
        filename: basename(this.path).replace(/\.tracks.json$/, ""),
        type: "video",
        byte_size: await this.byteSize(),
      });
    }
  }

  isComplete() {
    return this.created?.status === "ready";
  }

  async upload() {
    if (!this.created) {
      throw new Error("Fragment index not created. Should have been prevented by .isComplete()");
    }
    await uploadFileIndex(
      getClient(),
      this.created.id,
      // It is unclear why we need to use Readable.from here
      // Tests fail when using createReadStream
      createReadableStreamFromReadable(Readable.from(await fs.readFile(this.path))),
      await this.byteSize(),
    );
  }

  async markSynced() {
    if (!this.created) {
      throw new Error("Fragment index not created. Should have been prevented by .isComplete()");
    }
    const byteSize = await this.byteSize();
    await Promise.all([
      this.syncStatus.markSynced({
        version: "1",
        complete: true,
        id: this.created.id,
        md5: this.md5,
        byte_size: byteSize,
      }),
      this.fileSyncStatus.markSynced({
        version: "1",
        complete: true,
        id: this.created.id,
        md5: this.md5,
        byte_size: byteSize,
      }),
    ]);
  }
}
