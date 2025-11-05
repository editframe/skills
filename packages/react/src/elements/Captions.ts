import {
  EFCaptionsActiveWord as EFCaptionsActiveWordElement,
  EFCaptionsAfterActiveWord as EFCaptionsAfterActiveWordElement,
  EFCaptionsBeforeActiveWord as EFCaptionsBeforeActiveWordElement,
  EFCaptions as EFCaptionsElement,
  EFCaptionsSegment as EFCaptionsSegmentElement,
} from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Captions = createComponent({
  tagName: "ef-captions",
  elementClass: EFCaptionsElement,
  react: React,
});

export const CaptionsActiveWord = createComponent({
  tagName: "ef-captions-active-word",
  elementClass: EFCaptionsActiveWordElement,
  react: React,
});

export const CaptionsSegment = createComponent({
  tagName: "ef-captions-segment",
  elementClass: EFCaptionsSegmentElement,
  react: React,
});

export const CaptionsBeforeActiveWord = createComponent({
  tagName: "ef-captions-before-active-word",
  elementClass: EFCaptionsBeforeActiveWordElement,
  react: React,
});

export const CaptionsAfterActiveWord = createComponent({
  tagName: "ef-captions-after-active-word",
  elementClass: EFCaptionsAfterActiveWordElement,
  react: React,
});
