import * as React from "react";
import type { HeadersFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, Link, useLoaderData } from "react-router";
import { getMDXComponent } from "mdx-bundler/client";
import { parseMdx } from "~/utils/mdx-bundler.server";
import { getBlogFile } from "~/utils/doc.server";
import { BlogFrontmatterSchema } from "~/utils/blog-schema";
import { getAuthor } from "~/content/authors";
import { formatDate } from "~/ui/formatDate";
import { Prose } from "~/components/marketing/Prose";
import { CustomLink, CustomCode } from "~/components/shared/Markdown";
import { Callout, VideoDemo, CodeBlock } from "~/components/mdx";
import { CacheControl } from "~/utils/cache-control.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const slug = params.slug;
  if (!slug) throw data({}, { status: 404 });

  let raw: string;
  try {
    raw = await getBlogFile(slug);
  } catch {
    throw data({}, { status: 404 });
  }

  const parsed = await parseMdx(raw);
  const fm = BlogFrontmatterSchema.safeParse(parsed.frontmatter);
  if (!fm.success) {
    throw new Error(`Invalid frontmatter in blog/${slug}: ${fm.error.message}`);
  }

  const author = getAuthor(fm.data.author);

  return data(
    {
      slug,
      frontmatter: fm.data,
      code: parsed.code,
      readTime: parsed.readTime,
      author,
    },
    {
      headers: { "Cache-Control": new CacheControl("swr").toString() },
    },
  );
};

export const headers: HeadersFunction = ({ loaderHeaders }) => ({
  "Cache-Control": loaderHeaders.get("Cache-Control")!,
});

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Blog | Editframe" }];
  const { frontmatter, slug, author } = data;
  const ogImage = frontmatter.ogImage ?? frontmatter.coverImage;
  const canonicalUrl = `https://editframe.com/blog/${slug}`;

  return [
    { title: `${frontmatter.title} | Editframe Blog` },
    { name: "description", content: frontmatter.description },
    { property: "og:type", content: "article" },
    { property: "og:title", content: frontmatter.title },
    { property: "og:description", content: frontmatter.description },
    ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
    { property: "og:url", content: canonicalUrl },
    {
      property: "article:published_time",
      content: new Date(frontmatter.date).toISOString(),
    },
    { property: "article:author", content: author.name },
    ...frontmatter.tags.map((tag) => ({
      property: "article:tag",
      content: tag,
    })),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: frontmatter.title },
    { name: "twitter:description", content: frontmatter.description },
    ...(ogImage ? [{ name: "twitter:image", content: ogImage }] : []),
  ];
};

export default function BlogPost() {
  const { frontmatter, code, readTime, author } = useLoaderData<typeof loader>();
  const Component = React.useMemo(() => getMDXComponent(code), [code]);

  return (
    <article className="py-16 sm:py-24">
      <header className="mb-12 max-w-3xl">
        {frontmatter.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {frontmatter.tags.map((tag) => (
              <Link
                key={tag}
                to={`/blog/tag/${tag}`}
                className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          {frontmatter.title}
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          {frontmatter.description}
        </p>

        <div className="mt-6 flex items-center gap-4">
          {author.avatar && (
            <img
              src={author.avatar}
              alt={author.name}
              className="w-10 h-10 rounded-full object-cover bg-zinc-200 dark:bg-zinc-800"
              loading="lazy"
            />
          )}
          <div>
            <Link
              to={`/blog/author/${frontmatter.author}`}
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              {author.name}
            </Link>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
              <time dateTime={frontmatter.date}>
                {formatDate(frontmatter.date)}
              </time>
              <span>·</span>
              <span>{readTime.text}</span>
            </div>
          </div>
        </div>
      </header>

      {frontmatter.coverImage && (
        <div className="mb-12 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
          <img
            src={frontmatter.coverImage}
            alt={frontmatter.title}
            className="w-full max-h-[480px] object-cover"
          />
        </div>
      )}

      <div className="max-w-3xl">
        <Prose>
          <Component
            components={{
              a: CustomLink,
              code: CustomCode,
              Callout,
              VideoDemo,
              CodeBlock,
            }}
          />
        </Prose>
      </div>
    </article>
  );
}
