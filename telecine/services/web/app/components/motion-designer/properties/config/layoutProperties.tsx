import React from "react";
import type { PropertySectionConfig } from "./types";
import type { ElementNode } from "~/lib/motion-designer/types";
import { FrameCorners } from "@phosphor-icons/react";

const isContainer = (element: ElementNode) =>
  element.type === "div" || element.type === "timegroup";

const isRootTimegroup = (element: ElementNode, state?: { composition: { rootTimegroupIds: string[] } }) =>
  !!(element.type === "timegroup" && state && state.composition.rootTimegroupIds.includes(element.id));

export const layoutProperties: PropertySectionConfig[] = [
  {
    id: "layout",
    title: "Layout",
    icon: <FrameCorners className="w-3.5 h-3.5" />,
    defaultExpanded: true,
    fields: [
      {
        type: "position",
        label: "Position",
        propPath: "position",
        visible: isRootTimegroup,
      },
      {
        type: "size",
        label: "Size",
        propPath: "size",
      },
      {
        type: "layout-direction",
        label: "Direction",
        propPath: "layoutDirection",
        visible: isContainer,
      },
      {
        type: "container-alignment",
        label: "Align",
        justifyPropPath: "justifyItems",
        alignPropPath: "alignItems",
        visible: isContainer,
      },
      {
        type: "number",
        label: "Gap",
        propPath: "gap",
        unit: "px",
        placeholder: "0",
        visible: isContainer,
      },
    ],
  },
];

