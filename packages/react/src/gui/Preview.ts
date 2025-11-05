import { EFPreview as EFPreviewElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Preview = createComponent({
  tagName: "ef-preview",
  elementClass: EFPreviewElement,
  react: React,
});
