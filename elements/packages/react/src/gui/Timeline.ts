import { EFTimeline as EFTimelineElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Timeline = createComponent({
  tagName: "ef-timeline",
  elementClass: EFTimelineElement,
  react: React,
});
