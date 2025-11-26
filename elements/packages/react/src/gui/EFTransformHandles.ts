import { EFTransformHandles as EFTransformHandlesElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const TransformHandles = createComponent({
  tagName: "ef-transform-handles",
  elementClass: EFTransformHandlesElement,
  react: React,
  events: {
    onBoundsChange: "bounds-change",
    onRotationChange: "rotation-change",
  },
});
