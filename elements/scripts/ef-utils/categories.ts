// Category descriptions for LLM discovery (type-first model)
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  elements: "elements - Composition primitives (things you put in a timegroup to build video content)",
  gui: "gui - User interface components (how users interact with and view elements)",
  demos: "demos - Example compositions (complete working examples showing element + gui integration)",
};

// Map category keys to display labels
export const CATEGORY_LABELS: Record<string, string> = {
  elements: "elements",
  gui: "gui",
  demos: "demos",
};

// Subcategory descriptions for each parent category
export const SUBCATEGORY_DESCRIPTIONS: Record<string, Record<string, string>> = {
  elements: {
    temporal: "Time containers for synchronizing content",
    media: "Video, audio, and image content",
    text: "Text and caption content",
    visualization: "Visual representation of audio data",
  },
  gui: {
    controls: "Playback and input widgets",
    timeline: "Timeline editing interface",
    hierarchy: "Layer/element tree display",
    preview: "Content preview and thumbnails",
    canvas: "Spatial composition area",
    config: "Configuration and settings",
  },
  demos: {
    workbench: "Complete editor environment",
    compactness: "CSS variable and styling demo",
  },
};
