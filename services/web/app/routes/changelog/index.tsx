import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { getAllChangelogsContent } from "~/utils/doc.server";
import { formatDate } from "~/ui/formatDate";

export const loader = async (_: LoaderFunctionArgs) => {
  const entries = await getAllChangelogsContent();
  return { entries };
};

export const meta: MetaFunction = () => {
  return [
    { title: "Changelog | Editframe" },
    {
      name: "description",
      content: "What's new in Editframe — product updates, API changes, and improvements.",
    },
    { property: "og:type", content: "website" },
  ];
};

export default function ChangelogIndex() {
  const { entries } = useLoaderData<typeof loader>();

  return (
    <div className="py-16 sm:py-24">
      <div className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Changelog
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
          What's new in Editframe.
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="relative">
          <div className="absolute left-0 top-2 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-12">
            {entries.map((entry) => (
              <div key={entry.slug} className="relative pl-8">
                <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 ring-2 ring-white dark:ring-zinc-950" />
                <div className="flex flex-wrap items-baseline gap-3 mb-2">
                  <time
                    dateTime={entry.date}
                    className="text-sm font-semibold text-zinc-500 dark:text-zinc-400"
                  >
                    {formatDate(entry.date)}
                  </time>
                  {entry.version && (
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      v{entry.version}
                    </span>
                  )}
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link to={`/changelog/${entry.slug}`}>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    {entry.title}
                  </h2>
                </Link>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {entry.description}
                </p>
                <Link
                  to={`/changelog/${entry.slug}`}
                  className="mt-3 inline-flex items-center text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Read more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-zinc-500 dark:text-zinc-400">
          No changelog entries yet — check back soon.
        </p>
      )}
    </div>
  );
}
