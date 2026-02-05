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
    defaultValue: "{ x: 0, y: 0, width: 100, height: 100 }",
  },
  {
    name: "minSize",
    type: "number",
    access: "R/W",
    useCase: "Minimum element dimensions",
    category: "Constraints",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "minsize",
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
    name: "cornersOnly",
    type: "boolean",
    access: "R/W",
    useCase: "Show only corner resize handles",
    category: "Features",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "corners-only",
    defaultValue: "false",
  },
  {
    name: "lockAspectRatio",
    type: "boolean",
    access: "R/W",
    useCase: "Maintain aspect ratio during resize",
    category: "Constraints",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "lock-aspect-ratio",
    defaultValue: "false",
  },
  {
    name: "enableDrag",
    type: "boolean",
    access: "R/W",
    useCase: "Enable drag to move element",
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
    useCase: "Rotation snap increment in degrees",
    category: "Constraints",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "rotation-step",
  },
];










