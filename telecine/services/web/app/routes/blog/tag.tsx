import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, useLoaderData } from "react-router";
import { getAllBlogsContent } from "~/utils/doc.server";
import { formatDate } from "~/ui/formatDate";
import { Link } from "react-router";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const tag = params.tag;
  if (!tag) throw data({}, { status: 404 });

  const all = await getAllBlogsContent();
  const posts = all.filter((p) => p.tags.includes(tag));

  return { tag, posts };
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Blog | Editframe" }];
  return [
    { title: `#${data.tag} — Blog | Editframe` },
    {
      name: "description",
      content: `Posts tagged with ${data.tag} on the Editframe blog.`,
    },
  ];
};

export default function BlogTag() {
  const { tag, posts } = useLoaderData<typeof loader>();

  return (
    <div className="py-16 sm:py-24">
      <div className="mb-12">
        <Link
          to="/blog"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          ← All posts
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Posts tagged{" "}
          <span className="text-zinc-500 dark:text-zinc-400">#{tag}</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
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
              <time
                dateTime={post.date}
                className="mt-3 block text-xs text-zinc-500 dark:text-zinc-500"
              >
                {formatDate(post.date)}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-zinc-500 dark:text-zinc-400">
          No posts with this tag yet.
        </p>
      )}
    </div>
  );
}
