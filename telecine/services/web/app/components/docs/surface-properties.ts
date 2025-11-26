import type { PropertyDefinition } from "./PropertyReference";

export const surfaceElementProperties: PropertyDefinition[] = [
  {
    name: "target",
    type: "string",
    access: "R/W",
    useCase: "ID of the element to copy content from (typically an ef-video element)",
    category: "Target",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "target",
  },
  {
    name: "targetElement",
    type: "Element | null",
    access: "R",
    useCase: "The resolved target element that this surface is copying from",
    category: "Target",
    domReadable: true,
  },
  {
    name: "startTimeMs",
    type: "number",
    access: "R",
    useCase: "Element start in root timeline",
    category: "Time Coordinates",
    domReadable: true,
  },
  {
    name: "endTimeMs",
    type: "number",
    access: "R",
    useCase: "Element end in root timeline",
    category: "Time Coordinates",
    domReadable: true,
  },
  {
    name: "durationMs",
    type: "number",
    access: "R",
    useCase: "Element duration",
    category: "Time Coordinates",
    domReadable: true,
  },
  {
    name: "currentTimeMs",
    type: "number",
    access: "R",
    useCase: "Current time in root timeline",
    category: "Time Coordinates",
    domReadable: true,
  },
  {
    name: "rootTimegroup",
    type: "<ef-timegroup> | null",
    access: "R",
    useCase: "Root timeline timegroup (prefers target element's root timegroup if available)",
    category: "Hierarchy",
    domReadable: true,
  },
];


