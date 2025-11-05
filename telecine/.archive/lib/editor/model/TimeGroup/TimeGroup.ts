import {
  ExtendedModel,
  idProp,
  model,
  modelAction,
  type AnyModel,
  getParent,
  types,
  tProp,
} from "mobx-keystone";
import { Layer } from "../Layer";
import { computed, override } from "mobx";
import { ContainerTimeMode, TimeMode } from "../types";
import { LayerComposition } from "../LayerComposition";
import { compositionLayerRef } from "../compositionLayerRef";
import { yjsAdapterSnapshotProcessor } from "../yjsAdapter/yjsAdapter";
import { CanvasMode } from "../DevTools";
import { AudioLayer } from "../AudioLayer/AudioLayer";

@model("ef/TimeGroup")
export class TimeGroup extends ExtendedModel(
  Layer,
  {
    id: idProp,
    childLayerRefs: tProp(
      types.array(types.ref(compositionLayerRef)),
      () => [],
    ),
    containerTimeMode: tProp(
      types.enum(ContainerTimeMode),
      ContainerTimeMode.Sequence,
    ).withSetter(),
    backgroundColor: tProp(types.string, "transparent").withSetter(),
  },
  yjsAdapterSnapshotProcessor,
) {
  iconName = "folder";

  @computed
  get childLayers(): Layer[] {
    return this.childLayerRefs.map((ref) => ref.current);
  }

  @modelAction
  setCurrentTimeMs(currentTimeMs: number): void {
    const clampedTime = Math.min(Math.max(0, currentTimeMs), this.durationMs);
    this.currentTimeMs = clampedTime;
    this.childLayers.forEach((layer) => {
      const adjustedTime = clampedTime - layer.startMs;
      layer.setCurrentTimeMs(adjustedTime);
    });
  }

  get hasOwnDuration(): boolean {
    return (
      this.containerTimeMode === "fixed" ||
      this.containerTimeMode === "sequence"
    );
  }

  get durationMs(): number {
    switch (this.containerTimeMode) {
      case "sequence":
        return this.childLayers.reduce(
          (duration, layer) => duration + layer.durationMs,
          0,
        );
      case "fit":
        return this.childLayers
          .filter((layer) => layer.timeMode !== TimeMode.Fill)
          .reduce((duration, layer) => Math.max(duration, layer.endMs), 0);
      case "fixed":
        return this.intrinsicDurationMs;
      default:
        throw new Error(`Unknown time group mode: ${this.containerTimeMode}`);
    }
  }

  @computed
  get visibleLayers(): Layer[] {
    const visibleLayers: Layer[] = [];
    for (const layer of this.childLayers) {
      if (
        layer.startMs <= this.currentTimeMs &&
        layer.endMs > this.currentTimeMs
      ) {
        visibleLayers.push(layer);
      }
    }
    return visibleLayers;
  }

  deselectAllChildren(): void {
    for (const layer of this.childLayers) {
      layer.isSelected = false;
      if (layer instanceof TimeGroup) {
        layer.deselectAllChildren();
      }
    }
  }

  get selectedLayers(): Layer[] {
    const selectedLayers: Layer[] = [];
    for (const layer of this.childLayers) {
      if (layer.isSelected) {
        selectedLayers.push(layer);
      }
      if (layer instanceof TimeGroup) {
        selectedLayers.push(...layer.selectedLayers);
      }
    }
    return selectedLayers;
  }

  @computed
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

  @modelAction
  pushLayers(...layers: Layer[]): void {
    for (const layer of layers) {
      this.composition.adoptLayer(layer);
      try {
        layer.temporalContainer?.removeLayer(layer);
      } catch (error) {
        console.info("Layer has no time group");
      }
      this.childLayerRefs.push(this.composition.makeLayerRef(layer));
    }
  }

  @modelAction
  removeLayer(layer: Layer): void {
    if (layer.temporalContainer === this) {
      this.childLayerRefs.splice(layer.ownIndex, 1);
    } else {
      throw new Error("Layer does not belong to this time group");
    }
  }

  async renderToCanvas(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): Promise<void> {
    if (this.editor?.devTools.canvasMode === CanvasMode.SEPARATE_CANVAS) {
      const imageDatas = await Promise.all(
        this.visibleLayers.toReversed().map(async (layer) => {
          layer.clearFrameBuffer();
          await layer.renderToCanvas(layer.frameBufferCtx);
          return [layer.frameBuffer, layer] as const;
        }),
      );
      imageDatas.forEach(([imageData, layer]) => {
        if (imageData !== null) {
          ctx.save();
          ctx.rotate(layer.zRadians);
          // ctx.translate(layer.translateX, layer.translateY);
          ctx.drawImage(imageData, 0, 0, imageData.width, imageData.height);
          ctx.restore();
        }
      });
    } else if (this.editor?.devTools.canvasMode === CanvasMode.SHARED_CANVAS) {
      if (this.backgroundColor !== "transparent") {
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
      }
      for (const layer of this.visibleLayers.toReversed()) {
        // if (!(layer instanceof ImageLayer || layer instanceof TimeGroup)) {
        //   continue;
        // }
        ctx.save();
        ctx.translate(layer.cssWidth / 2, layer.cssHeight / 2);
        ctx.rotate(layer.zRadians);
        ctx.translate(-layer.cssWidth / 2, -layer.cssHeight / 2);
        ctx.translate(layer.translateX, layer.translateY);
        await layer.renderToCanvas(ctx);
        ctx.restore();
      }
    }
  }

  @override
  get audioLayers(): AudioLayer[] {
    const audioLayers: AudioLayer[] = [];
    for (const layer of this.childLayers) {
      if (layer instanceof AudioLayer) {
        audioLayers.push(layer);
      } else if (layer instanceof TimeGroup) {
        audioLayers.push(...layer.audioLayers);
      }
    }
    return audioLayers;
  }

  @override
  get canBeTrimmed(): boolean {
    return this.containerTimeMode === ContainerTimeMode.Fixed;
  }
}
