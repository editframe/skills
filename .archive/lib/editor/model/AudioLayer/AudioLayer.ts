import {
  ExtendedModel,
  Model,
  _async,
  _await,
  idProp,
  model,
  modelFlow,
  tProp,
  types,
} from "mobx-keystone";
import { yjsAdapterSnapshotProcessor } from "../yjsAdapter/yjsAdapter";
import { Layer } from "../Layer";
import { AssetNotAvailableLocally, AudioAsset } from "@/av/src/EncodedAsset";
import { fetchContext } from "@/editor/util/EncodedAsset/fetchContext";
import { computed, observable } from "mobx";
import type {
  AudioTrackSchema,
  action,
} from "~/routes/projects.$id.audio_tracks";
import { SerializeFrom } from "react-router";
import { parseByteRangeHeader } from "@/util/parseByteRangeHeader";

@model("ef/AudioUploadStatus")
export class AudioUploadStatus extends Model(
  {
    id: idProp,
    complete: tProp(types.boolean, false).withSetter(),
    byteSize: tProp(types.number),
    nextByte: tProp(types.number).withSetter(),
  },
  yjsAdapterSnapshotProcessor,
) {
  get uploadUrl() {
    return `/audio_tracks/${this.id}/chunks`;
  }

  get readUrl() {
    return `/audio_tracks/${this.id}`;
  }
}

@model("ef/AudioLayer")
export class AudioLayer extends ExtendedModel(
  Layer,
  {
    originalContainerId: tProp(types.string),
    uploadStatus: tProp(
      types.maybe(types.model(AudioUploadStatus)),
    ).withSetter(),
  },
  yjsAdapterSnapshotProcessor,
) {
  iconName = "audio_file";

  @computed
  get needsSyncUp() {
    return !(this.uploadStatus?.complete === true);
  }

  onAttachedToRootStore() {
    this.attemptSyncUp();
  }

  @modelFlow
  attemptSyncUp = _async(function* (this: AudioLayer) {
    console.log(`attemptSyncUp needsSyncUp=${this.needsSyncUp}`);
    if (this.needsSyncUp) {
      if (!this.uploadStatus) {
        yield* _await(this.acquireUploadUrl());
      }
      yield* _await(this.resumeUpload());
    }
  });

  @observable
  uploading = false;

  @modelFlow
  resumeUpload = _async(function* (this: AudioLayer) {
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

  @modelFlow
  acquireUploadUrl = _async(function* (this: AudioLayer) {
    if (this.uploadStatus) {
      throw new Error("Already acquired upload url.");
    }
    const asset = (yield* _await(this.#loadAsset())) as AudioAsset | undefined;
    if (!asset) {
      throw new Error("No asset to upload");
    }

    const response = yield* _await(
      fetch("/projects/" + this.composition.id + "/audio_tracks", {
        method: "POST",
        body: JSON.stringify({
          originalContainerId: this.originalContainerId,
          duration_ms: this.intrinsicDurationMs,
          bytesize: asset.byteSize,
          codec: asset.audioCodec,
          format: asset.containerFormat,
          samplerate: asset.samplerate,
          channel_count: asset.channelCount,
        } satisfies AudioTrackSchema),
      }),
    );

    if (!response.ok) {
      throw new Error("Failed to acquire upload URL");
    }

    const created = (yield* _await(response.json())) as SerializeFrom<
      typeof action
    >;

    this.setUploadStatus(new AudioUploadStatus(created));
  });

  audioBuffer: AudioBuffer | null = null;

  _audioAsset?: AudioAsset;
  @observable
  mediaMissing = false;

  async createEncodedAssetFromBufferList(bufferList: ArrayBuffer[]) {
    return await this.assetStorageProvider.createFromBufferList(
      this.id,
      bufferList,
    );
  }

  async loadAssetFromId(id: string) {
    return await this.assetStorageProvider.readableStreamFromId(id);
  }

  async #loadAsset(): Promise<AudioAsset | undefined> {
    if (!this._audioAsset) {
      try {
        const readableStream =
          await this.assetStorageProvider.readableStreamFromId(this.id);
        this._audioAsset = await AudioAsset.createFromReadableStream(
          this.id,
          readableStream,
          await this.assetStorageProvider.fileFromId(this.id),
        );
      } catch (error) {
        if (error instanceof AssetNotAvailableLocally) {
          console.info("AudioLayer loadAsset failed", error);
          if (this.uploadStatus?.complete) {
            const readableStream =
              await this.assetStorageProvider.readableStreamFromURL(
                this.id,
                this.uploadStatus.readUrl,
                fetchContext.get(this),
              );

            this._audioAsset = await AudioAsset.createFromReadableStream(
              this.id,
              readableStream,
              await this.assetStorageProvider.fileFromId(this.id),
            );
          }
          this.mediaMissing = true;
        } else {
          throw error;
        }
      }
    }
    return this._audioAsset;
  }

  static async fetchAudioBufferFor(layer: AudioLayer): Promise<void> {
    // Already fetched buffer, no need to re-fetch
    if (layer.audioBuffer !== null) {
      return;
    }
    const audioContext = new OfflineAudioContext(1, 48000 / 25, 48000);

    const audioAsset = await layer.#loadAsset();
    const audioData = await audioAsset!.arrayBuffer();

    try {
      layer.audioBuffer = await audioContext.decodeAudioData(audioData);
    } catch (error) {
      console.error("Error parsing audio from URL", error);
    }
  }

  fetchingAudioBuffer = false;

  async getFrequencyData(timeMs: number): Promise<Uint8Array> {
    if (this.audioBuffer === null) {
      // TODO: This is a hack to make sure we don't try to fetch the audio buffer while we're already fetching it.
      // But it's not a great locking system.
      if (this.fetchingAudioBuffer) {
        return new Uint8Array();
      }
      this.fetchingAudioBuffer = true;
      await AudioLayer.fetchAudioBufferFor(this);
      this.fetchingAudioBuffer = false;
    }
    const audioContext = new OfflineAudioContext(1, 48000 / 25, 48000);
    const audioBufferSource = audioContext.createBufferSource();
    audioBufferSource.buffer = this.audioBuffer;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    audioBufferSource.connect(analyser);
    audioBufferSource.start(0, timeMs / 1000, 48000 / 1000);
    await audioContext.startRendering();
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
  }

  async renderToCanvas(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): Promise<void> {
    try {
      // ctx.translate(this.translateX, this.translateY);
      const audioAsset = await this.#loadAsset();
      if (!audioAsset) {
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
        const frequencyData = await this.getFrequencyData(
          this.trimAdjustedCurrentTimeMs,
        );
        const width = this.cssWidth;
        const height = this.cssHeight;
        const barWidth = (width / frequencyData.length) * 4;
        let x = 0;
        for (let i = 0; i < frequencyData.length; i++) {
          const barHeight = height * (frequencyData[i]! / 256);
          ctx.fillStyle = "red";
          ctx.fillRect(x, (height - barHeight) / 2, barWidth, barHeight);
          if (frequencyData[i]! > 0) {
            ctx.strokeRect(x, (height - barHeight) / 2, barWidth, barHeight);
          }
          x += barWidth;
        }
      }
    } catch (error) {
      console.error("Error rendering audio layer", error);
    }
  }
}
