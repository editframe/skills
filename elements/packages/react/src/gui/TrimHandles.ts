import { EFTrimHandles as EFTrimHandlesElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const TrimHandles = createComponent({
  tagName: "ef-trim-handles",
  elementClass: EFTrimHandlesElement,
  react: React,
  events: {
    onTrimChange: "trim-change",
    onTrimChangeEnd: "trim-change-end",
  },
});
