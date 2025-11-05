import { computed } from "mobx";
import {
  Model,
  idProp,
  model,
  modelAction,
  getSnapshot,
  type SnapshotOutOf,
  tProp,
  types,
} from "mobx-keystone";
import { Layer } from "./Layer";

import {
  compositionLayerRef,
  compositionRef,
  componentRef,
} from "./compositionLayerRef";
import { yjsAdapterSnapshotProcessor } from "./yjsAdapter/yjsAdapter";

@model("ef/LayerComposition")
export class LayerComposition extends Model(
  {
    id: idProp,
    title: tProp(types.string, "Untitled Composition").withSetter(),
    layers: tProp(types.record(types.model<Layer>(() => Layer)), () => ({})),
    childLayerRefs: tProp(
      types.array(types.ref(compositionLayerRef)),
      () => [],
    ),
  },
  yjsAdapterSnapshotProcessor,
) {
  makeLayerRef = compositionLayerRef;
  makeCompositionRef = compositionRef;
  makeComponentRef = componentRef;

  @computed
  get isEmpty(): boolean {
    return this.childLayers.length === 0;
  }

  get currentSnapshot(): SnapshotOutOf<this> {
    return getSnapshot(this);
  }

  @computed
  get childLayers(): Layer[] {
    return this.childLayerRefs.map((ref) => ref.current);
  }

  @computed
  get durationMs(): number {
    // get max of all layers' endMs
    return this.childLayers.reduce(
      (acc, layer) => Math.max(acc, layer.endMs),
      0,
    );
  }

  adoptLayer(layer: Layer): void {
    this.layers[layer.id] ||= layer;
  }

  @modelAction
  pushLayers(...layers: Layer[]): void {
    for (const layer of layers) {
      this.adoptLayer(layer);
      try {
        layer.temporalContainer?.removeLayer(layer);
      } catch (error) {
        console.info("Layer has no time group");
      }
      this.childLayerRefs.push(this.makeLayerRef(layer));
    }
  }

  @modelAction
  removeLayer(layer: Layer): void {
    if (layer.temporalContainer === this) {
      this.childLayerRefs.splice(layer.ownIndex, 1);
    } else {
      throw new Error("Layer is not in this composition");
    }
  }
}
