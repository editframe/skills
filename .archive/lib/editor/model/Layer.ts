import { computed, observable, reaction } from "mobx";
import {
  type AnyModel,
  Model,
  getParent,
  idProp,
  model,
  modelAction,
  getRoot,
  tProp,
  types,
  getRefsResolvingTo,
  IdentityType,
} from "mobx-keystone";
import { SizeMode, TimeMode, ContainerTimeMode } from "./types";
import type { TimeGroup } from "./TimeGroup/TimeGroup";
import { type CSSProperties } from "react";
import { LayerComposition } from "./LayerComposition";
import { compositionLayerRef } from "./compositionLayerRef";
import { type Editor } from "./Editor";
import { yjsAdapterSnapshotProcessor } from "./yjsAdapter/yjsAdapter";
import { rotatePoint } from "../rotatePoint";
import { ImageAsset } from "../../av/src/EncodedAsset";
import { storageContext } from "../util/EncodedAsset/storageContext";
import { MP4File } from "../../av/src/MP4File";
import * as MP4Box from "mp4box";
import { uuidv4 } from "lib0/random.js";
import { NavigatorStorage } from "../util/EncodedAsset/NavigatorStorage";
import { AudioLayer } from "./AudioLayer/AudioLayer";

@model("ef/Trim")
export class Trim extends Model(
  {
    startMs: tProp(types.number, 0).withSetter(),
    endMs: tProp(types.number, 0).withSetter(),
  },
  yjsAdapterSnapshotProcessor,
) {}

const EFTag = Symbol("EFTag");
const RangeTagSymbol = Symbol("RangeTag");

interface RangeOptions {
  min: number;
  max: number;
  step: number;
}
interface RangeTag extends RangeOptions {
  [EFTag]: typeof RangeTagSymbol;
}

export const isRangeTag = (tag: any): tag is RangeTag =>
  tag[EFTag] === RangeTagSymbol;

const rangeType = (options: RangeOptions): IdentityType<number> =>
  types.tag(types.number, {
    [EFTag]: RangeTagSymbol,
    ...options,
  });

