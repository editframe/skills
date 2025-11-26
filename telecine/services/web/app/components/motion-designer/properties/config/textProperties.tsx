import React from "react";
import type { PropertySectionConfig } from "./types";
import type { ElementNode } from "~/lib/motion-designer/types";
import { TextAa, Sparkle } from "@phosphor-icons/react";

const isText = (element: ElementNode) => element.type === "text";

export const textProperties: PropertySectionConfig[] = [
  {
    id: "text",
    title: "Text",
    icon: <TextAa className="w-3.5 h-3.5" />,
    defaultExpanded: true,
    visible: isText,
    fields: [
      {
        type: "text",
        label: "Content",
        propPath: "content",
        rows: 2,
      },
      {
        type: "text",
        label: "Font",
        propPath: "fontFamily",
        placeholder: "Inter",
      },
      {
        type: "number",
        label: "Size",
        propPath: "fontSize",
        unit: "px",
        placeholder: "16",
      },
      {
        type: "select",
        label: "Align",
        propPath: "textAlign",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ],
      },
      {
        type: "text",
        label: "Line Height",
        propPath: "lineHeight",
        placeholder: "120%",
      },
      {
        type: "text",
        label: "Spacing",
        propPath: "letterSpacing",
        placeholder: "0%",
      },
      {
        type: "select",
        label: "Transform",
        propPath: "textTransform",
        options: [
          { value: "none", label: "None" },
          { value: "uppercase", label: "Uppercase" },
          { value: "lowercase", label: "Lowercase" },
        ],
      },
    ],
  },
  {
    id: "text-animation",
    title: "Text Animation",
    icon: <Sparkle className="w-3.5 h-3.5" />,
    defaultExpanded: true,
    visible: isText,
    fields: [
      {
        type: "select",
        label: "Split",
        propPath: "split",
        options: [
          { value: "word", label: "Word" },
          { value: "char", label: "Character" },
          { value: "line", label: "Line" },
        ],
      },
      {
        type: "text",
        label: "Stagger",
        propPath: "stagger",
        placeholder: "0ms",
      },
      {
        type: "text",
        label: "Easing",
        propPath: "easing",
        placeholder: "linear",
      },
    ],
  },
];
