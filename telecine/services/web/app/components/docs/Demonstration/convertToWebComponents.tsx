export function convertToWebComponents(
  element: React.ReactNode,
  indent = 0,
): string {
  // Handle null, undefined, or primitive values
  if (!element || typeof element !== "object") {
    return "  ".repeat(indent) + String(element || "");
  }

  // Handle arrays (like multiple children)
  if (Array.isArray(element)) {
    return element
      .map((child) => convertToWebComponents(child, indent))
      .join("\n");
  }

  // Handle React elements
  if ((element as React.ReactElement).props) {
    const el = element as React.ReactElement;
    let { type, props } = el;

    if (type instanceof Function) {
      type = type.name;
    }

    const tagName = convertToKebabCase(type as string);

    const { attributes, multiline } = convertProps(props, indent + 1);
    const children = props.children
      ? convertToWebComponents(props.children, indent + 1)
      : "";

    const indentation = "  ".repeat(indent);

    // Return full element with children
    return multiline
      ? `${indentation}<${tagName}${attributes}\n${indentation}>\n${children}\n${indentation}</${tagName}>`
      : `${indentation}<${tagName}${attributes}>\n${children}\n${indentation}</${tagName}>`;
  }

  // Handle text nodes
  return "  ".repeat(indent) + String(element);
}
function convertProps(
  props: Record<string, any>,
  indent: number,
): { attributes: string; multiline: boolean } {
  if (!props) return { attributes: "", multiline: false };

  const indentation = "  ".repeat(indent);
  const attributes = Object.entries(props).filter(
    ([key]) => key !== "children",
  );

  // If no attributes, return early
  if (attributes.length === 0) return { attributes: "", multiline: false };

  // If only one attribute, keep it on the same line
  if (attributes.length === 1) {
    const [key, value] = attributes[0]!;
    const attr = convertToKebabCase(key === "className" ? "class" : key);

    if (typeof value === "boolean") {
      return { attributes: value ? ` ${attr}` : "", multiline: false };
    }

    if (key === "style" && typeof value === "object") {
      return {
        attributes: ` style="${convertStyleObjectToCss(value)}"`,
        multiline: false,
      };
    }

    if (key.startsWith("on") && typeof value === "function") {
      return { attributes: "", multiline: false };
    }

    return { attributes: ` ${attr}="${escapeHtml(value)}"`, multiline: false };
  }

  // Multiple attributes - put each on its own line
  const result = attributes.reduce((acc, [key, value]) => {
    // Convert className to class
    if (key === "className") {
      key = "class";
    }

    // Convert camelCase to kebab-case for attributes
    const attr = convertToKebabCase(key);

    // Handle boolean attributes
    if (typeof value === "boolean") {
      return value ? `${acc}\n${indentation}${attr}` : acc;
    }

    // Handle style objects
    if (key === "style" && typeof value === "object") {
      const styleString = convertStyleObjectToCss(value);
      return `${acc}\n${indentation}style="${styleString}"`;
    }

    // Handle event handlers
    if (key.startsWith("on") && typeof value === "function") {
      return acc; // Skip event handlers in HTML output
    }

    // Handle regular attributes
    return `${acc}\n${indentation}${attr}="${escapeHtml(value)}"`;
  }, "");

  return {
    attributes: result,
    multiline: true,
  };
}
function convertToKebabCase(str: string): string {
  // Handle React component names (e.g., TimeGroup -> ef-timegroup)
  if (/^[A-Z]/.test(str)) {
    return `ef-${str
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "")}`;
  }

  // Handle props/attributes
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}
function convertStyleObjectToCss(style: Record<string, any>): string {
  return Object.entries(style)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      // Handle numbers by adding 'px' if needed
      const cssValue =
        typeof value === "number" && value !== 0 ? `${value}px` : value;
      return `${cssKey}: ${cssValue}`;
    })
    .join("; ");
}
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
