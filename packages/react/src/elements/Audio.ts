import { EFAudio as EFAudioElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Audio = createComponent({
  tagName: "ef-audio",
  elementClass: EFAudioElement,
  react: React,
});
