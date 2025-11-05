import { EFFitScale as EFFitScaleElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const FitScale = createComponent({
  tagName: "ef-fit-scale",
  elementClass: EFFitScaleElement,
  react: React,
});
