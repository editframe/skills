// @ts-ignore
const rehypeHeadings = (options: Options) => {
  // @ts-ignore
  return async function transform(tree: M.Root) {
    const { visit } = await import("unist-util-visit");

    const getNodeText = (node: any): string => {
      if (typeof node === "string") return node;
      if (node.value) return node.value;
      if (node.children) {
        return node.children.map(getNodeText).join("");
      }
      return "";
    };

    visit(
      tree,
      // @ts-ignore
      (node) => {
        return (
          // @ts-ignore
          (node.type === "element" && /^h[2-6]$/.test(node.tagName)) ||
          // @ts-ignore
          (node.type === "mdxJsxFlowElement" && node.name === "PropertyDoc")
        );
      },
      function visitor(node) {
        if (node.type === "element") {
          const { properties } = node;
          if (properties?.id) {
            options.exportRef.push({
              id: properties?.id,
              text: getNodeText(node),
              level: Number.parseInt(node.tagName.charAt(1), 10),
            });
          }
        } else if (node.type === "mdxJsxFlowElement") {
          // @ts-ignore
          const nameAttr = node.attributes?.find(
            (attr) => attr.name === "name",
          );
          if (nameAttr?.value) {
            options.exportRef.push({
              id: `attr-${nameAttr.value}`,
              text: nameAttr.value,
              level: 3, // Treat PropertyDoc as h3
            });
          }
        }
      },
    );
  };
};

export default rehypeHeadings;
