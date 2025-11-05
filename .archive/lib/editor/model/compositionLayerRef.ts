import {
  customRef,
  type RefConstructor,
  detach,
  findParent,
  getParent,
} from "mobx-keystone";
import { type Layer } from "./Layer";
import { LayerComposition } from "./LayerComposition";

export const compositionLayerRef: RefConstructor<Layer> = customRef<Layer>(
  "CompositionLayerRef",
  {
    resolve(ref) {
      if (getParent(ref) === undefined) {
        return undefined;
      }
      const composition = findParent<LayerComposition>(
        ref,
        (parent) => parent instanceof LayerComposition
      );
      return composition?.layers[ref.id];
    },
    onResolvedValueChange(ref, newLayer, oldLayer) {
      if (oldLayer && !newLayer) {
        detach(ref);
      }
    },
  }
);

export const componentRef: RefConstructor<Layer> = customRef<Layer>(
  "CompositionComponentRef",
  {
    resolve(ref) {
      const composition = findParent<LayerComposition>(
        ref,
        (parent) => parent instanceof LayerComposition
      );
      return composition?.layers[ref.id];
    },
    onResolvedValueChange(ref, newLayer, oldLayer) {
      if (oldLayer && !newLayer) {
        detach(ref);
      }
    },
  }
);

export const compositionRef: RefConstructor<LayerComposition> =
  customRef<LayerComposition>("CompositionRef", {
    resolve(ref) {
      return findParent<LayerComposition>(
        ref,
        (parent) => parent instanceof LayerComposition
      );
    },
    onResolvedValueChange(ref, newComposition, oldComposition) {
      if (oldComposition && !newComposition) {
        detach(ref);
      }
    },
  });
