import { EFVideo as EFVideoElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Video = createComponent({
  tagName: "ef-video",
  elementClass: EFVideoElement,
  react: React,
});
