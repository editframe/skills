import { EFPlay as EFPlayElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Play = createComponent({
  tagName: "ef-play",
  elementClass: EFPlayElement,
  react: React,
});
