import { EFTrimHandles as EFTrimHandlesElement, type TrimChangeDetail } from "@editframe/elements";
import React from "react";
import { createComponent, type EventName } from "../hooks/create-element";

export const TrimHandles = createComponent({
  tagName: "ef-trim-handles",
  elementClass: EFTrimHandlesElement,
  react: React,
  events: {
    onTrimChange: "trim-change" as EventName<CustomEvent<TrimChangeDetail>>,
    onTrimChangeEnd: "trim-change-end" as EventName<CustomEvent<TrimChangeDetail>>,
  },
});
