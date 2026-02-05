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
    defaultValue: "0",
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
    name: "contentWidth",
    type: "number",
    access: "R/W",
    useCase: "Full content width in pixels for virtualization",
    category: "Configuration",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "content-width",
    defaultValue: "0",
  },
];









