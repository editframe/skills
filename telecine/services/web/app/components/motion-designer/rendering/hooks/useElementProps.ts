import type { ElementNode } from "~/lib/motion-designer/types";

export function useElementProps(element: ElementNode): {
  props: Record<string, any>;
  textContent: string | null;
} {
  // Extract textContent from props.content if it exists (for text elements)
  const textContent = element.props.content || null;

  // Ensure timegroup elements have an id attribute for DOM access
  const props = { ...element.props };
  if (element.type === "timegroup" && !props.id) {
    props.id = element.id;
  }

  return { props, textContent };
}
