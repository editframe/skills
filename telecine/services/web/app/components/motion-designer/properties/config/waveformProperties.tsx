import React from "react";
import type { PropertySectionConfig } from "./types";
import type { ElementNode } from "~/lib/motion-designer/types";
import { Waveform as WaveformIcon } from "@phosphor-icons/react";

const isWaveform = (element: ElementNode) => element.type === "waveform";

export const waveformProperties: PropertySectionConfig[] = [
  {
    id: "waveform",
    title: "Waveform",
    icon: <WaveformIcon className="w-3.5 h-3.5" />,
    defaultExpanded: true,
    visible: isWaveform,
    fields: [
      {
        type: "text",
        label: "Target",
        propPath: "target",
        placeholder: "element-id",
      },
      {
        type: "select",
        label: "Mode",
        propPath: "mode",
        options: [
          { value: "bars", label: "Bars" },
          { value: "roundBars", label: "Round Bars" },
          { value: "bricks", label: "Bricks" },
          { value: "line", label: "Line" },
          { value: "curve", label: "Curve" },
          { value: "pixel", label: "Pixel" },
          { value: "wave", label: "Wave" },
          { value: "spikes", label: "Spikes" },
        ],
      },
      {
        type: "color",
        label: "Color",
        propPath: "color",
      },
      {
        type: "number",
        label: "Bar Spacing",
        propPath: "barSpacing",
        placeholder: "0.5",
        min: 0,
        max: 10,
        step: 0.1,
      },
      {
        type: "number",
        label: "Line Width",
        propPath: "lineWidth",
        unit: "px",
        placeholder: "4",
        min: 1,
        max: 50,
        step: 1,
      },
    ],
  },
];
