import { autorun, computed, observable, reaction } from "mobx";
import { Model, model, modelAction, prop } from "mobx-keystone";
import { type Layer } from "./Layer";
import { LayerComposition } from "./LayerComposition";
import { TimeGroup } from "./TimeGroup/TimeGroup";
import { PointerModes } from "./types";
import { PointerMode } from "../components/LayerStage/PointerMode/PointerMode";
import { TimeGroupMode } from "../components/LayerStage/PointerMode/TimeGroupMode";
import { PanAndZoom } from "./PanAndZoom";
import { Doc as YDoc, Map as YMap } from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import { PointerModeProps } from "../components/LayerStage/PointerMode";
import { DevTools } from "./DevTools";
import { connectModelToYJS } from "./yjsAdapter/yjsAdapter";

interface Attention {
  id: string;
  name: string;
  pointerPoint: Point2DTuple;
  selectedLayerId: string;
  currentTime: number;
}

@model("gui/Editor")
export class Editor extends Model({
  composition: prop<LayerComposition>(
    () => new LayerComposition({}),
  ).withSetter(),
  /** @deprecated currentTimeMs is now handled by individual temporal roots */
  currentTimeMs: prop<number>(0),
  pixelsPerSecond: prop<number>(10).withSetter(),
  panAndZoom: prop<PanAndZoom>(() => new PanAndZoom({})),
  pointerPoint: prop<Point2DTuple>(() => [-1, -1]).withSetter(),
  pointerMode: prop<PointerModes>(PointerModes.Pointer).withSetter(),
  displayName: prop<string>("Collin").withSetter(),
  attentions: prop<Record<string, Attention>>(() => ({})).withSetter(),
  showPointer: prop(true).withSetter(),
  stageOffset: prop<Point2DTuple>(() => [0, 0]).withSetter(),
  devicePixelRatio: prop<number>(window.devicePixelRatio).withSetter(),
  devTools: prop<DevTools>(() => new DevTools({})),
}) {
  static PIXELS_PER_RULER_TICK = 100;

  yDoc?: YDoc;
  yMap?: YMap<any>;
  persistence?: IndexeddbPersistence;
  // We do not have more specific types for WebsocketProvider
  wsProvider?: any;

  @observable
  protected docSynced = false;

  @modelAction
  setDocSynced(): void {
    this.docSynced = true;
  }

  async waitForSync(): Promise<void> {
    if (this.docSynced) {
      return;
    }
    await new Promise<void>((resolve) => {
      const disposer = reaction(
        () => this.docSynced,
        (synced) => {
          if (synced) {
            disposer();
            resolve();
          }
        },
      );
    });
  }

  protected onAttachedToRootStore(): void {
    // TODO: fix this hack to prevent double attach
    if (this.persistence !== undefined) {
      return;
    }
    // autorun(() => {
    if (this.composition === undefined) {
      return;
    }

    if ("EF_DISABLE_YJS" in window && window.EF_DISABLE_YJS === true) {
      // Do not initialize YJS
      return;
    }

    const composition = this.composition;

    this.yDoc = new YDoc({ guid: composition.id });
    // Assigning to local variable so typescript knows it can't be undefined
    const yMap = (this.yMap = this.yDoc.getMap(
      `composition:${composition.id}`,
    ));
    this.persistence = new IndexeddbPersistence(composition.id, this.yDoc);
    this.wsProvider = new WebsocketProvider(
      // The base path and composition.id will be combined to create the full path
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/project`,
      composition.id,
      this.yDoc,
      { connect: true },
    );
    // this.wsProvider.connectBc();
    this.persistence.on("synced", () => {
      this.setDocSynced();
      connectModelToYJS(composition, yMap);
    });

    this.wsProvider.awareness.on("change", () => {
      const states = this.wsProvider.awareness.getStates();
      const attentions: Record<string, Attention> = {};
      for (const [session, state] of states) {
        if (session !== this.wsProvider.awareness.clientID) {
          state.id = String(session);
          attentions[session] = state;
        }
      }
      this.setAttentions(attentions);
    });
    // });

    if ("EF_DISABLE_YJS" in window && window.EF_DISABLE_YJS === true) {
      // Do not initialize YJS
      return;
    }
    autorun(() => {
      this.wsProvider.awareness.setLocalStateField(
        "selectedLayerId",
        this.selectedTemporalLayer?.id,
      );
    });

    autorun(() => {
      this.wsProvider.awareness.setLocalStateField(
        "currentTime",
        this.selectedTemporalLayer?.currentTimeMs ?? 0,
      );
    });

    autorun(() => {
      this.wsProvider.awareness.setLocalStateField("name", this.displayName);
    });

    autorun(() => {
      this.wsProvider.awareness.setLocalStateField(
        "pointerPoint",
        this.panAndZoomAdjustedPointerPoint,
      );
    });
  }

  @observable
  controlledLayer: Layer | undefined;

  @modelAction
  setControlledLayer(layer: Layer): void {
    this.controlledLayer = layer;
  }

  @modelAction
  clearControlledLayer(): void {
    this.controlledLayer = undefined;
  }

  @computed
  get temporalRootAttentions(): Attention[] {
    const attentions: Attention[] = [];
    for (const attention of Object.values(this.attentions)) {
      if (attention.selectedLayerId === this.selectedTemporalRoot?.id) {
        attentions.push(attention);
      }
    }
    return attentions;
  }

  get panAndZoomAdjustedPointerPoint(): Point2DTuple {
    // pointerPoint is in screen coordinates, so we need to adjust it to be in canvas coordinates
    const pointerPoint = this.pointerPoint;
    const stageOffset = this.stageOffset;
    // first step is to account for stage offset
    const stageInvariantPointerPoint: Point2DTuple = [
      pointerPoint[0] - stageOffset[0],
      pointerPoint[1] - stageOffset[1],
    ];

    const zoomAdjustedPointerPoint = [
      stageInvariantPointerPoint[0] / this.panAndZoom.zoom,
      stageInvariantPointerPoint[1] / this.panAndZoom.zoom,
    ];

    const panAdjustedPointerPoint: Point2DTuple = [
      zoomAdjustedPointerPoint[0] -
        this.panAndZoom.translateX / this.panAndZoom.zoom,
      zoomAdjustedPointerPoint[1] -
        this.panAndZoom.translateY / this.panAndZoom.zoom,
    ];

    return panAdjustedPointerPoint;
  }

  msToPixels(ms: number): number {
    return ms * (this.pixelsPerSecond / 1000);
  }

  pixelsToMs(pixels: number): number {
    return pixels * (1000 / this.pixelsPerSecond);
  }

  @observable
  selectedLayerIds: Record<string, true> = {};

  layerIsSelected(layer: Layer): true | undefined {
    return this.selectedLayerIds[layer.id];
  }

  @computed
  get selectedLayers(): Layer[] {
    const selectedLayers: Layer[] = [];
    for (const layer of this.composition.childLayers) {
      if (this.selectedLayerIds[layer.id]) {
        selectedLayers.push(layer);
      }
      if (layer instanceof TimeGroup) {
        selectedLayers.push(...layer.selectedLayers);
      }
    }
    return selectedLayers;
  }

  /**
   * This will set the selection to the given layer and deselect all other layers.
   * If the layer is already selected, this will do nothing.
   *
   * If you want to toggle, use toggleLayerSelection instead.
   */
  @modelAction
  public setLayerSelection(layerToSelect: Layer): void {
    if (!this.selectedLayerIds[layerToSelect.id]) {
      this.deselectAllLayers();
      this.selectLayer(layerToSelect);
    }
  }

  /**
   * This will toggle the selection of the given layer.
   * If the layer is already selected, this will deselect it.
   *
   * If you want to set the selection, use setLayerSelection instead.
   */
  @modelAction
  public toggleLayerSelection(layerToToggle: Layer): void {
    if (this.selectedLayerIds[layerToToggle.id]) {
      this.deselectLayer(layerToToggle);
    } else {
      this.deselectAllLayers();
      this.selectLayer(layerToToggle);
    }
  }

  @modelAction
  public clearLayerSelection(): void {
    this.deselectAllLayers();
  }

  private selectLayer(layer: Layer): void {
    this.selectedLayerIds[layer.id] = true;
    layer.isSelected = true;
  }

  private deselectLayer(layer: Layer): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.selectedLayerIds[layer.id];
    layer.isSelected = false;
  }

  private deselectAllLayers(): void {
    for (const layer of this.composition.childLayers) {
      layer.isSelected = false;
      if (layer instanceof TimeGroup) {
        layer.deselectAllChildren();
      }
    }
    for (const id in this.selectedLayerIds) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.selectedLayerIds[id];
    }
  }

  @computed
  get visibleLayers(): Layer[] {
    const visibleLayers: Layer[] = [];
    const layers = this.composition.childLayers;
    for (const layer of layers) {
      if (
        layer.startMs < this.currentTimeMs &&
        layer.endMs > this.currentTimeMs
      ) {
        visibleLayers.push(layer);
      }
    }
    return visibleLayers;
  }

  @computed
  get rootTemporalLayers(): Layer[] {
    return this.composition.childLayers;
  }

  @computed
  get selectedTemporalLayer(): Layer | undefined {
    return this.selectedLayers[0]?.temporalRoot;
  }

  @computed
  get rulerWidth(): number {
    return this.msToPixels(this.composition.durationMs);
  }

  @computed
  get rulerTickMs(): number {
    return this.pixelsToMs(Editor.PIXELS_PER_RULER_TICK);
  }

  @computed
  get rulerTickCount(): number {
    const tickDuration = this.selectedLayers[0]?.durationMs ?? 0;
    return tickDuration / this.rulerTickMs;
  }

  @computed
  get tickMs(): number {
    return this.composition.durationMs / this.rulerTickCount;
  }

  @computed
  get rulerTicks(): number[] {
    return Array.from({ length: this.rulerTickCount }, (_, i) => i);
  }

  @computed
  get PointerModeComponent(): React.FC<PointerModeProps> {
    switch (this.pointerMode) {
      case PointerModes.Pointer:
        return PointerMode;
      case PointerModes.TimeGroup:
        return TimeGroupMode;
      default:
        throw new Error(`Unknown pointer mode: ${this.pointerMode}`);
    }
  }

  @computed
  get selectedTemporalRoot(): Layer | undefined {
    return this.selectedTemporalLayer?.temporalRoot;
  }
}
