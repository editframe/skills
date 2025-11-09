import {
  EFText as EFTextElement,
  EFTextSegment as EFTextSegmentElement,
} from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Text = createComponent({
  tagName: "ef-text",
  elementClass: EFTextElement,
  react: React,
});

export const TextSegment = createComponent({
  tagName: "ef-text-segment",
  elementClass: EFTextSegmentElement,
  react: React,
});

