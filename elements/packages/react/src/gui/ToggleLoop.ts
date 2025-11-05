import { EFToggleLoop as EFToggleLoopElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const ToggleLoop = createComponent({
  tagName: "ef-toggle-loop",
  elementClass: EFToggleLoopElement,
  react: React,
});
