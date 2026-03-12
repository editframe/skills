import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, Link, useLoaderData } from "react-router";
import { getAllBlogsContent } from "~/utils/doc.server";
import { getAuthor } from "~/content/authors";
import { formatDate } from "~/ui/formatDate";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const authorSlug = params.authorSlug;
  if (!authorSlug) throw data({}, { status: 404 });

  const author = getAuthor(authorSlug);
  const all = await getAllBlogsContent();
  const posts = all.filter((p) => p.author === authorSlug);

  return { authorSlug, author, posts };
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Blog | Editframe" }];
  const { author } = data;
  return [
    { title: `${author.name} — Editframe Blog` },
    { name: "description", content: author.bio },
  ];
};

export default function BlogAuthor() {
  const { author, posts } = useLoaderData<typeof loader>();

  return (
    <div className="py-16 sm:py-24">
      <div className="mb-12">
        <Link
          to="/blog"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          ← All posts
        </Link>
        <div className="mt-6 flex items-center gap-5">
          {author.avatar && (
            <img
              src={author.avatar}
              alt={author.name}
              className="w-16 h-16 rounded-full object-cover bg-zinc-200 dark:bg-zinc-800"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {author.name}
            </h1>
            {(author.twitter || author.github) && (
              <div className="mt-1 flex items-center gap-3">
                {author.twitter && (
                  <a
                    href={`https://x.com/${author.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  >
                    @{author.twitter}
                  </a>
                )}
                {author.github && (
                  <a
                    href={`https://github.com/${author.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  >
                    GitHub
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        {author.bio && (
          <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400 max-w-xl">
            {author.bio}
          </p>
        )}
      </div>

      {posts.length > 0 ? (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {posts.map((post) => (
            <article key={post.slug} className="py-8">
              <Link to={`/blog/${post.slug}`}>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                  {post.title}
                </h2>
              </Link>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {post.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <time
                  dateTime={post.date}
                  className="text-xs text-zinc-500 dark:text-zinc-500"
                >
                  {formatDate(post.date)}
                </time>
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/blog/tag/${tag}`}
                    className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-zinc-500 dark:text-zinc-400">
          No posts from this author yet.
        </p>
      )}
    </div>
  );
}
