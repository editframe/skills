import type { ElementNode } from "~/lib/motion-designer/types";

export function buildHierarchy(
  rootIds: string[],
  elements: Record<string, ElementNode>,
): ElementNode[] {
  const result: ElementNode[] = [];
  for (const id of rootIds) {
    const element = elements[id];
    if (element) {
      result.push(element);
    }
  }
  return result;
}

