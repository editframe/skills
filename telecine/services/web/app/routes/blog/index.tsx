import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import type { MetaFunction } from "react-router";

import { getAllBlogsContent } from "~/utils/doc.server";
import { Card } from "~/components/marketing/Card";

export const loader = async (_: LoaderFunctionArgs) => {
  const posts = await getAllBlogsContent();
  if (!posts) {
    throw new Error("No posts found");
  }
  return { posts: posts };
};

export const meta: MetaFunction = () => {
  return [
    { title: "Editframe Blog" },
    {
      name: "description",
      content:
        "Thoughts about building excellent user experiences with Editframe.",
    },
  ];
};
export default function BlogIndex() {
  const data = useLoaderData<typeof loader>();
  const posts = data.posts;

  return (
    <main
      className="mt-8 flex max-w-full flex-1 flex-col px-6 sm:container"
      tabIndex={-1}
    >
      <h1 className="text-4xl md:pl-6  font-bold text-gray-800 dark:text-gray-200">
        Blog
      </h1>
      <p className="text-md mt-4 md:pl-6 text-gray-800 dark:text-gray-200">
        Welcome to the Editframe Blog section.
      </p>
      <div className="border-zinc-100 mt-12 pb-16 md:border-l md:ml-6 md:pl-6">
        <div className="flex max-w-3xl flex-col space-y-16">
          {posts.map((blog) => (
            <article
              className="md:grid md:grid-cols-4 md:items-baseline"
              key={blog.slug}
            >
              <Card className="cursor-pointer md:col-span-3" href={blog.slug}>
                <Card.Title>{blog.title}</Card.Title>
                <Card.Eyebrow as="time" className="mt-2 md:hidden" decorate>
                  {blog.publishedDate}
                </Card.Eyebrow>
                <Card.Description>{blog.description}</Card.Description>
                <Card.Cta>Read full post</Card.Cta>
              </Card>
              <Card.Eyebrow as="time" className="hidden md:block">
                {blog.publishedDate}
              </Card.Eyebrow>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
