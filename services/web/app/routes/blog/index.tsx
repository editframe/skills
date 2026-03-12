import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { getAllBlogsContent } from "~/utils/doc.server";
import { formatDate } from "~/ui/formatDate";

export const loader = async (_: LoaderFunctionArgs) => {
  const posts = await getAllBlogsContent();
  return { posts };
};

export const meta: MetaFunction = () => {
  return [
    { title: "Blog | Editframe" },
    {
      name: "description",
      content:
        "Thoughts on programmatic video, developer tooling, and building with Editframe.",
    },
    { property: "og:type", content: "website" },
    { property: "og:title", content: "Blog | Editframe" },
  ];
};

export default function BlogIndex() {
  const { posts } = useLoaderData<typeof loader>();

  const featured = posts.filter((p) => p.featured);
  const rest = posts.filter((p) => !p.featured);

  return (
    <div className="py-16 sm:py-24">
      <div className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Blog
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Thoughts on programmatic video, developer tooling, and building with
          Editframe.
        </p>
      </div>

      {featured.length > 0 && (
        <section className="mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-6">
            Featured
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {featured.map((post) => (
              <PostCard key={post.slug} post={post} featured />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          {featured.length > 0 && (
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-6">
              All Posts
            </h2>
          )}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rest.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      )}

      {posts.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400">
          No posts yet — check back soon.
        </p>
      )}
    </div>
  );
}

function PostCard({
  post,
  featured = false,
}: {
  post: {
    slug: string;
    title: string;
    description: string;
    date: string;
    author: string;
    tags: string[];
    coverImage?: string;
  };
  featured?: boolean;
}) {
  return (
    <article
      className={
        featured
          ? "group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          : "group flex gap-6 py-8"
      }
    >
      {featured && post.coverImage && (
        <div className="aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <img
            src={post.coverImage}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      {!featured && post.coverImage && (
        <div className="hidden sm:block w-32 h-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <img
            src={post.coverImage}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className={featured ? "p-6 flex flex-col flex-1" : "flex-1 min-w-0"}>
        <div className="flex flex-wrap gap-2 mb-3">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              to={`/blog/tag/${tag}`}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {tag}
            </Link>
          ))}
        </div>
        <Link to={`/blog/${post.slug}`} className="flex-1">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
            {post.description}
          </p>
        </Link>
        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
      </div>
    </article>
  );
}
