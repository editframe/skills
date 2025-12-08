export interface PropertyDefinition {
  name: string;
  type: string;
  access: "R" | "W" | "R/W";
  useCase: string;
  category?: string;
  domReadable?: boolean | string;
  domWritable?: boolean | string;
  htmlAttribute?: boolean | string;
  defaultValue?: string;
}

export const transformHandlesProperties: PropertyDefinition[] = [
  {
    name: "bounds",
    type: "TransformBounds",
    access: "R/W",
    useCase: "Element position and size",
    category: "Transform",
    domReadable: true,
    domWritable: true,
  },
  {
    name: "minSize",
    type: "number",
    access: "R/W",
    useCase: "Minimum element dimensions",
    category: "Constraints",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "min-size",
    defaultValue: "10",
  },
  {
    name: "target",
    type: "string",
    access: "R/W",
    useCase: "Target element selector",
    category: "Configuration",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "target",
  },
  {
    name: "canvasScale",
    type: "number",
    access: "R/W",
    useCase: "Canvas zoom/scale factor",
    category: "Configuration",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "canvas-scale",
    defaultValue: "1",
  },
  {
    name: "enableRotation",
    type: "boolean",
    access: "R/W",
    useCase: "Enable rotation handle",
    category: "Features",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "enable-rotation",
    defaultValue: "false",
  },
  {
    name: "enableResize",
    type: "boolean",
    access: "R/W",
    useCase: "Enable resize handles",
    category: "Features",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "enable-resize",
    defaultValue: "true",
  },
  {
    name: "enableDrag",
    type: "boolean",
    access: "R/W",
    useCase: "Enable drag handle",
    category: "Features",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "enable-drag",
    defaultValue: "true",
  },
  {
    name: "rotationStep",
    type: "number",
    access: "R/W",
    useCase: "Rotation snap increment",
    category: "Constraints",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "rotation-step",
  },
];










