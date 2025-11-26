import type { PropertyDefinition } from "./video-properties";

export const thumbnailStripProperties: PropertyDefinition[] = [
  {
    name: "target",
    type: "string",
    access: "R/W",
    useCase: "ID of video element to generate thumbnails from",
    category: "Targeting",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "target",
  },
  {
    name: "thumbnailWidth",
    type: "number",
    access: "R/W",
    useCase: "Desired width of individual thumbnails in pixels",
    category: "Layout",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "thumbnail-width",
    defaultValue: "80",
  },
  {
    name: "startTimeMs",
    type: "number",
    access: "R/W",
    useCase: "Custom start time for thumbnail generation",
    category: "Time Range",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "start-time-ms",
  },
  {
    name: "endTimeMs",
    type: "number",
    access: "R/W",
    useCase: "Custom end time for thumbnail generation",
    category: "Time Range",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "end-time-ms",
  },
  {
    name: "useIntrinsicDuration",
    type: "boolean",
    access: "R/W",
    useCase: "Use full source duration instead of trimmed duration",
    category: "Time Range",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "use-intrinsic-duration",
    defaultValue: "false",
  },
];


