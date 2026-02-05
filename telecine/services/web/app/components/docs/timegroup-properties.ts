import type { PropertyDefinition } from "./PropertyReference";

export const timegroupProperties: PropertyDefinition[] = [
  // ============================================================================
  // Temporal Composition
  // ============================================================================
  {
    name: "mode",
    type: "string",
    access: "R/W",
    useCase: "Temporal composition mode (fixed, sequence, contain, fit)",
    category: "Temporal Composition",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "mode",
    defaultValue: "contain",
  },
  {
    name: "overlap",
    type: "timestring",
    access: "R/W",
    useCase: "Overlap duration between sequential items in sequence mode",
    category: "Temporal Composition",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "overlap",
    defaultValue: "0s",
  },
  {
    name: "duration",
    type: "timestring",
    access: "R/W",
    useCase: "Explicit duration (only applies in fixed mode)",
    category: "Temporal Composition",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "duration",
    defaultValue: "",
  },
  {
    name: "durationMs",
    type: "number",
    access: "R",
    useCase: "Computed duration in milliseconds (based on mode and children)",
    category: "Temporal Composition",
    domReadable: true,
  },
  {
    name: "offset",
    type: "timestring",
    access: "R/W",
    useCase: "Time offset within parent timegroup",
    category: "Temporal Composition",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "offset",
    defaultValue: "0s",
  },

  // ============================================================================
  // Time Coordinates
  // ============================================================================
  {
    name: "currentTime",
    type: "number",
    access: "R/W",
    useCase: "Playback position in root timeline (seconds)",
    category: "Time Coordinates",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "currenttime",
    defaultValue: "0",
  },
  {
    name: "currentTimeMs",
    type: "number",
    access: "R/W",
    useCase: "Playback position in root timeline (milliseconds)",
    category: "Time Coordinates",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "currenttime",
    defaultValue: "0",
  },
  {
    name: "ownCurrentTimeMs",
    type: "number",
    access: "R",
    useCase: "Current time in element's local timeline (milliseconds)",
    category: "Time Coordinates",
    domReadable: true,
  },
  {
    name: "startTimeMs",
    type: "number",
    access: "R",
    useCase: "Start time within root timegroup (milliseconds)",
    category: "Time Coordinates",
    domReadable: true,
  },
  {
    name: "endTimeMs",
    type: "number",
    access: "R",
    useCase: "End time within root timegroup (milliseconds)",
    category: "Time Coordinates",
    domReadable: true,
  },
  {
    name: "fps",
    type: "number",
    access: "R/W",
    useCase: "Frames per second for frame quantization",
    category: "Time Coordinates",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "fps",
    defaultValue: "30",
  },
  {
    name: "effectiveFps",
    type: "number",
    access: "R",
    useCase: "Actual FPS being used (render options FPS during rendering, otherwise fps property)",
    category: "Time Coordinates",
    domReadable: true,
  },

  // ============================================================================
  // Trimming & Source Manipulation
  // ============================================================================
  {
    name: "trimstart",
    type: "timestring",
    access: "R/W",
    useCase: "Trim from the start of the content",
    category: "Trimming",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "trimstart",
  },
  {
    name: "trimend",
    type: "timestring",
    access: "R/W",
    useCase: "Trim from the end of the content",
    category: "Trimming",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "trimend",
  },
  {
    name: "sourcein",
    type: "timestring",
    access: "R/W",
    useCase: "Source in-point (alternative to trimstart)",
    category: "Trimming",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "sourcein",
  },
  {
    name: "sourceout",
    type: "timestring",
    access: "R/W",
    useCase: "Source out-point (alternative to trimend)",
    category: "Trimming",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "sourceout",
  },

  // ============================================================================
  // Playback Control
  // ============================================================================
  {
    name: "loop",
    type: "boolean",
    access: "R/W",
    useCase: "Enable looping playback",
    category: "Playback",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "loop",
    defaultValue: "false",
  },
  {
    name: "autoInit",
    type: "boolean",
    access: "R/W",
    useCase: "Automatically seek to frame 0 after media loads (root timegroups only)",
    category: "Playback",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "auto-init",
    defaultValue: "false",
  },
  {
    name: "isRootTimegroup",
    type: "boolean",
    access: "R",
    useCase: "Whether this is the root timegroup (no parent)",
    category: "Playback",
    domReadable: true,
  },

  // ============================================================================
  // Visual Layout
  // ============================================================================
  {
    name: "fit",
    type: "string",
    access: "R/W",
    useCase: "Visual scaling behavior (none, contain, cover)",
    category: "Visual Layout",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "fit",
    defaultValue: "none",
  },

  // ============================================================================
  // Development Tools
  // ============================================================================
  {
    name: "workbench",
    type: "boolean",
    access: "R/W",
    useCase: "Wrap with ef-workbench for development UI (hierarchy, timeline, controls)",
    category: "Development",
    domReadable: true,
    domWritable: true,
    htmlAttribute: "workbench",
    defaultValue: "false",
  },
];


