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
  Text,
  TextSegment,
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
import { useTheme } from "~/hooks/useTheme";
import { ThemeToggle } from "~/components/ThemeToggle";

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
  useTheme();
  const { post, menu } = useLoaderData<typeof loader>();
  const { headings, code } = post;
  const MDXAsComponent = React.useMemo(() => getMDXComponent(code), [code]);
  const matches = useMatches();
  const isDocsIndex = matches.some((match) => match.id.endsWith("index"));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isMobileTocOpen, setIsMobileTocOpen] = React.useState(false);
  const tocButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!isMobileTocOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileTocOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileTocOpen]);

  return (
    <div className="grid grid-rows-[auto_minmax(0,1fr)] h-screen contain-layout bg-background text-foreground">
      <div className="relative">
        <Header className="bg-background" hideMobileMenu={true} />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1001] flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-md p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 touch-manipulation"
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
                // Base typography - Mintlify-inspired
                "prose-base prose-slate",
                "prose-p:text-slate-600 prose-p:leading-7 dark:prose-p:text-slate-300 dark:prose-p:leading-7",
                "prose-p:mb-6",
                // Headings - cleaner, more spacious
                "prose-headings:scroll-mt-20 sm:prose-headings:scroll-mt-24 lg:prose-headings:scroll-mt-[8.5rem]",
                "prose-headings:font-display prose-headings:font-semibold prose-headings:tracking-tight",
                "prose-h1:text-slate-900 prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-0 dark:prose-h1:text-white",
                "prose-h2:text-slate-900 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:font-semibold dark:prose-h2:text-white",
                "prose-h3:text-slate-900 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:font-semibold dark:prose-h3:text-slate-100",
                "prose-h4:text-slate-900 prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2 prose-h4:font-semibold dark:prose-h4:text-slate-200",
                // Lead text
                "prose-lead:text-slate-600 prose-lead:text-lg prose-lead:leading-7 dark:prose-lead:text-slate-400",
                // Links - subtle underline on hover
                "prose-a:text-blue-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline dark:prose-a:text-blue-400",
                "prose-a:transition-colors",
                // Lists
                "prose-ul:my-6 prose-ol:my-6",
                "prose-li:text-slate-600 prose-li:leading-7 dark:prose-li:text-slate-300",
                "prose-li:my-2",
                // Code blocks - refined styling
                "prose-pre:bg-slate-900 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-800 dark:prose-pre:bg-slate-900/50 dark:prose-pre:ring-1 dark:prose-pre:ring-slate-300/10 prose-pre:overflow-hidden",
                "prose-pre:shadow-lg",
                "prose-code:text-slate-900 prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm dark:prose-code:text-slate-100 dark:prose-code:bg-slate-800",
                "prose-code:font-mono prose-code:font-normal",
                // HR
                "prose-hr:border-slate-200 dark:prose-hr:border-slate-800 prose-hr:my-8",
                // Blockquotes
                "prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400",
                // Tables
                "prose-table:text-sm",
                "prose-th:text-slate-900 prose-th:font-semibold dark:prose-th:text-slate-100",
                "prose-td:text-slate-600 dark:prose-td:text-slate-300",
                // Selection style
                "selection:bg-blue-100 dark:selection:bg-blue-900/30",
                "prose-code:selection:bg-blue-200 dark:prose-code:selection:bg-blue-800/50",
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
                  Text: (props) => <Text {...props} />,
                  TextSegment: (props) => <TextSegment {...props} />,
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
    <ul className="md-toc flex flex-col gap-0.5">
      {headings.map((heading, i) => (
        <li key={i} className={heading.level === 2 ? "ml-0" : "ml-3"}>
          <Link
            to={`#${heading.id}`}
            onClick={onLinkClick}
            className={clsx(
              "group relative block py-0.5 text-xs leading-5 transition-colors touch-manipulation",
              "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300",
              heading.level === 2 ? "font-medium" : "font-normal",
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
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (headings.length === 0) return;

    const observerOptions = {
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      // Find the first intersecting entry (closest to top)
      const intersecting = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => {
          const aTop = a.boundingClientRect.top;
          const bTop = b.boundingClientRect.top;
          return aTop - bTop;
        });

      if (intersecting.length > 0) {
        setActiveId(intersecting[0].target.id);
      }
    }, observerOptions);

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    // Set initial active heading
    const firstHeading = headings[0];
    if (firstHeading) {
      setActiveId(firstHeading.id);
    }

    return () => {
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [headings]);

  return (
    <div className="order-1 w-56 flex-shrink-0 self-start overflow-y-auto pb-10 xl:block sticky top-0 pt-8">
      <nav className="mb-3 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
        On this page
      </nav>
      <ul className="md-toc flex flex-col gap-0.5">
        {headings.map((heading, i) => {
          const isActive = activeId === heading.id;
          return (
            <li key={i} className={heading.level === 2 ? "ml-0" : "ml-3"}>
              <Link
                to={`#${heading.id}`}
                className={clsx(
                  "group relative block py-0.5 text-xs leading-5 transition-colors",
                  isActive
                    ? "font-medium text-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300",
                  heading.level === 2 ? "font-medium" : "font-normal",
                )}
              >
                {heading.text}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
