import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path, { basename } from "node:path";

import {
  type CreateImageFileResult,
  createImageFile,
  type LookupImageFileByMd5Result,
  lookupImageFileByMd5,
  uploadImageFile,
} from "@editframe/api";

import { Probe } from "@editframe/assets";

import { createReadableStreamFromReadable } from "../../utils/createReadableStreamFromReadable.js";
import { getClient } from "../../utils/index.js";
import type { SubAssetSync } from "./SubAssetSync.js";
import { SyncStatus } from "./SyncStatus.js";

export class SyncImage implements SubAssetSync<CreateImageFileResult> {
  icon = "🖼️";
  label = "image";
  syncStatus: SyncStatus = new SyncStatus(this.path);
  created: CreateImageFileResult | LookupImageFileByMd5Result | null = null;

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

    const maybeImageFile = await lookupImageFileByMd5(getClient(), this.md5);
    if (maybeImageFile) {
      this.created = maybeImageFile;
    } else {
      this.created = await createImageFile(getClient(), {
        md5: this.md5,
        filename: basename(this.path),
        width: videoProbe.width,
        height: videoProbe.height,
        mime_type: `image/${this.extension}` as
          | "image/jpeg"
          | "image/png"
          | "image/jpg"
          | "image/webp"
          | "image/svg+xml",
        byte_size: byteSize,
      });
    }
  }
  isComplete() {
    return !!this.created?.complete;
  }
  async upload() {
    if (!this.created) {
      throw new Error(
        "Image not created. Should have been prevented by .isComplete()",
      );
    }
    await uploadImageFile(
      getClient(),
      {
        id: this.created.id,
        byte_size: Number.parseInt(this.probeResult.format.size || "0", 10),
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
