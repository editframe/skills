import type { ElementNode } from "~/lib/motion-designer/types";

export function useElementProps(element: ElementNode): {
  props: Record<string, any>;
  textContent: string | null;
} {
  // Extract textContent from props.content if it exists (for text elements)
  const textContent = element.props.content || null;

  // Return props as-is; element-specific transformations are handled by strategies
  const props = { ...element.props };

  return { props, textContent };
}
