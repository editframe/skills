import React from "react";
import type { PropertySectionConfig } from "./types";
import type { ElementNode } from "~/lib/motion-designer/types";
import { Image as ImageIcon } from "@phosphor-icons/react";

const isMedia = (element: ElementNode) =>
  element.type === "video" || element.type === "image" || element.type === "audio" || element.type === "captions" || element.type === "waveform" || element.type === "surface";

export const mediaProperties: PropertySectionConfig[] = [
  {
    id: "media",
    title: "Media",
    icon: <ImageIcon className="w-3.5 h-3.5" />,
    defaultExpanded: true,
    visible: (element) => element.type === "video" || element.type === "image" || element.type === "audio",
    fields: [
      {
        type: "text",
        label: "URL",
        propPath: "src",
        placeholder: "https://...",
      },
    ],
  },
  {
    id: "target",
    title: "Target",
    icon: <ImageIcon className="w-3.5 h-3.5" />,
    defaultExpanded: false,
    visible: (element) => element.type === "captions" || element.type === "waveform" || element.type === "surface",
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

