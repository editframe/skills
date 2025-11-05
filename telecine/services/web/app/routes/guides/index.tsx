import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import type { MetaFunction } from "react-router";

import { getAllGuidesContent } from "~/utils/doc.server";
import { Card } from "~/components/marketing/Card";
import { formatDate } from "~/ui/formatDate";

export const loader = async (_: LoaderFunctionArgs) => {
  const posts = await getAllGuidesContent();
  if (!posts) {
    throw new Error("No posts found");
  }
  return { posts };
};

export const meta: MetaFunction = () => {
  return [
    { title: "Guides | Editframe" },
    {
      name: "description",
      content: "Guides for using Editframe",
    },
  ];
};

export default function Guide() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <main
      className="mt-8 flex max-w-full flex-1 flex-col px-6 sm:container"
      tabIndex={-1}
    >
      <h1 className="text-4xl md:pl-6  font-bold text-gray-800 dark:text-gray-200">
        Guides
      </h1>
      <p className="text-md mt-4 md:pl-6 text-gray-800 dark:text-gray-200">
        Welcome to the Editframe Guides section. Here you will find a collection
        of guides to help you make the most out of Editframe. Whether you are a
        beginner or an experienced user, our guides are designed to provide you
        with the information you need to succeed.
      </p>
      <div className="border-zinc-100 mt-12 pb-16 md:border-l md:ml-6 md:pl-6">
        <div className="flex max-w-3xl flex-col space-y-16">
          {posts.map((guide) => (
            <article className="md:grid md:grid-cols-4 md:items-baseline" key={guide.slug}>
              <Card
                className="cursor-pointer md:col-span-3"
                href={guide.slug}
              >
                <Card.Title>{guide.title}</Card.Title>
                <Card.Eyebrow as="time" className="mt-2 md:hidden" decorate>
                  {guide.publishedDate}
                </Card.Eyebrow>
                <Card.Description>{guide.description}</Card.Description>
                <Card.Cta>Read full guide</Card.Cta>
              </Card>
              <Card.Eyebrow as="time" className="hidden md:block">
                {guide.publishedDate}
              </Card.Eyebrow>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
