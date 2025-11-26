import {
  EFOverlayItem as EFOverlayItemElement,
  type OverlayItemPosition,
} from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export interface OverlayItemProps {
  /** Element ID - automatically resolves to [data-element-id] or [data-timegroup-id] selector */
  elementId?: string;
  /** Target element or selector - use for custom targeting when elementId doesn't work */
  target?: HTMLElement | string;
  /** Called when position changes. Receives CustomEvent with OverlayItemPosition as detail. */
  onPositionChanged?: (e: Event) => void;
}

export const OverlayItem = createComponent<
  EFOverlayItemElement,
  OverlayItemProps
>({
  tagName: "ef-overlay-item",
  elementClass: EFOverlayItemElement,
  react: React,
  displayName: "OverlayItem",
  events: {
    onPositionChanged: "position-changed",
  },
});
