import { useEffect, useRef } from "react";
import { type Layer } from "../model/Layer";

interface LayerOnStageProps<ElementType extends HTMLElement> {
  ref: React.RefObject<ElementType>;
  style: React.CSSProperties;
}

export const useLayerOnStageProps = <ElementType extends HTMLElement>(
  layer: Layer,
): LayerOnStageProps<ElementType> => {
  const ref = useRef<ElementType>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    // @ts-expect-error - unsafe expando of layer dom nodes with domain layer object
    ref.current.layerObject = layer;
    layer.setStageRef(ref.current ?? undefined);
    return () => {
      layer.clearStageRef();
    };
  }, []);

  return {
    ref,
    style: layer.layerCSS,
  };
};
