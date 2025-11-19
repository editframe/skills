import React from "react";
import type { PropertySectionConfig } from "./types";
import type { ElementNode } from "~/lib/motion-designer/types";
import { ClosedCaptioning } from "@phosphor-icons/react";

const isCaptions = (element: ElementNode) => element.type === "captions";

export const captionsProperties: PropertySectionConfig[] = [
  {
    id: "captions",
    title: "Captions",
    icon: <ClosedCaptioning className="w-3.5 h-3.5" />,
    defaultExpanded: true,
    visible: isCaptions,
    fields: [
      {
        type: "text",
        label: "Target",
        propPath: "target",
        placeholder: "element-id",
      },
      {
        type: "text",
        label: "Captions Source",
        propPath: "captionsSrc",
        placeholder: "https://...",
      },
      {
        type: "checkbox",
        label: "Show Before Active Word",
        propPath: "showBefore",
      },
      {
        type: "checkbox",
        label: "Show After Active Word",
        propPath: "showAfter",
      },
      {
        type: "checkbox",
        label: "Show Active Word",
        propPath: "showActive",
      },
      {
        type: "checkbox",
        label: "Show Segment",
        propPath: "showSegment",
      },
    ],
  },
];


