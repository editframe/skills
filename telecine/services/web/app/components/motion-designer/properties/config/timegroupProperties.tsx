import React from "react";
import type { PropertySectionConfig } from "./types";
import type { ElementNode } from "~/lib/motion-designer/types";
import { FilmStrip } from "@phosphor-icons/react";

const isTimegroup = (element: ElementNode) => element.type === "timegroup";

export const timegroupProperties: PropertySectionConfig[] = [
  {
    id: "timegroup",
    title: "Timegroup",
    icon: <FilmStrip className="w-3.5 h-3.5" />,
    defaultExpanded: true,
    visible: isTimegroup,
    fields: [
      {
        type: "select",
        label: "Mode",
        propPath: "mode",
        options: [
          { value: "fixed", label: "Fixed" },
          { value: "sequence", label: "Sequence" },
          { value: "contain", label: "Contain" },
          { value: "fit", label: "Fit" },
        ],
      },
      {
        type: "text",
        label: "Duration",
        propPath: "duration",
        placeholder: "5s",
      },
      {
        type: "number",
        label: "FPS",
        propPath: "fps",
        placeholder: "30",
      },
      {
        type: "video-size-preset",
        label: "Size Preset",
        propPath: "size",
      },
      {
        type: "dimensions",
        label: "Size",
        propPath: "size",
      },
    ],
  },
];

