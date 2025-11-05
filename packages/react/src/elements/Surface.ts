import { EFSurface as EFSurfaceElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Surface = createComponent({
  tagName: "ef-surface",
  elementClass: EFSurfaceElement,
  react: React,
  displayName: "Surface",
  events: {},
});
