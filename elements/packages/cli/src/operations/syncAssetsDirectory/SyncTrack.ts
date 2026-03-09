import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import {
  type CreateFileResult,
  type CreateISOBMFFTrackPayload,
  type CreateISOBMFFTrackResult,
  createFile,
  createFileTrack,
  type LookupFileByMd5Result,
  lookupFileByMd5,
  uploadFileTrack,
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

  private _videoFile: CreateFileResult | LookupFileByMd5Result | null = null;

  get videoFile() {
    if (this._videoFile) {
      return this._videoFile;
    }
    throw new Error("Video file not found. Call prepare() first.");
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
    const maybeFile = await lookupFileByMd5(getClient(), this.md5);
    if (maybeFile) {
      this._videoFile = maybeFile;
    } else {
      this._videoFile = await createFile(getClient(), {
        md5: this.md5,
        filename: basename(this.path).replace(/\.track-[\d]+.mp4$/, ""),
        type: "video",
        byte_size: await this.byteSize(),
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
    this.videoFile;
    this.trackDuration;
  }

  async create(): Promise<void> {
    const track = this.track;
    const videoFile = this.videoFile;

    if (track.codec_type === "data") {
      throw new Error(`Unsupported codec type: ${track.codec_type}`);
    }
    const createPayload: CreateISOBMFFTrackPayload =
      track.codec_type === "audio"
        ? {
            type: track.codec_type,
            file_id: videoFile.id,
            track_id: Number(this.trackId),
            probe_info: track,
            duration_ms: Math.round(this.trackDuration * 1000),
            codec_name: track.codec_name,
            byte_size: await this.byteSize(),
          }
        : {
            type: track.codec_type,
            file_id: videoFile.id,
            track_id: Number(this.trackId),
            probe_info: track,
            duration_ms: Math.round(this.trackDuration * 1000),
            codec_name: track.codec_name,
            byte_size: await this.byteSize(),
          };

    this.created = await createFileTrack(getClient(), videoFile.id, createPayload);
  }
  isComplete() {
    return !!this.created?.complete;
  }
  async upload() {
    if (!this.created) {
      throw new Error("Track not created. Should have been prevented by .isComplete()");
    }
    await uploadFileTrack(
      getClient(),
      this.videoFile.id,
      Number(this.trackId),
      this.created.byte_size,
      createReadableStreamFromReadable(createReadStream(this.path)),
    ).whenUploaded();
  }
  async markSynced() {
    if (!this.created) {
      throw new Error("Track not created. Should have been prevented by .isComplete()");
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
