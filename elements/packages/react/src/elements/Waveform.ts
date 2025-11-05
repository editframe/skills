import { EFWaveform as EFWaveformElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Waveform = createComponent({
  tagName: "ef-waveform",
  elementClass: EFWaveformElement,
  react: React,
});
