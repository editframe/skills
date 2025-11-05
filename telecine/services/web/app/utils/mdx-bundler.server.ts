import { bundleMDX } from "mdx-bundler";
import { createElement } from "react";
import calculateReadingTime from "reading-time";
import rehypeHeadings from "./parseHeadings";
import type { Heading } from "~/types";
import rehypeReact from "rehype-react";


type Frontmatter = {
  meta: {
    name: string;
    title: string;
    content?: string;
  }[];
  published_date: string;
  last_updated?: string;
}
export async function parseMdx(mdx: string) {
  const { default: rehypeAutolinkHeadings } = await import(
    "rehype-autolink-headings"
  );

  const { default: rehypeSlug } = await import("rehype-slug");

  const headings: Heading[] = [];

  const { frontmatter, code } = await bundleMDX<Frontmatter>({
    source: mdx,
    mdxOptions(options) {
      options.remarkPlugins = [...(options.remarkPlugins ?? [])];
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
