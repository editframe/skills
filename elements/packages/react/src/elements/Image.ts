import { EFImage as EFImageElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Image = createComponent({
  tagName: "ef-image",
  elementClass: EFImageElement,
  react: React,
});
