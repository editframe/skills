import type { MetaFunction } from "react-router";
import { useLoaderData, Link, useMatches } from "react-router";
import * as React from "react";
import { getMDXComponent } from "mdx-bundler/client";
import {
  CodeStep,
  CodeStepCode,
  CodeStepLabel,
  CodeSteps,
  CustomLink,
} from "~/components/docs/Markdown";
import { TableOfContents } from "~/components/docs/TableOfContents";
import "~/styles/docs.css";
import { Header } from "~/components/marketing/Header";
import { Footer } from "~/components/Footer";
import { parseMdx } from "~/utils/mdx-bundler.server";
import { getContent } from "~/utils/doc.server";
import type { Heading } from "~/types";
import { Menu } from "~/components/docs/Menu";
import { Libraries } from "~/components/docs/Libraries";
import { buildDocSlugMap, buildDocsMenu } from "~/utils/fs.server";
import "~/styles/md.css";
import { CodeBlock } from "~/components/CodeBlock";
import { Playground } from "~/components/docs/Playground";
import { PreviewVideo } from "~/components/docs/PreviewVideo";
import { Elements } from "~/components/docs/Elements";
import { Packages } from "~/components/docs/Packages";
import {
  Audio,
  Video,
  Image,
  Waveform,
  Filmstrip,
  Timegroup,
  FocusOverlay,
  Surface,
  ThumbnailStrip,
  Preview,
  Configuration,
  Captions,
  CaptionsActiveWord,
  CaptionsBeforeActiveWord,
  CaptionsAfterActiveWord,
  CaptionsSegment,
  Controls,
  TogglePlay,
  ToggleLoop,
  Scrubber,
  TimeDisplay,
} from "@editframe/react";
import clsx from "clsx";
import { Demonstration } from "~/components/docs/Demonstration/Demonstration.tsx";
import { EFPlayer } from "~/components/EFPlayer";
import { EditableWaveform } from "~/components/docs/EditableWaveform";
import { EditableThumbnailStrip } from "~/components/docs/EditableThumbnailStrip";
import { VideoEditorExample } from "~/components/docs/VideoEditorExample";
import { PropertyDoc, PropertyDocList } from "~/components/docs/PropertyDoc";
import { ShowDocItemByName } from "~/components/docs/typedoc";
import { WithEnv } from "~/components/WithEnv";
import Rotation from "./examples/rotation.tsx";
import Crop from "./examples/crop.tsx";

import {
  HTTPEndpoint,
  HTTPPayload,
  HTTPResponse,
} from "~/components/docs/resources/HTTPEndpoint";
import {
  ResourceOperation,
  ResourceOperationMethod,
} from "~/components/docs/resources/ResourceOperation";
import {
  PersistentTab,
  PersistentTabGroup,
} from "~/components/docs/PersistentTabGroup";

import type { Route } from "./+types/DocsPage";

export const loader = async ({ params }: Route.LoaderArgs) => {
  const path = params["*"] || "";
  const slugMap = await buildDocSlugMap();
  const file = await getContent(`docs/${slugMap[path]}`);

  if (!file) {
    throw new Response("Not Found", { status: 404 });
  }

  const post = await parseMdx(file.content);

  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }

  const menu = await buildDocsMenu();

  return { post, menu };
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [{ title: "Docs" }];
  }
  const { post } = data as { post: any };
  const title = post.frontmatter.meta.find((m: any) => m.title)?.title;
  const description = post.frontmatter.meta.find(
    (m: any) => m.name === "description",
  )?.content;
  return [{ title: `${title} | Docs`, description }];
};

