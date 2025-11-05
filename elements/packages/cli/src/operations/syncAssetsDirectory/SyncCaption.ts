import fs from "node:fs/promises";
import { basename } from "node:path";

import { Readable } from "node:stream";
import {
  type CreateCaptionFileResult,
  createCaptionFile,
  type LookupCaptionFileByMd5Result,
  lookupCaptionFileByMd5,
  uploadCaptionFile,
} from "@editframe/api";
import { createReadableStreamFromReadable } from "../../utils/createReadableStreamFromReadable.js";
import { getClient } from "../../utils/index.js";
import type { SubAssetSync } from "./SubAssetSync.js";
import { SyncStatus } from "./SyncStatus.js";
export class SyncCaption implements SubAssetSync<CreateCaptionFileResult> {
  icon = "📝";
  label = "captions";
  syncStatus: SyncStatus = new SyncStatus(this.path);
  created: CreateCaptionFileResult | LookupCaptionFileByMd5Result | null = null;
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
    const maybeCaptionFile = await lookupCaptionFileByMd5(
      getClient(),
      this.md5,
    );
    if (maybeCaptionFile) {
      this.created = maybeCaptionFile;
    } else {
      this.created = await createCaptionFile(getClient(), {
        md5: this.md5,
        filename: basename(this.path).replace(/\.captions.json$/, ""),
        byte_size: await this.byteSize(),
      });
    }
  }

  isComplete() {
    return !!this.created?.complete;
  }

  async upload() {
    if (!this.created) {
      throw new Error(
        "Caption not created. Should have been prevented by .isComplete()",
      );
    }
    await uploadCaptionFile(
      getClient(),
      this.created.id,
      // It's not clear why we need to use Readable.from here, but it seems
      // to fix an issue where the request is closed early in tests
      createReadableStreamFromReadable(
        Readable.from(await fs.readFile(this.path)),
      ),
      await this.byteSize(),
    );
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
