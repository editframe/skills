import { EFResizableBox as EFResizableBoxElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const ResizableBox = createComponent({
  tagName: "ef-resizable-box",
  elementClass: EFResizableBoxElement,
  react: React,
  events: {
    onBoundsChange: "bounds-change",
  },
});
