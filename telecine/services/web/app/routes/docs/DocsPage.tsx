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
import { MobileMenuDrawer } from "~/components/docs/MobileMenuDrawer";
import { ResponsiveContainer } from "~/components/docs/ResponsiveContainer";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isMobileTocOpen, setIsMobileTocOpen] = React.useState(false);
  const tocButtonRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div className="grid grid-rows-[auto_minmax(0,1fr)] h-screen contain-layout bg-background text-foreground">
      <div className="relative">
        <Header className="bg-background" hideMobileMenu={true} />
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-[1001] rounded-md p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 md:hidden touch-manipulation"
          aria-label="Open documentation menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        menu={menu}
      />

        {/* Mobile Table of Contents Toggle */}
        {!isDocsIndex && headings.length >= 2 && (
          <>
            <button
              ref={tocButtonRef}
              onClick={() => setIsMobileTocOpen(!isMobileTocOpen)}
              className="md:hidden fixed bottom-4 right-4 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow touch-manipulation"
              aria-label="Toggle table of contents"
            >
              <svg
                className="h-5 w-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Mobile Table of Contents Popover */}
            {isMobileTocOpen && (
              <>
                <div
                  className="md:hidden fixed inset-0 z-40"
                  onClick={() => setIsMobileTocOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className={clsx(
                    "md:hidden fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-64 max-h-[60vh] overflow-hidden transition-all duration-200",
                    isMobileTocOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
                  )}
                  style={{
                    bottom: 'calc(4rem + 0.75rem)',
                    right: '1rem',
                  }}
                >
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-3">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">On this page</h2>
                    <button
                      onClick={() => setIsMobileTocOpen(false)}
                      className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 touch-manipulation"
                      aria-label="Close"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(60vh-3.5rem)] px-4 py-3">
                    <MobileOnThisPage headings={headings} onLinkClick={() => setIsMobileTocOpen(false)} />
                  </div>
                </div>
              </>
            )}
          </>
        )}

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] overflow-hidden">
        {/* Left sidebar - Menu */}
        <Menu menu={menu} className="hidden md:block overflow-auto pl-4 pr-8 pb-20" />

        {/* Main content */}
        <main className="overflow-auto relative">
          <ResponsiveContainer>
            <div
              className={clsx(
                "md:pr-6",
                "markdown",
                "prose prose-slate max-w-none dark:prose-invert",
                // headings
                "prose-headings:scroll-mt-20 sm:prose-headings:scroll-mt-24 prose-headings:font-display prose-headings:font-normal lg:prose-headings:scroll-mt-[8.5rem]",
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
          </ResponsiveContainer>
          <Footer />
        </main>

        {/* Right sidebar - On This Page */}
        {!isDocsIndex && headings.length >= 2 ? (
          <div className="hidden xl:block w-56 overflow-y-auto">
            <LargeOnThisPage headings={headings} />
          </div>
        ) : null}
      </div>
    </div>
  );
}


function MobileOnThisPage({ headings, onLinkClick }: { headings: Heading[]; onLinkClick: () => void }) {
  return (
    <ul className="md-toc flex flex-col gap-3 leading-[1.125]">
      {headings.map((heading, i) => (
        <li key={i} className={heading.level === 2 ? "ml-0" : "ml-4"}>
          <Link
            to={`#${heading.id}`}
            onClick={onLinkClick}
            className={clsx(
              "group relative py-1 text-sm text-gray-500 decoration-gray-200 underline-offset-4 hover:underline dark:text-gray-400 dark:decoration-gray-500 touch-manipulation",
              heading.level === 2 ? "font-semibold" : "",
            )}
          >
            {heading.text}
          </Link>
        </li>
      ))}
    </ul>
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
