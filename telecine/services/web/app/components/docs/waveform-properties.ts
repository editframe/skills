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

export const waveformProperties: PropertyDefinition[] = [
  {
    name: "target",
    type: "string",
    access: "R/W",
    useCase: "Connect to audio or video element for visualization",
    category: "Connection",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "target",
    defaultValue: '""',
  },
  {
    name: "mode",
    type: "string",
    access: "R/W",
    useCase: "Visualization style (bars, wave, line, etc.)",
    category: "Visual Style",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "mode",
    defaultValue: "bars",
  },
  {
    name: "color",
    type: "string",
    access: "R/W",
    useCase: "Waveform color (CSS color value)",
    category: "Visual Style",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "color",
    defaultValue: "currentColor",
  },
  {
    name: "barSpacing",
    type: "number",
    access: "R/W",
    useCase: "Spacing between bars in bars/roundBars modes",
    category: "Visual Style",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "bar-spacing",
    defaultValue: "0.5",
  },
  {
    name: "lineWidth",
    type: "number",
    access: "R/W",
    useCase: "Line width for line and curve modes",
    category: "Visual Style",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "line-width",
    defaultValue: "4",
  },
];


