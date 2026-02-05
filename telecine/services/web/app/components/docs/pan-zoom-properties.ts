import type { PropertyDefinition } from "./PropertyReference";

export const panZoomElementProperties: PropertyDefinition[] = [
  {
    name: "x",
    type: "number",
    access: "R/W",
    useCase: "Horizontal pan offset in pixels",
    category: "Transform",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "x",
    defaultValue: "0",
  },
  {
    name: "y",
    type: "number",
    access: "R/W",
    useCase: "Vertical pan offset in pixels",
    category: "Transform",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "y",
    defaultValue: "0",
  },
  {
    name: "scale",
    type: "number",
    access: "R/W",
    useCase: "Zoom scale factor (clamped between 0.1 and 5)",
    category: "Transform",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "scale",
    defaultValue: "1",
  },
  {
    name: "autoFit",
    type: "boolean",
    access: "R/W",
    useCase:
      "When true, automatically fits content to view on first render. Centers content and scales it to fit within the container with padding.",
    category: "Behavior",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "auto-fit",
    defaultValue: "false",
  },
];










