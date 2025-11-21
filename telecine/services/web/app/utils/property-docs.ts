import type { PropertyDefinition } from "~/components/docs/video-properties";

export function getPropertyAnchor(name: string): string {
  return `#attr-${name}`;
}

export function getPropertyLink(
  name: string,
  elementPath: string = "video"
): string {
  return `/docs/elements/${elementPath}/reference${getPropertyAnchor(name)}`;
}

export function formatPropertyLink(
  name: string,
  elementPath: string = "video"
): string {
  return `[${name}](${getPropertyLink(name, elementPath)})`;
}

export function getPropertyAccessLabel(access: "R" | "W" | "R/W"): string {
  return access;
}

export function getPropertyCategory(prop: PropertyDefinition): string {
  return prop.category || "Other";
}

export function groupPropertiesByCategory(
  properties: PropertyDefinition[]
): Record<string, PropertyDefinition[]> {
  const grouped: Record<string, PropertyDefinition[]> = {};
  
  for (const prop of properties) {
    const category = getPropertyCategory(prop);
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(prop);
  }
  
  return grouped;
}

