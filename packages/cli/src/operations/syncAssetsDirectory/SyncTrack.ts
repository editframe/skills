import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import {
  type CreateISOBMFFFileResult,
  type CreateISOBMFFTrackPayload,
  type CreateISOBMFFTrackResult,
  createISOBMFFFile,
  createISOBMFFTrack,
  type LookupISOBMFFFileByMd5Result,
  lookupISOBMFFFileByMd5,
  uploadISOBMFFTrack,
} from "@editframe/api";
import { Probe } from "@editframe/assets";

import { createReadableStreamFromReadable } from "../../utils/createReadableStreamFromReadable.js";
import { getClient } from "../../utils/index.js";
import type { SubAssetSync } from "./SubAssetSync.js";
import { SyncStatus } from "./SyncStatus.js";

export class SyncTrack implements SubAssetSync<CreateISOBMFFTrackResult> {
  icon = "📼";
  label = "track";
  syncStatus = new SyncStatus(this.path);
  fileSyncStatus = new SyncStatus(join(dirname(this.path), "isobmff"));
  created: CreateISOBMFFTrackResult | null = null;

  constructor(
    public path: string,
    public md5: string,
  ) {}

  private _isoFile:
    | CreateISOBMFFFileResult
    | LookupISOBMFFFileByMd5Result
    | null = null;

  get isoFile() {
    if (this._isoFile) {
      return this._isoFile;
    }
    throw new Error("ISOBMFF file not found. Call prepare() first.");
  }

  async byteSize() {
    return (await fs.stat(this.path)).size;
  }

  private _probeResult: Probe | null = null;
  get probeResult() {
    if (this._probeResult) {
      return this._probeResult;
    }
    throw new Error("Probe result not found. Call prepare() first.");
  }

  get track() {
    const [track] = this.probeResult.streams;
    if (track) {
      return track;
    }
    throw new Error(`No track found in track: ${this.path}`);
  }

  async prepare() {
    const maybeIsoFile = await lookupISOBMFFFileByMd5(getClient(), this.md5);
    if (maybeIsoFile) {
      this._isoFile = maybeIsoFile;
    } else {
      this._isoFile = await createISOBMFFFile(getClient(), {
        md5: this.md5,
        filename: basename(this.path).replace(/\.track-[\d]+.mp4$/, ""),
      });
    }
    this._probeResult = await Probe.probePath(this.path);
  }

  get trackId() {
    const trackId = this.path.match(/track-([\d]+).mp4/)?.[1];
    if (!trackId) {
      throw new Error(`No track ID  found for track: ${this.path}`);
    }
    return trackId;
  }

  get trackDuration() {
    const track = this.track;
    if (!track.duration) {
      throw new Error(`No duration found in track: ${this.path}`);
    }
    if (typeof track.duration === "string") {
      return Number.parseFloat(track.duration);
    }
    return track.duration;
  }

  async validate() {
    this.trackId;
    this.isoFile;
    this.trackDuration;
  }

  async create(): Promise<void> {
    const track = this.track;
    const isoFile = this.isoFile;

    if (track.codec_type === "data") {
      throw new Error(`Unsupported codec type: ${track.codec_type}`);
    }
    const createPayload: CreateISOBMFFTrackPayload =
      track.codec_type === "audio"
        ? {
            type: track.codec_type,
            file_id: isoFile.id,
            track_id: Number(this.trackId),
            probe_info: track,
            duration_ms: Math.round(this.trackDuration * 1000),
            codec_name: track.codec_name,
            byte_size: await this.byteSize(),
          }
        : {
            type: track.codec_type,
            file_id: isoFile.id,
            track_id: Number(this.trackId),
            probe_info: track,
            duration_ms: Math.round(this.trackDuration * 1000),
            codec_name: track.codec_name,
            byte_size: await this.byteSize(),
          };

    this.created = await createISOBMFFTrack(getClient(), createPayload);
  }
  isComplete() {
    return !!this.created?.complete;
  }
  async upload() {
    if (!this.created) {
      throw new Error(
        "Track not created. Should have been prevented by .isComplete()",
      );
    }
    await uploadISOBMFFTrack(
      getClient(),
      this.isoFile.id,
      Number(this.trackId),
      createReadableStreamFromReadable(createReadStream(this.path)),
      this.created?.byte_size,
    ).whenUploaded();
  }
  async markSynced() {
    if (!this.created) {
      throw new Error(
        "Track not created. Should have been prevented by .isComplete()",
      );
    }
    const byteSize = await this.byteSize();
    await Promise.all([
      this.syncStatus.markSynced({
        version: "1",
        complete: true,
        id: `${this.created.file_id}:${this.created.track_id}`,
        md5: this.md5,
        byte_size: byteSize,
      }),
      this.fileSyncStatus.markSynced({
        version: "1",
        complete: true,
        id: this.created.file_id,
        md5: this.md5,
        byte_size: byteSize,
      }),
    ]);
  }
}
