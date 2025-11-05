export function convertToJsx(element: React.ReactNode, indent = 0): string {
  // Handle null, undefined, or primitive values
  if (!element || typeof element !== "object") {
    return "  ".repeat(indent) + String(element || "");
  }

  // Handle arrays
  if (Array.isArray(element)) {
    return element.map((child) => convertToJsx(child, indent)).join("\n");
  }

  // Handle React elements
  if ((element as React.ReactElement).props) {
    const el = element as React.ReactElement;
    const type = el.type;
    const props = el.props;

    const componentName = type instanceof Function ? type.name : String(type);
    const { attributes, multiline } = convertJsxProps(props, indent + 1);
    const children = props.children
      ? convertToJsx(props.children, indent + 1)
      : "";

    const indentation = "  ".repeat(indent);

    // Handle self-closing tags
    if (!children) {
      return multiline
        ? `${indentation}<${componentName}${attributes}\n${indentation}/>`
        : `${indentation}<${componentName}${attributes} />`;
    }

    // Return full element with children
    return multiline
      ? `${indentation}<${componentName}${attributes}\n${indentation}>\n${children}\n${indentation}</${componentName}>`
      : `${indentation}<${componentName}${attributes}>\n${children}\n${indentation}</${componentName}>`;
  }

  // Handle text nodes
  return "  ".repeat(indent) + String(element);
}
function convertJsxProps(
  props: Record<string, any>,
  indent: number,
): { attributes: string; multiline: boolean } {
  if (!props) return { attributes: "", multiline: false };

  const indentation = "  ".repeat(indent);
  const attributes = Object.entries(props).filter(
    ([key]) => key !== "children",
  );

  if (attributes.length === 0) return { attributes: "", multiline: false };

  // If only one attribute, keep it on the same line
  if (attributes.length === 1) {
    const [key, value] = attributes[0]!;
    if (typeof value === "boolean") {
      return { attributes: value ? ` ${key}` : "", multiline: false };
    }
    if (key === "style" && typeof value === "object") {
      const formattedStyle = Object.entries(value)
        .map(([k, v]) => {
          if (typeof v === "string" && v.includes("\n")) {
            const indentStr = "  ".repeat(indent + 2);
            const lines = v
              .split("\n")
              .map((line) => line.trim())
              .join(`\n${indentStr}`);
            return `'${k}': \`${lines}\n${"  ".repeat(indent + 1)}\``;
          }
          return `'${k}': '${v}'`;
        })
        .join(`,\n${"  ".repeat(indent)}`);
      return {
        attributes: ` style={{\n${"  ".repeat(indent + 1)}${formattedStyle}\n${"  ".repeat(indent)}}}`,
        multiline: true,
      };
    }
    if (typeof value === "string") {
      return { attributes: ` ${key}="${value}"`, multiline: false };
    }
    return { attributes: "", multiline: false };
  }

  // Multiple attributes - put each on its own line
  const result = attributes
    .map(([key, value]) => {
      if (typeof value === "boolean") {
        return value ? `${key}` : null;
      }
      if (key === "style" && typeof value === "object") {
        const formattedStyle = Object.entries(value)
          .map(([k, v]) => {
            if (typeof v === "string" && v.includes("\n")) {
              const indentStr = "  ".repeat(indent + 2);
              const lines = v
                .split("\n")
                .map((line) => line.trim())
                .join("\n" + indentStr);
              return `'${k}': \`${lines}\n${"  ".repeat(indent + 1)}\``;
            }
            return `'${k}': '${v}'`;
          })
          .join(",\n" + "  ".repeat(indent));
        return `style={{\n${"  ".repeat(indent + 1)}${formattedStyle}\n${"  ".repeat(indent)}}}`;
      }
      if (typeof value === "string") {
        return `${key}="${value}"`;
      }
      return null;
    })
    .filter(Boolean)
    .map((attr) => `${indentation}${attr}`)
    .join("\n");

  return {
    attributes: `\n${result}`,
    multiline: true,
  };
}
