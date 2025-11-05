import { EFScrubber as EFScrubberElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Scrubber = createComponent({
  tagName: "ef-scrubber",
  elementClass: EFScrubberElement,
  react: React,
});
