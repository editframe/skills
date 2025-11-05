import { EFTimeDisplay } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const TimeDisplay = createComponent({
  tagName: "ef-time-display",
  elementClass: EFTimeDisplay,
  react: React,
});

export type TimeDisplayProps = {
  className?: string;
};
