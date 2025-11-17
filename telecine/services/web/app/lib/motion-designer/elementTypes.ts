import {
  CursorText,
  Square,
  Clock,
  Panorama,
  VideoCamera,
  SpeakerHigh,
} from "@phosphor-icons/react";

export type ElementType = "text" | "div" | "timegroup" | "image" | "video" | "audio";

export type ToolCategory = "shapes" | "media" | "containers" | "text";

type IconComponent = typeof CursorText;

export interface ElementTypeConfig {
  type: ElementType;
  label: string;
  icon: IconComponent;
  category: ToolCategory;
  shortcut: string;
}

export const ELEMENT_TYPES: ElementTypeConfig[] = [
  { type: "text", label: "Text", icon: CursorText, category: "text", shortcut: "T" },
  { type: "div", label: "Div", icon: Square, category: "shapes", shortcut: "D" },
  { type: "timegroup", label: "Timegroup", icon: Clock, category: "containers", shortcut: "G" },
  { type: "image", label: "Image", icon: Panorama, category: "media", shortcut: "I" },
  { type: "video", label: "Video", icon: VideoCamera, category: "media", shortcut: "M" },
  { type: "audio", label: "Audio", icon: SpeakerHigh, category: "media", shortcut: "A" },
] as const;

export const TOOL_CATEGORIES: { id: ToolCategory; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "shapes", label: "Shapes" },
  { id: "media", label: "Media" },
  { id: "containers", label: "Containers" },
];

export function getElementIcon(type: string): IconComponent {
  const config = ELEMENT_TYPES.find((et) => et.type === type);
  return config?.icon ?? Square;
}

export function getElementLabel(type: string): string {
  const config = ELEMENT_TYPES.find((et) => et.type === type);
  return config?.label ?? type;
}

export function getElementsByCategory(category: ToolCategory): ElementTypeConfig[] {
  return ELEMENT_TYPES.filter((et) => et.category === category);
}

