import {
  ExtendedModel,
  model,
  tProp,
  types,
  _async,
  _await,
  idProp,
  Model,
  ModelCreationData,
  modelFlow,
} from "mobx-keystone";
import { Layer } from "../Layer";
import { yjsAdapterSnapshotProcessor } from "../yjsAdapter/yjsAdapter";
import { computed, observable } from "mobx";
import { parseByteRangeHeader } from "@/util/parseByteRangeHeader";
import { AssetNotAvailableLocally, ImageAsset } from "@/av/src/EncodedAsset";
import { fetchContext } from "@/editor/util/EncodedAsset/fetchContext";
import { action, ImageSchema } from "~/routes/projects.$id.images";
import { SerializeFrom } from "react-router";
import { SizeMode } from "../types";
@model("ef/ImageUploadStatus")
export class ImageUploadStatus extends Model(
  {
    id: idProp,
    complete: tProp(types.boolean, false).withSetter(),
    byteSize: tProp(types.number),
    nextByte: tProp(types.number).withSetter(),
  },
  yjsAdapterSnapshotProcessor,
) {
  get uploadUrl() {
    return `/images/${this.id}/chunks`;
  }

  get readUrl() {
    return `/images/${this.id}`;
  }
}
@model("ef/ImageLayer")
export class ImageLayer extends ExtendedModel(
  Layer,
  {
    intrinsicWidth: tProp(types.number, 0),
    intrinsicHeight: tProp(types.number, 0),
    uploadStatus: tProp(
      types.maybe(types.model(ImageUploadStatus)),
    ).withSetter(),
  },
  yjsAdapterSnapshotProcessor,
) {
  iconName = "image";
  static async createFromFile(
    file: File,
    props: Omit<
      ModelCreationData<ImageLayer>,
      | "intrinsicWidth"
      | "intrinsicHeight"
      | "fixedWidth"
      | "fixedHeight"
      | "widthMode"
      | "heightMode"
    > = {},
  ): Promise<ImageLayer> {
    const srcUrl = URL.createObjectURL(file);
    const probe = new Image();
    const probePromise = new Promise((resolve, reject) => {
      probe.addEventListener("load", resolve);
      probe.addEventListener("error", reject);
    });
    probe.src = srcUrl;
    await probePromise;
    const layer = new ImageLayer({
      ...props,
      widthMode: SizeMode.Fixed,
      heightMode: SizeMode.Fixed,
      intrinsicWidth: probe.naturalWidth,
      intrinsicHeight: probe.naturalHeight,
      fixedWidth: probe.naturalWidth,
      fixedHeight: probe.naturalHeight,
    });
    URL.revokeObjectURL(srcUrl);
    return layer;
  }

  _image: HTMLImageElement | null = null;

  async createEncodedAssetFromStream(stream: ReadableStream): Promise<void> {
    return await this.assetStorageProvider.createFromReadableStream(
      this.id,
      stream,
    );
  }

  async renderToCanvas(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): Promise<void> {
    try {
      const imageAsset = await this.loadAsset();
      if (!imageAsset) {
        throw new Error("No image asset");
      }

      this._image ||= await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          resolve(img);
        };
        img.onerror = (event) => {
          if (event instanceof Event) {
            if (event.type === "error") {
              console.error("Error loading image", img.src, event);
            }
          }
          reject(event);
        };
        img.src = imageAsset.objectUrl;
      });

      ctx.drawImage(
        this._image,
        0,
        0,
        this._image.naturalWidth,
        this._image.naturalHeight,
        0,
        0,
        this.cssWidth,
        this.cssHeight,
      );
    } catch (error) {
      console.error("Error rendering ImageLayer");
      console.error(error);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
    }
  }
  @computed
  get needsSyncUp() {
    return !(this.uploadStatus?.complete === true);
  }

  onAttachedToRootStore() {
    this.attemptSyncUp();
  }

  @modelFlow
  attemptSyncUp = _async(function* (this: ImageLayer) {
    console.log(`attemptSyncUp needsSyncUp=${this.needsSyncUp}`);
    if (this.needsSyncUp) {
      if (!this.uploadStatus) {
        yield* _await(this.acquireUploadUrl());
      }
      yield* _await(this.resumeUpload());
    }
  });

  @modelFlow
  acquireUploadUrl = _async(function* (this: ImageLayer) {
    if (this.uploadStatus) {
      throw new Error("Already acquired upload url.");
    }
    const asset = (yield* _await(this.loadAsset())) as ImageAsset | undefined;
    if (!asset) {
      throw new Error("No asset to upload");
    }

    const response = yield* _await(
      fetch("/projects/" + this.composition.id + "/images", {
        method: "POST",
        body: JSON.stringify({
          bytesize: asset.byteSize,
          format: asset.format,
          height: this.intrinsicHeight,
          width: this.intrinsicWidth,
        } satisfies ImageSchema),
      }),
    );

    if (!response.ok) {
      throw new Error("Failed to acquire upload URL");
    }

    const created = (yield* _await(response.json())) as SerializeFrom<
      typeof action
    >;

    this.setUploadStatus(new ImageUploadStatus(created));
  });

  @observable
  uploading = false;

  @modelFlow
  resumeUpload = _async(function* (this: ImageLayer) {
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

    const asset = yield* _await(this.loadAsset());
    console.log("Resuming upload", this.uploadStatus, asset);
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

  _imageAsset?: ImageAsset;
  @observable
  mediaMissing = false;

  async loadAsset(): Promise<ImageAsset | undefined> {
    if (!this._imageAsset) {
      try {
        this._imageAsset = await ImageAsset.createFromReadableStream(
          this.id,
          await this.assetStorageProvider.fileFromId(this.id),
        );
      } catch (error) {
        if (error instanceof AssetNotAvailableLocally) {
          console.info("ImageLayer loadAsset failed", error);
          if (this.uploadStatus?.complete) {
            await this.assetStorageProvider.readableStreamFromURL(
              this.id,
              this.uploadStatus.readUrl,
              fetchContext.get(this),
            );
            this._imageAsset = await ImageAsset.createFromReadableStream(
              this.id,
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
    return this._imageAsset;
  }
}
