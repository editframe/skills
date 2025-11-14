import React from "react";
import type { PropertySectionConfig } from "./types";
import type { ElementNode } from "~/lib/motion-designer/types";
import { FrameCorners, GridFour, Rows, Columns } from "@phosphor-icons/react";

const isContainer = (element: ElementNode) =>
  element.type === "div" || element.type === "timegroup";

const isNotRootTimegroup = (element: ElementNode, state?: { composition: { rootTimegroupIds: string[] } }) =>
  !(element.type === "timegroup" && state && state.composition.rootTimegroupIds.includes(element.id));

const isFlex = (element: ElementNode) =>
  isContainer(element) && element.props.display === "flex";

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
      },
      {
        type: "dimensions",
        label: "Size",
        propPath: "size",
      },
      {
        type: "number",
        label: "Rotation",
        propPath: "rotation",
        unit: "°",
        placeholder: "0",
        visible: isNotRootTimegroup,
      },
    ],
  },
  {
    id: "auto-layout",
    title: "Auto Layout",
    icon: <GridFour className="w-3.5 h-3.5" />,
    defaultExpanded: true,
    visible: isContainer,
    fields: [
      {
        type: "icon-button-group",
        label: "Layout",
        propPath: "display",
        options: [
          {
            value: "block",
            icon: <div className="w-3.5 h-3.5 border border-current rounded" />,
            title: "Block",
          },
          {
            value: "flex",
            icon: <GridFour className="w-3.5 h-3.5" />,
            title: "Flex",
          },
        ],
      },
      {
        type: "icon-button-group",
        label: "Direction",
        propPath: "flexDirection",
        options: [
          {
            value: "row",
            icon: <Rows className="w-3.5 h-3.5" />,
            title: "Horizontal",
          },
          {
            value: "column",
            icon: <Columns className="w-3.5 h-3.5" />,
            title: "Vertical",
          },
        ],
        visible: isFlex,
      },
      {
        type: "alignment-grid",
        label: "Align",
        justifyPropPath: "justifyContent",
        alignPropPath: "alignItems",
        visible: isFlex,
      },
      {
        type: "number",
        label: "Gap",
        propPath: "gap",
        unit: "px",
        placeholder: "0",
        visible: isFlex,
      },
      {
        type: "spacing",
        label: "Padding",
        propPath: "padding",
      },
    ],
  },
];

