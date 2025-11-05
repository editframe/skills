import { EFControls as EFControlsElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Controls = createComponent({
  tagName: "ef-controls",
  elementClass: EFControlsElement,
  react: React,
});
