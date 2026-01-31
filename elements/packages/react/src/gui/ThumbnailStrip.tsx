import { EFThumbnailStrip as EFThumbnailStripElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const ThumbnailStrip = createComponent({
  tagName: "ef-thumbnail-strip",
  elementClass: EFThumbnailStripElement,
  react: React,
});
