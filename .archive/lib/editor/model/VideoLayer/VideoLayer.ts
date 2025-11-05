import {
  ExtendedModel,
  model,
  tProp,
  types,
  modelFlow,
  _async,
  _await,
  idProp,
  Model,
} from "mobx-keystone";
import { Layer } from "../Layer";
import { yjsAdapterSnapshotProcessor } from "../yjsAdapter/yjsAdapter";
import { computed, observable } from "mobx";
import type {
  VideoTrackSchema,
  action,
} from "~/routes/projects.$id.video_tracks";
import type { SerializeFrom } from "react-router";
import { AssetNotAvailableLocally, VideoAsset } from "@/av/src/EncodedAsset";
import { fetchContext } from "@/editor/util/EncodedAsset/fetchContext";
import { parseByteRangeHeader } from "@/util/parseByteRangeHeader";

@model("ef/VideoUploadStatus")
export class VideoUploadStatus extends Model(
  {
    id: idProp,
    complete: tProp(types.boolean, false).withSetter(),
    byteSize: tProp(types.number),
    nextByte: tProp(types.number).withSetter(),
  },
  yjsAdapterSnapshotProcessor,
) {
  get uploadUrl() {
    return `/video_tracks/${this.id}/chunks`;
  }

  get readUrl() {
    return `/video_tracks/${this.id}`;
  }
}

@model("ef/VideoLayer")
export class VideoLayer extends ExtendedModel(
  Layer,
  {
    originalContainerId: tProp(types.string),
    intrinsicWidth: tProp(types.number, 0),
    intrinsicHeight: tProp(types.number, 0),
    uploadStatus: tProp(
      types.maybe(types.model(VideoUploadStatus)),
    ).withSetter(),
  },
  yjsAdapterSnapshotProcessor,
) {
  iconName = "movie";

  @computed
  get needsSyncUp() {
    return !(this.uploadStatus?.complete === true);
  }

  onAttachedToRootStore() {
    this.attemptSyncUp();
  }

  @modelFlow
  attemptSyncUp = _async(function* (this: VideoLayer) {
    console.log(`attemptSyncUp needsSyncUp=${this.needsSyncUp}`);
    if (this.needsSyncUp) {
      if (!this.uploadStatus) {
        yield* _await(this.acquireUploadUrl());
      }
      yield* _await(this.resumeUpload());
    }
  });

  @modelFlow
  acquireUploadUrl = _async(function* (this: VideoLayer) {
    if (this.uploadStatus) {
      throw new Error("Already acquired upload url.");
    }
    const asset = (yield* _await(this.#loadAsset())) as VideoAsset | undefined;
    if (!asset) {
      throw new Error("No asset to upload");
    }

    const response = yield* _await(
      fetch("/projects/" + this.composition.id + "/video_tracks", {
        method: "POST",
        body: JSON.stringify({
          originalContainerId: this.originalContainerId,
          duration_ms: this.intrinsicDurationMs,
          bytesize: asset.byteSize,
          codec: asset.videoCodec,
          format: asset.containerFormat,
          width: this.intrinsicWidth,
          height: this.intrinsicHeight,
          fragments: asset.fragmentInfo,
        } satisfies VideoTrackSchema),
      }),
    );

    if (!response.ok) {
      throw new Error("Failed to acquire upload URL");
    }

    const created = (yield* _await(response.json())) as SerializeFrom<
      typeof action
    >;

    this.setUploadStatus(new VideoUploadStatus(created));
  });

  @observable
  uploading = false;

  @modelFlow
  resumeUpload = _async(function* (this: VideoLayer) {
    if (this.uploading) {
      throw new Error("Already uploading");
    }
    if (!this.uploadStatus) {
      throw new Error("No upload to resume");
    }
    if (this.uploadStatus.complete) {
      console.log("Upload already complete");
      return;
    }

    this.uploading = true;

    const asset = yield* _await(this.#loadAsset());
    if (!asset) {
      throw new Error("No asset to upload");
    }

    let chunkSize = 1024 * 1024 * 2; // 8 MiB chunk suggested by GCP
    let complete = false;
    while (complete === false) {
      let endByte = Math.min(
        this.uploadStatus.nextByte + chunkSize - 1,
        this.uploadStatus.byteSize - 1,
      );

      const chunkResult = yield* _await(
        fetch(this.uploadStatus.uploadUrl, {
          redirect: "manual",
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Range": `bytes=${this.uploadStatus.nextByte}-${endByte}/${this.uploadStatus.byteSize}`,
          },
          body: asset.slice(this.uploadStatus.nextByte, endByte + 1),
        }),
      );

      if (chunkResult.status === 201) {
        complete = false;
        this.uploadStatus.setComplete(true);
        this.uploading = false;
        break;
      }
      if (chunkResult.status !== 202) {
        console.log("Chunk upload failed", yield* _await(chunkResult.json()));
        throw new Error("Chunk upload failed");
      }

      const rangeHeader = chunkResult.headers.get("content-range");
      if (!rangeHeader) {
        throw new Error("No range header from server");
      }

      const returnedRange = parseByteRangeHeader(rangeHeader);
      if (!returnedRange) {
        throw new Error("Invalid range header from server");
      }

      console.log("Returned range", returnedRange);

      this.uploadStatus.setNextByte(returnedRange.end + 1);
    }

    this.uploading = false;
  });

  _videoAsset?: VideoAsset;
  @observable
  mediaMissing = false;

  async createEncodedAssetFromBufferList(bufferList: ArrayBuffer[]) {
    return await this.assetStorageProvider.createFromBufferList(
      this.id,
      bufferList,
    );
  }

  async #loadAsset(): Promise<VideoAsset | undefined> {
    if (!this._videoAsset) {
      try {
        const readableStream =
          await this.assetStorageProvider.readableStreamFromId(this.id);
        this._videoAsset = await VideoAsset.createFromReadableStream(
          this.id,
          readableStream,
          await this.assetStorageProvider.fileFromId(this.id),
        );
      } catch (error) {
        if (error instanceof AssetNotAvailableLocally) {
          console.info("VideoLayer loadAsset failed", error);
          if (this.uploadStatus?.complete) {
            const readableStream =
              await this.assetStorageProvider.readableStreamFromURL(
                this.id,
                this.uploadStatus.readUrl,
                fetchContext.get(this),
              );
            this._videoAsset = await VideoAsset.createFromReadableStream(
              this.id,
              readableStream,
              await this.assetStorageProvider.fileFromId(this.id),
            );
          } else {
            this.mediaMissing = true;
          }
        } else {
          throw error;
        }
      }
    }
    return this._videoAsset;
  }

  async renderToCanvas(ctx: CanvasRenderingContext2D) {
    try {
      // ctx.translate(this.translateX, this.translateY);
      const videoAsset = await this.#loadAsset();
      if (!videoAsset) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 10;
        ctx.strokeStyle = "red";
        ctx.strokeRect(0, 0, this.cssWidth, this.cssHeight);

        ctx.font = "40px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("Media missing", this.cssWidth / 2, this.cssHeight / 2);
      } else {
        const time = this.trimAdjustedCurrentTimeMs / 1000;

        const frame = await videoAsset.seekToTime(time);
        if (frame) {
          ctx.drawImage(frame, 0, 0, this.cssWidth, this.cssHeight);
        }
      }
    } catch (error) {
      console.log("VideoLayer draw failed", error);
    }
  }
}
