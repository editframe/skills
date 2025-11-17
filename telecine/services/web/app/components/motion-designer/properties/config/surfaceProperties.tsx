import React from "react";
import type { PropertySectionConfig } from "./types";
import type { ElementNode } from "~/lib/motion-designer/types";
import { Rectangle } from "@phosphor-icons/react";

const isSurface = (element: ElementNode) => element.type === "surface";

export const surfaceProperties: PropertySectionConfig[] = [
  {
    id: "surface",
    title: "Surface",
    icon: <Rectangle className="w-3.5 h-3.5" />,
    defaultExpanded: true,
    visible: isSurface,
    fields: [
      {
        type: "text",
        label: "Target",
        propPath: "target",
        placeholder: "element-id",
      },
    ],
  },
];

