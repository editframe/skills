import { EFPause as EFPauseElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Pause = createComponent({
  tagName: "ef-pause",
  elementClass: EFPauseElement,
  react: React,
});
