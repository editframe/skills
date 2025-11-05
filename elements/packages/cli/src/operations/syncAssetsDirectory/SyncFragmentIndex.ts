import fs from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { Readable } from "node:stream";

import {
  type CreateISOBMFFFileResult,
  createISOBMFFFile,
  type LookupISOBMFFFileByMd5Result,
  lookupISOBMFFFileByMd5,
  uploadFragmentIndex,
} from "@editframe/api";

import { createReadableStreamFromReadable } from "../../utils/createReadableStreamFromReadable.js";
import { getClient } from "../../utils/index.js";
import type { SubAssetSync } from "./SubAssetSync.js";
import { SyncStatus } from "./SyncStatus.js";

export class SyncFragmentIndex
  implements SubAssetSync<CreateISOBMFFFileResult>
{
  icon = "📋";
  label = "fragment index";
  syncStatus = new SyncStatus(this.path);
  fileSyncStatus = new SyncStatus(join(dirname(this.path), "isobmff"));
  created: CreateISOBMFFFileResult | LookupISOBMFFFileByMd5Result | null = null;

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
    const maybeISOBMFFFile = await lookupISOBMFFFileByMd5(
      getClient(),
      this.md5,
    );
    if (maybeISOBMFFFile) {
      this.created = maybeISOBMFFFile;
    } else {
      this.created = await createISOBMFFFile(getClient(), {
        md5: this.md5,
        filename: basename(this.path).replace(/\.tracks.json$/, ""),
      });
    }
  }

  isComplete() {
    return !!this.created?.fragment_index_complete;
  }

  async upload() {
    if (!this.created) {
      throw new Error(
        "Fragment index not created. Should have been prevented by .isComplete()",
      );
    }
    await uploadFragmentIndex(
      getClient(),
      this.created.id,
      // It is unclear why we need to use Readable.from here
      // Tests fail when using createReadStream
      createReadableStreamFromReadable(
        Readable.from(await fs.readFile(this.path)),
      ),
      await this.byteSize(),
    );
  }

  async markSynced() {
    if (!this.created) {
      throw new Error(
        "Fragment index not created. Should have been prevented by .isComplete()",
      );
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
