import React from "react";
import type { PropertySectionConfig } from "./types";
import type { ElementNode } from "~/lib/motion-designer/types";
import { Image as ImageIcon } from "@phosphor-icons/react";

const isMedia = (element: ElementNode) =>
  element.type === "video" || element.type === "image" || element.type === "audio";

export const mediaProperties: PropertySectionConfig[] = [
  {
    id: "media",
    title: "Media",
    icon: <ImageIcon className="w-3.5 h-3.5" />,
    defaultExpanded: false,
    visible: isMedia,
    fields: [
      {
        type: "text",
        label: "URL",
        propPath: "src",
        placeholder: "https://...",
      },
    ],
  },
];