export default function DocsPage() {
  const { post, menu } = useLoaderData<typeof loader>();
  const { headings, code } = post;
  const MDXAsComponent = React.useMemo(() => getMDXComponent(code), [code]);
  const matches = useMatches();
  const isDocsIndex = matches.some((match) => match.id.endsWith("index"));

  return (
    <div className="grid grid-rows-[auto_minmax(0,1fr)] h-screen contain-layout bg-background text-foreground">
      <Header className="bg-background" />

      <div className="grid grid-cols-[auto_1fr_auto] overflow-hidden">
        {/* Left sidebar - Menu */}
        <Menu menu={menu} className="overflow-auto pl-4 pr-8 pb-20" />

        {/* Main content */}
        <main className="overflow-auto relative">
          <div
            className={clsx(
              "pr-6",
              "markdown",
              "prose prose-slate max-w-none dark:prose-invert",
              // headings
              "prose-headings:scroll-mt-28 prose-headings:font-display prose-headings:font-normal lg:prose-headings:scroll-mt-[8.5rem]",
              "prose-lead:text-slate-500 dark:prose-lead:text-slate-400",
              // links
              "prose-a:no-underline",
              "prose-pre:bg-slate-900 dark:prose-pre:bg-slate-800/60 dark:prose-pre:ring-1 dark:prose-pre:ring-slate-300/10 prose-pre:overflow-hidden",
              // hr
              "dark:prose-hr:border-slate-800",
              "prose-h1:font-semibold dark:prose-h1:text-white",
              // selection style
              "selection:bg-slate-200 dark:selection:bg-slate-700",
              "prose-code:selection:bg-slate-200 dark:prose-code:selection:bg-slate-700",
            )}
          >
            <MDXAsComponent
              components={{
                TableOfContents: () => <TableOfContents headings={headings} />,
                a: CustomLink,
                h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
                Libraries,
                Configuration: (props) => <Configuration {...props} />,
                Captions: (props) => <Captions {...props} />,
                CaptionsActiveWord: (props) => <CaptionsActiveWord {...props} />,
                CaptionsBeforeActiveWord: (props) => <CaptionsBeforeActiveWord {...props} />,
                CaptionsAfterActiveWord: (props) => <CaptionsAfterActiveWord {...props} />,
                CaptionsSegment: (props) => <CaptionsSegment {...props} />,
                Controls: (props) => <Controls {...props} />,
                TogglePlay: (props) => <TogglePlay {...props} />,
                ToggleLoop: (props) => <ToggleLoop {...props} />,
                Scrubber: (props) => <Scrubber {...props} />,
                TimeDisplay: (props) => <TimeDisplay {...props} />,
                Audio: (props) => <Audio {...props} />,
                Video: (props) => <Video {...props} />,
                Image: (props) => <Image {...props} />,
                Waveform: (props) => <Waveform {...props} />,
                Timegroup: (props) => <Timegroup {...props} />,
                Surface: (props) => <Surface {...props} />,
                ThumbnailStrip: (props) => <ThumbnailStrip {...props} />,
                Filmstrip: (props) => <Filmstrip {...props} />,
                FocusOverlay: (props) => <FocusOverlay {...props} />,
                Playground: (props) => <Playground {...props} />,
                EFPlayer: (props) => <EFPlayer {...props} />,
                EditableWaveform: (props) => <EditableWaveform {...props} />,
                EditableThumbnailStrip: (props) => <EditableThumbnailStrip {...props} />,
                VideoEditorExample: (props) => <VideoEditorExample {...props} />,
                pre: ({ children, ...props }) => (
                  <CodeBlock {...props}>{children}</CodeBlock>
                ),
                ShowDocItemByName: (props) => <ShowDocItemByName {...props} />,
                HTTPEndpoint: (props) => <HTTPEndpoint {...props} />,
                HTTPPayload: (props) => <HTTPPayload {...props} />,
                HTTPResponse: (props) => <HTTPResponse {...props} />,
                ResourceOperation: (props) => <ResourceOperation {...props} />,
                ResourceOperationMethod: (props) => (
                  <ResourceOperationMethod {...props} />
                ),
                PersistentTab: (props) => <PersistentTab {...props} />,
                PersistentTabGroup: (props) => (
                  <PersistentTabGroup {...props} />
                ),
                PropertyDoc: (props) => <PropertyDoc {...props} />,
                PropertyDocList: (props) => <PropertyDocList {...props} />,
                Demonstration: (props) => <Demonstration {...props} />,
                Preview: (props) => <Preview {...props} />,
                PreviewVideo: (props) => <PreviewVideo {...props} />,
                Elements: (props) => <Elements {...props} />,
                Packages: (props) => <Packages {...props} />,
                CodeSteps: (props) => <CodeSteps {...props} />,
                CodeStep: (props) => <CodeStep {...props} />,
                CodeStepLabel: (props) => <CodeStepLabel {...props} />,
                CodeStepCode: (props) => <CodeStepCode {...props} />,
                WithEnv: (props) => <WithEnv {...props} />,
                Rotation: (props) => <Rotation {...props} />,
                Crop: (props) => <Crop {...props} />,
              }}
            />
          </div>
          <Footer />
        </main>

        {/* Right sidebar - On This Page */}
        {!isDocsIndex && headings.length >= 2 ? (
          <div className="w-56 overflow-y-auto">
            <LargeOnThisPage headings={headings} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LargeOnThisPage({ headings }: { headings: Heading[] }) {
  return (
    <div className="order-1 w-56 flex-shrink-0 self-start overflow-y-auto pb-10 xl:block sticky top-0">
      <nav className="mb-3 flex items-center font-semibold">On this page</nav>
      <ul className="md-toc flex flex-col flex-wrap gap-3 leading-[1.125]">
        {headings.map((heading, i) => (
          <li key={i} className={heading.level === 2 ? "ml-0" : "ml-4"}>
            <Link
              to={`#${heading.id}`}
              className={clsx(
                "group relative py-1 text-sm text-gray-500 decoration-gray-200 underline-offset-4 hover:underline dark:text-gray-400 dark:decoration-gray-500",
                heading.level === 2 ? "font-semibold" : "",
              )}
            >
              {heading.text}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
