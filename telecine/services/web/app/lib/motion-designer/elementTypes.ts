import {
  CursorText,
  Square,
  Clock,
  Panorama,
  VideoCamera,
  SpeakerHigh,
} from "@phosphor-icons/react";

export type ElementType = "text" | "div" | "timegroup" | "image" | "video" | "audio";

type IconComponent = typeof CursorText;

export interface ElementTypeConfig {
  type: ElementType;
  label: string;
  icon: IconComponent;
}

export const ELEMENT_TYPES: ElementTypeConfig[] = [
  { type: "text", label: "Text", icon: CursorText },
  { type: "div", label: "Div", icon: Square },
  { type: "timegroup", label: "Timegroup", icon: Clock },
  { type: "image", label: "Image", icon: Panorama },
  { type: "video", label: "Video", icon: VideoCamera },
  { type: "audio", label: "Audio", icon: SpeakerHigh },
] as const;

export function getElementIcon(type: string): IconComponent {
  const config = ELEMENT_TYPES.find((et) => et.type === type);
  return config?.icon ?? Square;
}

export function getElementLabel(type: string): string {
  const config = ELEMENT_TYPES.find((et) => et.type === type);
  return config?.label ?? type;
}