@model("ef/Layer")
export class Layer extends Model(
  {
    id: idProp,
    title: tProp(types.string, "").withSetter(),

    isComponent: tProp(types.boolean, false),

    // Temporal Layer Props
    fixedStartMs: tProp(types.number, 0).withSetter(),
    intrinsicDurationMs: tProp(types.number, 0).withSetter(),
    timeMode: tProp(types.enum(TimeMode), TimeMode.Fixed).withSetter(),

    trim: tProp(types.model(Trim), () => new Trim({})),
    speed: tProp(types.number, 1).withSetter(),
    animation: tProp(types.maybe(types.string)).withSetter(),

    widthMode: tProp(types.enum(SizeMode), SizeMode.Fill).withSetter(),
    fixedWidth: tProp(types.number, 0).withSetter(),

    heightMode: tProp(types.enum(SizeMode), SizeMode.Fill).withSetter(),
    fixedHeight: tProp(types.number, 0).withSetter(),

    // Visual Layer Props
    scaleX: tProp(types.number, 1).withSetter(),
    scaleY: tProp(types.number, 1).withSetter(),
    skewX: tProp(types.number, 0).withSetter(),
    skewY: tProp(types.number, 0).withSetter(),
    translateX: tProp(types.number, 0).withSetter(),
    translateY: tProp(types.number, 0).withSetter(),
    translateZ: tProp(types.number, 0).withSetter(),
    // TODO: deprecate rotate in favor of rotateX, rotateY, rotateZ
    rotate: tProp(types.number, 0).withSetter(),
    rotateX: tProp(types.number, 0).withSetter(),
    rotateY: tProp(types.number, 0).withSetter(),
    rotateZ: tProp(types.number, 0).withSetter(),
    opacity: tProp(rangeType({ min: 0, max: 1, step: 0.1 }), 1).withSetter(),
    // crop: prop<CropDefinition>(() => ({})),
    // dropShadows: prop<DropShadowFilter[]>(() => []),

    // Filter Props
    // blur: prop<Maybe<BlurFilter>>(),
    // brightness: prop<Maybe<BrightnessFilter>>(),
    // contrast: prop<Maybe<ContrastFilter>>(),
    // grayscale: prop<Maybe<GrayscaleFilter>>(),
    // hueRotate: prop<Maybe<HueRotateFilter>>(),
    // invert: prop<Maybe<InvertFilter>>(),
    // opacityFilter: prop<Maybe<OpacityFilter>>(),
    // saturate: prop<Maybe<SaturateFilter>>(),
    // sepia: prop<Maybe<SepiaFilter>>(),
  },
  yjsAdapterSnapshotProcessor,
) {
  iconName = "report";

  @observable
  currentTimeMs = 0;

  @observable
  private _isPlaying = false;

  @modelAction
  togglePlay(): void {
    if (this._isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  @modelAction
  play(): void {
    this._isPlaying = true;
  }

  @modelAction
  pause(): void {
    this._isPlaying = false;
  }

  @computed
  get absoluteControlPoint(): Point2D {
    return {
      x: this.fixedWidth / 2,
      y: this.fixedHeight / 2,
    };
  }

  cornerPoint(xMagnitude: number, yMagnitude: number): Point2D {
    return rotatePoint(
      this.absoluteControlPoint.x,
      this.absoluteControlPoint.y,
      this.translateX + xMagnitude * this.fixedWidth,
      this.translateY + yMagnitude * this.fixedHeight,
      this.zRadians,
    );
  }

  @computed
  get isPlaying(): boolean {
    const editor = getRoot<Editor>(this);
    return this._isPlaying && editor.selectedTemporalRoot === this;
  }

  @modelAction
  trimStartByMs(deltaMs: number): void {
    this.setFixedStartMs(Math.max(0, this.fixedStartMs + deltaMs));
    this.trim.startMs = Math.max(0, this.trim.startMs + deltaMs);
  }

  @modelAction
  trimEndByMs(deltaMs: number): void {
    this.trim.endMs = Math.max(0, this.trim.endMs - deltaMs);
  }

  onAttachedToRootStore(): void {
    let lastTime = performance.now();
    const advanceTime = (): void => {
      requestAnimationFrame((newT) => {
        if (this.isPlaying) {
          this.setCurrentTimeMs(this.currentTimeMs + (newT - lastTime));
          lastTime = newT;
          advanceTime();
        }
      });
    };

    reaction(
      () => this.isPlaying,
      (isPlaying) => {
        if (isPlaying) {
          advanceTime();
        }
      },
    );
  }

  @modelAction
  setCurrentTimeMs(currentTimeMs: number): void {
    this.currentTimeMs = Math.min(Math.max(0, currentTimeMs), this.durationMs);
  }

  @computed
  get trimAdjustedCurrentTimeMs(): number {
    return this.currentTimeMs + (this.trim.startMs ?? 0);
  }

  @computed
  get oneLineTitle(): string {
    if (this.title !== undefined && this.title !== "") {
      return this.title;
    } else {
      return `Untitled ${this.$modelType}`;
    }
  }

  @observable
  stageRef?: HTMLElement;

  get stageWidth(): number {
    return this.stageRef?.offsetWidth ?? 0;
  }

  // @deprecated - scaling this element by it's stage width makes no sense
  get scaledStageWidth(): number {
    return (this.stageRef?.offsetWidth ?? 0) * this.scaleX;
  }

  get stageHeight(): number {
    return this.stageRef?.offsetHeight ?? 0;
  }

  // @deprecated - scaling this element by it's stage width makes no sense
  get scaledStageHeight(): number {
    return (this.stageRef?.offsetHeight ?? 0) * this.scaleY;
  }

  get scaledStageCenterX(): number {
    return this.scaledStageWidth / 2;
  }

  get scaledStageCenterY(): number {
    return this.scaledStageHeight / 2;
  }

  // FIXME: could cause a problem if stage ref is overwritten;
  // Which might arise if there are multiple render targets, such
  // as with a multi-canvas renderer / or a mini-map, for example
  //          classic 1 to N problem
  @modelAction
  setStageRef(ref?: HTMLElement): void {
    this.stageRef = ref;
  }

  @modelAction
  clearStageRef(): void {
    this.stageRef = undefined;
  }

  @modelAction
  moveBy(deltaX: number, deltaY: number): void {
    this.translateX += deltaX;
    this.translateY += deltaY;
  }

  @modelAction
  moveFixedStartMs(deltaMs: number): void {
    this.fixedStartMs += deltaMs;
  }

  @modelAction
  rotateBy(angles: { x?: number; y?: number; z?: number }): void {
    this.rotateX += angles.x ?? 0;
    this.rotateY += angles.y ?? 0;
    this.rotateZ += angles.z ?? 0;
  }

  @modelAction
  scaleBy(scales: { x?: number; y?: number }): void {
    this.scaleX += scales.x ?? 0;
    this.scaleY += scales.y ?? 0;
  }

  @computed
  get endMs(): number {
    return this.startMs + this.durationMs;
  }

  @computed
  get siblings(): Layer[] | undefined {
    return this.timeGroup?.childLayers;
  }

  @computed
  get ownIndex(): number {
    if (this.siblings) {
      return this.siblings.indexOf(this);
    }
    return -1;
  }

  @computed
  get isTemporalRoot(): boolean {
    return this.timeGroup === undefined;
  }

  @computed
  get cumulativeTranslateX(): number {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let layer: Layer | undefined = this;
    let cumulativeTranslateX = 0;
    while (layer !== undefined) {
      cumulativeTranslateX += layer.translateX;
      layer = layer.spatialContainer;
    }
    return cumulativeTranslateX;
  }

  @computed
  get cumulativeTranslateY(): number {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let layer: Layer | undefined = this;
    let cumulativeTranslateY = 0;
    while (layer !== undefined) {
      cumulativeTranslateY += layer.translateY;
      layer = layer.spatialContainer;
    }
    return cumulativeTranslateY;
  }

  get composition(): LayerComposition {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let maybeComposition: LayerComposition | AnyModel | undefined = this;
    while (
      maybeComposition !== undefined &&
      !(maybeComposition instanceof LayerComposition)
    ) {
      maybeComposition = getParent(maybeComposition);
    }
    if (!maybeComposition) {
      throw new Error("Could not find composition");
    }
    return maybeComposition;
  }

  // TODO: Due to a circular dependency between Layer and TimeGroup,
  // the return type is asserted.
  @computed
  get timeGroup(): TimeGroup | undefined {
    if (
      // Because of a circular dependency, we need to check against the modelType string
      this.temporalContainer?.$modelType === "ef/TimeGroup"
    ) {
      // Doing a type assertion because of a circular dependency between TimeGroup and Layer
      return this.temporalContainer as TimeGroup;
    }
  }

  @computed
  get parentLayer(): Layer | undefined {
    const refs = getRefsResolvingTo(this, compositionLayerRef);
    const refsArray = Array.from(refs.values());
    if (refsArray.length === 0) {
      return undefined;
    }
    if (refsArray.length > 1) {
      throw new Error("Layer has more than one parent");
    }
    const siblings = getParent(refsArray[0]);
    if (siblings === undefined) {
      return undefined;
    }
    return getParent(siblings);
  }

  @computed
  get temporalContainer(): TimeGroup | LayerComposition | undefined {
    if (
      // Because of a circular dependency, we need to check against the modelType string
      this.parentLayer?.$modelType === "ef/TimeGroup" ||
      this.parentLayer?.$modelType === "ef/LayerComposition"
    ) {
      return this.parentLayer as TimeGroup | LayerComposition;
    }
  }

  @computed
  get spatialContainer(): Layer | undefined {
    if (this.parentLayer?.$modelType === "ef/TimeGroup") {
      return this.parentLayer;
    }
  }

  @computed
  get startMs(): number {
    if (!this.timeGroup) {
      return this.fixedStartMs;
    } else if (
      this.timeGroup.containerTimeMode === ContainerTimeMode.Sequence
    ) {
      // in sequence mode, the startMs is the sum of the previous siblings' durations
      const siblings = this.siblings;
      if (siblings) {
        let startMs = 0;
        for (let i = 0; i < this.ownIndex; i++) {
          startMs += siblings[i].durationMs;
        }
        return startMs;
      }
    } else if (this.timeGroup.containerTimeMode === ContainerTimeMode.Fit) {
      return this.fixedStartMs;
    } else if (this.timeGroup.containerTimeMode === ContainerTimeMode.Fixed) {
      return this.fixedStartMs;
    }
    throw new Error(
      `Unknown time group mode: ${this.timeGroup.containerTimeMode}`,
    );
  }

  @computed
  get durationMs(): number {
    if (
      this.timeMode === TimeMode.Fill &&
      this.timeGroup &&
      this.timeGroup.containerTimeMode !== ContainerTimeMode.Sequence
    ) {
      return this.timeGroup.durationMs;
    }
    return (
      this.intrinsicDurationMs * this.speed -
      (this.trim.startMs ?? 0) -
      (this.trim.endMs ?? 0)
    );
  }

  @computed
  get zRadians(): number {
    return this.rotateZ * (Math.PI / 180);
  }

  @computed
  get cssTransform(): string {
    return `
      translateZ(${this.translateZ}px)
      rotateX(${this.rotateX}deg)
      rotateY(${this.rotateY}deg)
      rotateZ(${this.rotateZ}deg)
      scaleX(${this.scaleX})
      scaleY(${this.scaleY})
      scaleZ(1)
    `;
  }

  @computed
  get frameBuffer(): OffscreenCanvas {
    return new OffscreenCanvas(this.cssWidth, this.cssHeight);
  }

  @computed
  get frameBufferCtx(): OffscreenCanvasRenderingContext2D {
    const ctx = this.frameBuffer.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get frameBuffer context");
    }
    return ctx;
  }

  clearFrameBuffer(): void {
    this.frameBufferCtx.clearRect(0, 0, this.cssWidth, this.cssHeight);
  }

  /**
   * Gets the CSS width value for the layer.
   * If the width mode is "Auto", returns "auto".
   * If the width mode is "Fixed", returns the fixed width value in pixels.
   * If the width mode is "Fill" or "Fit", returns "100%" if the time group is available, otherwise returns "auto".
   * @returns The CSS width value for the layer.
   * @throws {Error} If the width mode is unknown.
   */
  @computed
  get cssWidth(): number {
    if (this.widthMode === SizeMode.Fixed) {
      return this.fixedWidth;
    } else if (
      this.widthMode === SizeMode.Fill ||
      this.widthMode === SizeMode.Fit
    ) {
      if (!this.spatialContainer) {
        throw new Error(
          `Cannot compute cssWidth for layer with width mode ${this.widthMode} because it has no spatial container`,
        );
      }
      return this.spatialContainer.cssWidth;
    }
    throw new Error(`Unknown width mode: ${this.widthMode as any}`);
  }

  @computed
  get cssHeight(): number {
    if (this.heightMode === SizeMode.Fixed) {
      return this.fixedHeight;
    } else if (
      this.widthMode === SizeMode.Fill ||
      this.widthMode === SizeMode.Fit
    ) {
      if (!this.spatialContainer) {
        throw new Error(
          `Cannot compute cssHeight for layer with height mode ${this.heightMode} because it has no spatial container`,
        );
      }
      return this.spatialContainer.cssHeight;
    }
    throw new Error(`Unknown height mode: ${this.heightMode as any}`);
  }

  @computed
  get cssObjectFit(): CSSProperties["objectFit"] {
    if (this.heightMode === SizeMode.Fit) {
      return "contain";
    } else if (this.heightMode === SizeMode.Fill) {
      return "cover";
    }
    return "initial";
  }

  @computed
  get layerCSS(): CSSProperties {
    return {
      width: this.cssWidth + "px",
      height: this.cssHeight + "px",
      // objectFit: this.cssObjectFit,
      position: "absolute",
      top: this.translateY,
      left: this.translateX,
      // @ts-expect-error react is not aware of css variables
      "--ef-animationName": this.animation ?? "none",
      "--ef-duration": `${this.durationMs}ms`,
      "--ef-currentTime": `${this.currentTimeMs}ms`,
      "--ef-animationDelay": `calc(-1 * var(--ef-currentTime))`,
      perspective: "800px",
      transform: this.cssTransform,
      transformOrigin: "50% 50%",
      opacity: this.opacity,
      outline: "1px solid red",

      // TODO: in the midst of merging the canvas layers to a single layer without a wrapper
      animationName: this.animation ?? "none",
      animationDuration: `${this.durationMs}ms`,
      animationDelay: `-${this.currentTimeMs}ms`,
      animationPlayState: "paused",
      animationTimingFunction: "linear",
      animationIterationCount: "infinite",
      animationComposition: "add",
      // This makes the layer visible outside of its parent's bounds
      // - when using object-fit for replaceable elements, this is necessary to see the "crop"
      overflow: "visible",
      // This reverses the z-index order of the layers
      // The semantics our our layer system is more like looking down from above
      zIndex: (this.siblings?.length ?? 0) - this.ownIndex,
    };
  }

  /**
   * isSelected state tracking is wholly owned by the Editor model.
   * We track selection status in the Editor model because we want to be able to
   * quickly get a list of all selected layers without a scan.
   *
   * We track isSelected in the Layer model because we want to be able to
   * quickly get the selection status of a layer without a scan.
   */
  @observable
  isSelected = false;

  get assetStorageProvider() {
    return storageContext.get(this) || NavigatorStorage;
  }

  // This appears to be used primarily from server contexts
  static async createLayersFrompMp4File(
    file: File,
    destination: LayerComposition,
  ) {
    const { VideoLayer } = await import("./VideoLayer/VideoLayer");
    const { AudioLayer } = await import("./AudioLayer/AudioLayer");
    const { TimeGroup } = await import("./TimeGroup/TimeGroup");
    const mp4File = new MP4File();
    const fileBuffer = (await file.arrayBuffer()) as MP4Box.MP4ArrayBuffer;
    fileBuffer.fileStart = 0;
    mp4File.appendBuffer(fileBuffer);
    mp4File.flush();

    const splitTracks = await mp4File.fragmentAllTracks();

    const layers: Layer[] = [];
    const trackContainer = new TimeGroup({
      containerTimeMode: ContainerTimeMode.Fit,
      widthMode: SizeMode.Fixed,
      heightMode: SizeMode.Fixed,
    });
    destination.pushLayers(trackContainer);
    for (const fragTrack of mp4File.fragmentedTracks) {
      const track = mp4File
        .getInfo()
        .tracks.find((track) => track.id === fragTrack.id);
      if (!track) throw new Error("Track not found");

      const bufferList = splitTracks[track.id];
      if (!bufferList) throw new Error("No buffer list found for track");

      const trackFile = new MP4File();
      let index = 0;
      for (const buffer of bufferList) {
        const chunk = buffer as MP4Box.MP4ArrayBuffer;
        chunk.fileStart = index;
        trackFile.appendBuffer(chunk);
        index += buffer.byteLength;
      }
      await trackFile.readyPromise;

      const originalContainerId = uuidv4();

      switch (track.type) {
        case "audio": {
          const id = uuidv4();
          const audioLayer = new AudioLayer({
            id,
            originalContainerId,
            intrinsicDurationMs: Math.round(
              (track.samples_duration / track.timescale) * 1000,
            ),
          });
          trackContainer.pushLayers(audioLayer);
          await audioLayer.createEncodedAssetFromBufferList(bufferList);
          break;
        }
        case "video": {
          const id = uuidv4();
          const videoLayer = new VideoLayer({
            id,
            originalContainerId,
            intrinsicDurationMs: Math.round(
              (track.samples_duration / track.timescale) * 1000,
            ),
            intrinsicWidth: track.track_width,
            intrinsicHeight: track.track_height,
          });
          if (track.track_width > trackContainer.fixedWidth) {
            trackContainer.setFixedWidth(track.track_width);
          }
          if (track.track_height > trackContainer.fixedHeight) {
            trackContainer.setFixedHeight(track.track_height);
          }
          trackContainer.pushLayers(videoLayer);
          await videoLayer.createEncodedAssetFromBufferList(bufferList);
          break;
        }
        default: {
          throw new Error(`Unknown track type ${track.type}`);
        }
      }
    }

    return layers;
  }
  static async createLayersFromImageFile(
    file: File,
    destination: LayerComposition,
  ) {
    const { ImageLayer } = await import("./ImageLayer/ImageLayer");

    const layers: Layer[] = [];

    const id = uuidv4();
    const imageLayer = await ImageLayer.createFromFile(file, {
      id,
      intrinsicDurationMs: 5000,
    });
    imageLayer.createEncodedAssetFromStream(file.stream());
    destination.pushLayers(imageLayer);
    return layers;
  }

  static async createFromFiles(
    files: File[],
    destination: LayerComposition,
  ): Promise<Layer[]> {
    // Must delay import until runtime to avoid circular dependency
    // TODO: consider performance implications of this
    //       Probably low because createFromFiles is already
    //       a low-frequency batched operation, but worth investigating
    //       More likely to interfere problems with bundle splitting if anything

    const layers: Layer[] = [];
    for (const file of files) {
      try {
        console.log("Creating layer from file", file.type);
        if (file.type === "video/mp4") {
          // TODO: create layers in parallel
          await this.createLayersFrompMp4File(file, destination);
        } else if (file.type.startsWith("image")) {
          await this.createLayersFromImageFile(file, destination);
        }
        // else if (file.type === "text/html")) {
        //   return HtmlLayer.createFromFile(file);
        // }
        else {
          // TODO: Better UX for this kind of skipping action
          // Just a toast or something might be okay here.
          console.warn(`Unsupported file type: ${file.type}. Ignoring`);
        }
      } catch (error) {
        // TODO: Better UX for per-layer creation errors
        console.error(`Error creating layer from file: ${file.name}`, error);
      }
    }
    return layers;
  }

  @computed
  get temporalRoot(): Layer {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let root: Layer = this;
    while (root.timeGroup) {
      root = root.timeGroup;
    }
    return root;
  }

  @computed
  get editor(): Editor | undefined {
    return getRoot<Editor>(this);
  }

  async renderToCanvas(
    _ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): Promise<void> {
    console.error(
      `renderToCanvas MUST be implemented by subclasses: ${this.constructor.name}}`,
    );
  }

  @computed
  get audioLayers(): AudioLayer[] {
    return [];
  }

  @computed
  get absoluteStartTimeMs(): number {
    if (this.timeGroup) {
      return this.timeGroup.absoluteStartTimeMs + this.startMs;
    }
    return this.startMs;
  }

  @computed
  get canBeTrimmed(): boolean {
    return this.timeMode === TimeMode.Fixed;
  }
}
