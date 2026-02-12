import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path, { basename } from "node:path";

import {
  type CreateFileResult,
  createFile,
  type LookupFileByMd5Result,
  lookupFileByMd5,
  uploadFile,
} from "@editframe/api";

import { Probe } from "@editframe/assets";

import { createReadableStreamFromReadable } from "../../utils/createReadableStreamFromReadable.js";
import { getClient } from "../../utils/index.js";
import type { SubAssetSync } from "./SubAssetSync.js";
import { SyncStatus } from "./SyncStatus.js";

export class SyncImage implements SubAssetSync<CreateFileResult> {
  icon = "🖼️";
  label = "image";
  syncStatus: SyncStatus = new SyncStatus(this.path);
  created: CreateFileResult | LookupFileByMd5Result | null = null;

  constructor(
    public path: string,
    public md5: string,
  ) {}

  private _probeResult: Probe | null = null;

  async prepare() {
    this._probeResult = await Probe.probePath(this.path);
  }

  get probeResult() {
    if (!this._probeResult) {
      throw new Error("Probe result not found. Call prepare() first.");
    }
    return this._probeResult;
  }

  get extension() {
    return path.extname(this.path).slice(1);
  }

  async byteSize() {
    return (await fs.stat(this.path)).size;
  }

  async validate() {
    const [videoProbe] = this.probeResult.videoStreams;
    if (!videoProbe) {
      throw new Error(`No media info found in image: ${this.path}`);
    }
    const ext = this.extension;
    if (!(ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp")) {
      throw new Error(`Invalid image format: ${this.path}`);
    }
  }
  async create() {
    const byteSize = (await fs.stat(this.path)).size;
    const [videoProbe] = this.probeResult.videoStreams;
    if (!videoProbe) {
      throw new Error(
        "No video stream found in image. Should have been prevented by .validate()",
      );
    }

    const maybeFile = await lookupFileByMd5(getClient(), this.md5);
    if (maybeFile) {
      this.created = maybeFile;
    } else {
      this.created = await createFile(getClient(), {
        md5: this.md5,
        filename: basename(this.path),
        type: "image",
        mime_type: `image/${this.extension}`,
        byte_size: byteSize,
      });
    }
  }
  isComplete() {
    return this.created?.status === "ready";
  }
  async upload() {
    if (!this.created) {
      throw new Error(
        "Image not created. Should have been prevented by .isComplete()",
      );
    }
    await uploadFile(
      getClient(),
      {
        id: this.created.id,
        byte_size: Number.parseInt(this.probeResult.format.size || "0", 10),
        type: "image",
      },
      createReadableStreamFromReadable(createReadStream(this.path)),
    ).whenUploaded();
  }
  async markSynced() {
    if (!this.created) {
      throw new Error(
        "Image not created. Should have been prevented by .isComplete()",
      );
    }
    const byteSize = await this.byteSize();
    return this.syncStatus.markSynced({
      version: "1",
      complete: true,
      id: this.created.id,
      md5: this.md5,
      byte_size: byteSize,
    });
  }
}
