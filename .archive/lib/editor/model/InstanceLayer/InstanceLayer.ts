import { ExtendedModel, model, types, tProp } from "mobx-keystone";
import { computed, override } from "mobx";
import { type CSSProperties } from "react";
import { Layer } from "../Layer";
import { yjsAdapterSnapshotProcessor } from "../yjsAdapter/yjsAdapter";
import { componentRef } from "../compositionLayerRef";

@model("ef/InstanceLayer")
export class InstanceLayer extends ExtendedModel(
  Layer,
  {
    componentRef: tProp(types.maybe(types.ref(componentRef))),
  },
  yjsAdapterSnapshotProcessor,
) {
  static createFromLayer(layer: Layer): InstanceLayer {
    if (!layer.isComponent) {
      throw new Error("Cannot create instance of non-component");
    }
    const componentRef = layer.composition.makeComponentRef(layer);
    const instance = new InstanceLayer({ componentRef });
    return instance;
  }

  // @computedTree
  // get asVideoLayerOnStage(): IVideoLayerOnStage {
  //   return {};
  // }

  // @computedTree
  // get asHTMLLayerOnStage(): IHTMLLayerOnStage {
  //   return {};
  // }

  // @computedTree
  // get asTimeGroupOnStage(): ITimeGroupOnStage {
  //   return {};
  // }
  @computed
  get component(): Layer | undefined {
    return this.componentRef?.current;
  }

  @override
  get durationMs(): number {
    return this.component?.durationMs ?? 0;
  }

  @override
  get trimAdjustedCurrentTimeMs(): number {
    return this.component?.trimAdjustedCurrentTimeMs ?? 0;
  }

  @override
  get layerCSS(): CSSProperties {
    return this.component?.layerCSS ?? {};
  }

  @computed
  get srcUrl(): string {
    // @ts-expect-error TODO: this is not the best way to thread values through instances
    return this.component.srcUrl;
  }

  @computed
  get intrinsicWidth(): number {
    // @ts-expect-error TODO: this is not the best way to thread values through instances
    return this.component.intrinsicWidth;
  }

  @computed
  get intrinsicHeight(): number {
    // @ts-expect-error TODO: this is not the best way to thread values through instances
    return this.component.intrinsicHeight;
  }
}
