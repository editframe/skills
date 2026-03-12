import * as React from "react";
import type { HeadersFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, Link, useLoaderData } from "react-router";
import { getMDXComponent } from "mdx-bundler/client";
import { parseMdx } from "~/utils/mdx-bundler.server";
import { getChangelogFile } from "~/utils/doc.server";
import { ChangelogFrontmatterSchema } from "~/utils/blog-schema";
import { formatDate } from "~/ui/formatDate";
import { Prose } from "~/components/marketing/Prose";
import { CustomLink, CustomCode } from "~/components/shared/Markdown";
import { Callout, CodeBlock } from "~/components/mdx";
import { CacheControl } from "~/utils/cache-control.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const slug = params.slug;
  if (!slug) throw data({}, { status: 404 });

  let raw: string;
  try {
    raw = await getChangelogFile(slug);
  } catch {
    throw data({}, { status: 404 });
  }

  const parsed = await parseMdx(raw);
  const fm = ChangelogFrontmatterSchema.safeParse(parsed.frontmatter);
  if (!fm.success) {
    throw new Error(`Invalid frontmatter in changelog/${slug}: ${fm.error.message}`);
  }

  return data(
    { slug, frontmatter: fm.data, code: parsed.code, readTime: parsed.readTime },
    { headers: { "Cache-Control": new CacheControl("swr").toString() } },
  );
};

export const headers: HeadersFunction = ({ loaderHeaders }) => ({
  "Cache-Control": loaderHeaders.get("Cache-Control")!,
});

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Changelog | Editframe" }];
  const { frontmatter, slug } = data;
  return [
    { title: `${frontmatter.title} | Editframe Changelog` },
    { name: "description", content: frontmatter.description },
    { property: "og:type", content: "article" },
    { property: "og:title", content: frontmatter.title },
    { property: "og:description", content: frontmatter.description },
    {
      property: "og:url",
      content: `https://editframe.com/changelog/${slug}`,
    },
    {
      property: "article:published_time",
      content: new Date(frontmatter.date).toISOString(),
    },
  ];
};

export default function ChangelogEntry() {
  const { frontmatter, code, readTime } = useLoaderData<typeof loader>();
  const Component = React.useMemo(() => getMDXComponent(code), [code]);

  return (
    <article className="py-16 sm:py-24">
      <div className="mb-6">
        <Link
          to="/changelog"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          ← Changelog
        </Link>
      </div>

      <header className="mb-12 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <time
            dateTime={frontmatter.date}
            className="text-sm font-semibold text-zinc-500 dark:text-zinc-400"
          >
            {formatDate(frontmatter.date)}
          </time>
          {frontmatter.version && (
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              v{frontmatter.version}
            </span>
          )}
          {frontmatter.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          {frontmatter.title}
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          {frontmatter.description}
        </p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          {readTime.text}
        </p>
      </header>

      <div className="max-w-3xl">
        <Prose>
          <Component
            components={{
              a: CustomLink,
              code: CustomCode,
              Callout,
              CodeBlock,
            }}
          />
        </Prose>
      </div>
    </article>
  );
}
