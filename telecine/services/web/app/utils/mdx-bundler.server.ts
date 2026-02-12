import { bundleMDX } from "mdx-bundler";
import { createElement } from "react";
import calculateReadingTime from "reading-time";
import rehypeHeadings from "./parseHeadings";
import type { Heading } from "~/types";
import rehypeReact from "rehype-react";

const remarkCodeMeta = () => {
  return async (tree: any) => {
    const { visit } = await import("unist-util-visit");
    visit(tree, "code", (node: any) => {
      if (node.meta) {
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties["data-meta"] = node.meta;
      }
    });
  };
};

type Frontmatter = {
  meta: {
    name: string;
    title: string;
    content?: string;
  }[];
  published_date: string;
  last_updated?: string;
};
export async function parseMdx(mdx: string) {
  const { default: rehypeAutolinkHeadings } =
    await import("rehype-autolink-headings");

  const { default: rehypeSlug } = await import("rehype-slug");

  const { default: remarkGfm } = await import("remark-gfm");

  const headings: Heading[] = [];

  const { frontmatter, code } = await bundleMDX<Frontmatter>({
    source: mdx,
    mdxOptions(options) {
      options.remarkPlugins = [...(options.remarkPlugins ?? []), remarkGfm, remarkCodeMeta];
      options.rehypePlugins = [
        ...(options.rehypePlugins ?? []),
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: "wrap" }],
        [
          rehypeHeadings,
          {
            exportRef: headings,
          },
        ],
        [
          rehypeReact,
          {
            createElement: createElement,
          },
        ],
      ];

      return options;
    },
  });

  const readTime = calculateReadingTime(code);

  return {
    headings,
    frontmatter,
    readTime,
    code,
    body: code,
  };
}
