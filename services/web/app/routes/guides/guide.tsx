import type { HeadersFunction, MetaFunction } from "react-router";

import { data, useLoaderData } from "react-router";
import * as React from "react";
import { getMDXComponent } from "mdx-bundler/client";
import { parseMdx } from "~/utils/mdx-bundler.server";
import { getContent } from "~/utils/doc.server";

import { CacheControl } from "~/utils/cache-control.server";
import invariant from "tiny-invariant";
import type { LoaderFunctionArgs } from "react-router";
import cx from "classnames";
import { Video } from "~/components/marketing/Video";
import { CustomCode, CustomLink } from "~/components/shared/Markdown";
import { CodeBlock } from "~/components/CodeBlock";
import { Audio } from "~/components/marketing/Audio";
import { Prose } from "~/components/marketing/Prose";
import { formatDate } from "~/ui/formatDate";
import { typographyClasses } from "~/utils/typography";

export const loader = async (request: LoaderFunctionArgs) => {
  const { params } = request;
  let path = params["*"];

  if (!path) {
    path = "index";
  }

  invariant(path, "path is required");

  if (!path) {
    throw new Error("path is not defined");
  }
  path = path.replace(/\/$/, "");
  const file = await getContent(`/guides/${path}`);
  if (!file) {
    throw data(
      {},
      {
        status: 404,
        headers: {},
      },
    );
  }
  const post = await parseMdx(file.content);
  post.frontmatter.published_date = post.frontmatter.published_date
    ? formatDate(post.frontmatter.published_date)
    : "";
  post.frontmatter.last_updated = post.frontmatter.last_updated
    ? formatDate(post.frontmatter.last_updated)
    : "";

  if (!post) {
    throw data(
      {
        message: "Doc Page not found",
      },
      {
        status: 404,
        headers: {},
      },
    );
  }

  return data(
    { post },
    {
      headers: {
        "Cache-Control": new CacheControl("swr").toString(),
      },
    },
  );
};

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control")!,
  };
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [
      { title: "Guides | Editframe" },
      { name: "description", content: "Guides for using Editframe" },
    ];
  }
  const { post } = data;
  const title = post.frontmatter.meta.find((m) => m.title)?.title;
  const description = post.frontmatter.meta.find(
    (m) => m.name === "description",
  )?.content;
  return [
    { title: `${title} | Editframe` },
    { name: "description", content: description },
  ];
};

export default function GuidePage() {
  const { post } = useLoaderData<typeof loader>();
  const { code, readTime } = post;
  const title = post.frontmatter.meta.find((m) => m.title)?.title;
  const Component = React.useMemo(() => getMDXComponent(code), [code]);
  return (
    <main
      className="mt-8 flex max-w-full flex-1 flex-col px-6 sm:container"
      tabIndex={-1}
    >
      <div className={cx("lg:ml-3", "my-4 lg:pl-6 xl:pl-10 2xl:pl-12")}>
        <div className=" mx-auto">
          <div className="xl:flex xl:w-full xl:justify-between xl:gap-8">
            <div className="min-w-0 xl:flex-grow">
              <h1
                className={
                  typographyClasses.h1NoSpacing + " py-4 dark:text-white"
                }
              >
                {title}
              </h1>
              <h5
                className={
                  typographyClasses.small +
                  " my-4 font-semibold dark:text-white"
                }
              >
                Published on {post.frontmatter.published_date}
              </h5>
              {post.frontmatter.last_updated && (
                <h5
                  className={
                    typographyClasses.small +
                    " my-4 font-semibold dark:text-white"
                  }
                >
                  Last updated on {post.frontmatter.last_updated}
                </h5>
              )}
              <h3 className={typographyClasses.small + " my-4 dark:text-white"}>
                {readTime.text}
              </h3>
              <div
                className="markdown w-full pb-[10vh]"
                style={{ maxWidth: "65ch" }}
              >
                <div className="min-w-0 xl:flex-grow">
                  <div
                    className="markdown w-full pb-[33vh]"
                    style={{ maxWidth: "65ch" }}
                  >
                    <Prose>
                      <Component
                        components={{
                          a: CustomLink,
                          h1: ({ children, ...props }) => (
                            <h1 {...props}>{children}</h1>
                          ),
                          pre: ({ children, ...props }) => (
                            <CodeBlock {...props}>{children}</CodeBlock>
                          ),
                          Audio: Audio,
                          Video: Video,
                          code: CustomCode,
                        }}
                      />
                    </Prose>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
