import React from "react";
import type { PropertySectionConfig } from "./types";
import { Eye, PaintBucket, Pen, Sparkle } from "@phosphor-icons/react";

export const visualProperties: PropertySectionConfig[] = [
  {
    id: "appearance",
    title: "Appearance",
    icon: <Eye className="w-3.5 h-3.5" />,
    defaultExpanded: true,
    fields: [
      {
        type: "inline-inputs",
        inputs: [
          {
            label: "Opacity",
            propPath: "opacity",
            type: "slider",
            min: 0,
            max: 100,
            step: 1,
            displayMultiplier: 100,
            unit: "%",
          },
          {
            label: "Radius",
            propPath: "cornerRadius",
            type: "number",
            unit: "px",
            placeholder: "0",
          },
        ],
      },
    ],
  },
  {
    id: "fill",
    title: "Fill",
    icon: <PaintBucket className="w-3.5 h-3.5" />,
    defaultExpanded: false,
    fields: [
      {
        type: "checkbox",
        label: "Fill",
        propPath: "fill.enabled",
      },
      {
        type: "color",
        label: "Color",
        propPath: "fill.color",
        visible: (element) => element.props.fill?.enabled ?? false,
      },
    ],
  },
  {
    id: "stroke",
    title: "Stroke",
    icon: <Pen className="w-3.5 h-3.5" />,
    defaultExpanded: false,
    fields: [
      {
        type: "checkbox",
        label: "Stroke",
        propPath: "stroke.enabled",
      },
      {
        type: "color",
        label: "Color",
        propPath: "stroke.color",
        visible: (element) => element.props.stroke?.enabled ?? false,
      },
      {
        type: "number",
        label: "Width",
        propPath: "stroke.width",
        unit: "px",
        placeholder: "1",
        visible: (element) => element.props.stroke?.enabled ?? false,
      },
    ],
  },
  {
    id: "effects",
    title: "Effects",
    icon: <Sparkle className="w-3.5 h-3.5" />,
    defaultExpanded: false,
    fields: [
      {
        type: "checkbox",
        label: "Shadow",
        propPath: "shadow.enabled",
      },
      {
        type: "color",
        label: "Color",
        propPath: "shadow.color",
        visible: (element) => element.props.shadow?.enabled ?? false,
      },
      {
        type: "number-grid",
        label: "X / Y / Blur",
        propPath: "shadow",
        fields: [
          { key: "x", placeholder: "X" },
          { key: "y", placeholder: "Y" },
          { key: "blur", placeholder: "Blur" },
        ],
        visible: (element) => element.props.shadow?.enabled ?? false,
      },
      {
        type: "checkbox",
        label: "Blur",
        propPath: "blur.enabled",
      },
      {
        type: "number",
        label: "Amount",
        propPath: "blur.amount",
        unit: "px",
        placeholder: "5",
        visible: (element) => element.props.blur?.enabled ?? false,
      },
    ],
  },
];

