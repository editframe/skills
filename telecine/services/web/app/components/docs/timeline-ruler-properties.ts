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

export const timelineRulerProperties: PropertyDefinition[] = [
  {
    name: "durationMs",
    type: "number",
    access: "R/W",
    useCase: "Timeline duration in milliseconds",
    category: "Configuration",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "duration-ms",
  },
  {
    name: "zoomScale",
    type: "number",
    access: "R/W",
    useCase: "Zoom multiplier for timeline",
    category: "Configuration",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "zoom-scale",
    defaultValue: "1.0",
  },
  {
    name: "containerWidth",
    type: "number",
    access: "R/W",
    useCase: "Content width in pixels",
    category: "Configuration",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "container-width",
  },
  {
    name: "fps",
    type: "number",
    access: "R/W",
    useCase: "Frames per second for frame markers",
    category: "Configuration",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "fps",
    defaultValue: "30",
  },
  {
    name: "scrollContainerSelector",
    type: "string",
    access: "R/W",
    useCase: "CSS selector for scroll container",
    category: "Scroll",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "scroll-container-selector",
  },
  {
    name: "scrollContainerElement",
    type: "HTMLElement | null",
    access: "R/W",
    useCase: "Direct element reference for scroll container",
    category: "Scroll",
    domReadable: true,
    domWritable: true,
  },
];




