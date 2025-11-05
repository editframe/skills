import { EFTogglePlay as EFTogglePlayElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const TogglePlay = createComponent({
  tagName: "ef-toggle-play",
  elementClass: EFTogglePlayElement,
  react: React,
});
