import type { MetaFunction } from "react-router";
import { useLoaderData, Link, useMatches, useLocation } from "react-router";
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
import { processDocIndexComponents } from "~/utils/process-doc-index.server";
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
  FitScale,
  TransformHandles,
  PanZoom,
  TimelineRuler,
} from "@editframe/react";
import clsx from "clsx";
import { Demonstration } from "~/components/docs/Demonstration/Demonstration.tsx";
import { EFPlayer } from "~/components/EFPlayer";
import { EditableWaveform } from "~/components/docs/EditableWaveform";
import { EditableThumbnailStrip } from "~/components/docs/EditableThumbnailStrip";
import { VideoEditorExample } from "~/components/docs/VideoEditorExample";
import { ResizableContainer } from "~/components/docs/ResizableContainer";
import { PropertyDoc, PropertyDocList } from "~/components/docs/PropertyDoc";
import { PropertyReferenceTable } from "~/components/docs/PropertyReference";
import { VideoPropertyReference } from "~/components/docs/VideoPropertyReference";
import { AudioPropertyReference } from "~/components/docs/AudioPropertyReference";
import { TimegroupPropertyReference } from "~/components/docs/TimegroupPropertyReference";
import { CaptionsPropertyReference } from "~/components/docs/CaptionsPropertyReference";
import { WaveformPropertyReference } from "~/components/docs/WaveformPropertyReference";
import { ImagePropertyReference } from "~/components/docs/ImagePropertyReference";
import { TextPropertyReference } from "~/components/docs/TextPropertyReference";
import { ThumbnailStripPropertyReference } from "~/components/docs/ThumbnailStripPropertyReference";
import { SurfacePropertyReference } from "~/components/docs/SurfacePropertyReference";
import { ControlsPropertyReference } from "~/components/docs/ControlsPropertyReference";
import { TogglePlayPropertyReference } from "~/components/docs/TogglePlayPropertyReference";
import { ScrubberPropertyReference } from "~/components/docs/ScrubberPropertyReference";
import { ToggleLoopPropertyReference } from "~/components/docs/ToggleLoopPropertyReference";
import { TimeDisplayPropertyReference } from "~/components/docs/TimeDisplayPropertyReference";
import { TransformHandlesPropertyReference } from "~/components/docs/TransformHandlesPropertyReference";
import { PanZoomPropertyReference } from "~/components/docs/PanZoomPropertyReference";
import { TimelineRulerPropertyReference } from "~/components/docs/TimelineRulerPropertyReference";
import { ShowDocItemByName } from "~/components/docs/typedoc";
import { WithEnv } from "~/components/WithEnv";
import {
  DocSectionIndex,
  DocLinkList,
  DocNavSection,
} from "~/components/docs/DocNavigation";
import { AutoDocIndex } from "~/components/docs/AutoDocIndex";
import { HowToIndex } from "~/components/docs/HowToIndex";
import { ExplanationIndex } from "~/components/docs/ExplanationIndex";
import { ElementIndex } from "~/components/docs/ElementIndex";
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

  // Process MDX content to inject pre-computed data into AutoDocIndex components
  // Use file.path which includes the .mdx extension and is relative to docs base
  const processedContent = await processDocIndexComponents(
    file.content,
    file.path || "",
  );

  const post = await parseMdx(processedContent);

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
  const location = useLocation();
  const isDocsIndex = matches.some((match) => match.id.endsWith("index"));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isMobileTocOpen, setIsMobileTocOpen] = React.useState(false);
  const tocButtonRef = React.useRef<HTMLButtonElement>(null);

  // Scroll to top when navigating between doc pages
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
            className="p-2 text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white hover:bg-[var(--accent-gold)]/20 touch-manipulation transition-colors"
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
            className="md:hidden fixed bottom-4 right-4 z-30 bg-[var(--paper-white)] dark:bg-[#111] border-2 border-[var(--ink-black)] dark:border-white p-3 shadow-[2px_2px_0_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0_rgba(255,255,255,0.1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all touch-manipulation"
            aria-label="Toggle table of contents"
          >
            <svg
              className="h-5 w-5 text-[var(--ink-black)] dark:text-white"
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
                  "md:hidden fixed z-50 bg-[var(--paper-white)] dark:bg-[#111] border-2 border-[var(--ink-black)] dark:border-white w-64 max-h-[60vh] overflow-hidden transition-all duration-200 shadow-[4px_4px_0_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0_rgba(255,255,255,0.1)]",
                  isMobileTocOpen
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 translate-y-2",
                )}
                style={{
                  bottom: "calc(4rem + 0.75rem)",
                  right: "1rem",
                }}
              >
                <div className="flex items-center justify-between border-b-2 border-[var(--ink-black)]/10 dark:border-white/10 px-4 py-3">
                  <h2 className="text-xs font-bold text-[var(--ink-black)] dark:text-white uppercase tracking-wider">
                    On this page
                  </h2>
                  <button
                    onClick={() => setIsMobileTocOpen(false)}
                    className="p-1 text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white touch-manipulation transition-colors"
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
                  <MobileOnThisPage
                    headings={headings}
                    onLinkClick={() => setIsMobileTocOpen(false)}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] overflow-hidden">
        {/* Left sidebar - Menu */}
        <Menu
          menu={menu}
          className="hidden md:block overflow-auto pl-4 pr-8 pb-20"
        />

        {/* Main content */}
        <main className="overflow-auto relative">
          <ResponsiveContainer>
            <div
              className={clsx(
                "md:pr-6",
                "markdown",
                "prose prose-slate max-w-none dark:prose-invert",
                // Base typography using centralized system
                "prose-base prose-slate",
                // Paragraphs - consistent spacing and line height
                "prose-p:text-slate-700 prose-p:leading-loose dark:prose-p:text-slate-200",
                "prose-p:mb-6",
                // Headings - professional hierarchy with centralized spacing
                "prose-headings:scroll-mt-20 sm:prose-headings:scroll-mt-24 lg:prose-headings:scroll-mt-[8.5rem]",
                "prose-headings:font-display prose-headings:tracking-tight",
                "prose-h1:text-slate-900 prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-4 prose-h1:mt-8 prose-h1:leading-snug dark:prose-h1:text-white",
                "prose-h2:text-slate-900 prose-h2:text-3xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-h2:leading-snug prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-3 dark:prose-h2:text-white dark:prose-h2:border-slate-700",
                "prose-h3:text-slate-900 prose-h3:text-2xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3 prose-h3:leading-snug dark:prose-h3:text-slate-100",
                "prose-h4:text-slate-700 prose-h4:text-xl prose-h4:font-semibold prose-h4:mt-6 prose-h4:mb-2 prose-h4:leading-snug dark:prose-h4:text-slate-200",
                // Lead text
                "prose-lead:text-slate-600 prose-lead:text-lg prose-lead:leading-loose dark:prose-lead:text-slate-400",
                // Links
                "prose-a:text-blue-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline dark:prose-a:text-blue-400",
                "prose-a:transition-colors",
                // Lists
                "prose-ul:my-6 prose-ol:my-6",
                "prose-li:text-slate-700 prose-li:leading-loose dark:prose-li:text-slate-200",
                "prose-li:my-2",
                // Code blocks
                "prose-pre:bg-slate-50 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-200 prose-pre:overflow-hidden",
                "dark:prose-pre:bg-slate-900/50 dark:prose-pre:border-slate-800 dark:prose-pre:ring-1 dark:prose-pre:ring-slate-300/10",
                "prose-code:text-slate-900 prose-code:font-mono prose-code:font-normal dark:prose-code:text-slate-100",
                // HR
                "prose-hr:border-slate-200 dark:prose-hr:border-slate-800 prose-hr:my-8",
                // Blockquotes
                "prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400",
                // Tables
                "prose-table:text-sm",
                "prose-th:text-slate-900 prose-th:font-semibold dark:prose-th:text-slate-100",
                "prose-td:text-slate-700 dark:prose-td:text-slate-200",
                // Selection style
                "selection:bg-blue-100 dark:selection:bg-blue-900/30",
                "prose-code:selection:bg-blue-200 dark:prose-code:selection:bg-blue-800/50",
              )}
            >
              <MDXAsComponent
                components={{
                  TableOfContents: () => (
                    <TableOfContents headings={headings} />
                  ),
                  a: CustomLink,
                  h1: ({ children, ...props }) => (
                    <h1 {...props}>{children}</h1>
                  ),
                  Libraries,
                  Configuration: (props) => <Configuration {...props} />,
                  Captions: (props) => <Captions {...props} />,
                  CaptionsActiveWord: (props) => (
                    <CaptionsActiveWord {...props} />
                  ),
                  CaptionsBeforeActiveWord: (props) => (
                    <CaptionsBeforeActiveWord {...props} />
                  ),
                  CaptionsAfterActiveWord: (props) => (
                    <CaptionsAfterActiveWord {...props} />
                  ),
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
                  PanZoom: (props) => <PanZoom {...props} />,
                  TimelineRuler: (props) => <TimelineRuler {...props} />,
                  Filmstrip: (props) => <Filmstrip {...props} />,
                  FocusOverlay: (props) => <FocusOverlay {...props} />,
                  FitScale: (props) => <FitScale {...props} />,
                  TransformHandles: (props) => <TransformHandles {...props} />,
                  ResizableContainer: (props) => (
                    <ResizableContainer {...props} />
                  ),
                  Playground: (props) => <Playground {...props} />,
                  EFPlayer: (props) => <EFPlayer {...props} />,
                  EditableWaveform: (props) => <EditableWaveform {...props} />,
                  EditableThumbnailStrip: (props) => (
                    <EditableThumbnailStrip {...props} />
                  ),
                  VideoEditorExample: (props) => (
                    <VideoEditorExample {...props} />
                  ),
                  pre: ({ children, ...props }) => (
                    <CodeBlock {...props}>{children}</CodeBlock>
                  ),
                  ShowDocItemByName: (props) => (
                    <ShowDocItemByName {...props} />
                  ),
                  HTTPEndpoint: (props) => <HTTPEndpoint {...props} />,
                  HTTPPayload: (props) => <HTTPPayload {...props} />,
                  HTTPResponse: (props) => <HTTPResponse {...props} />,
                  ResourceOperation: (props) => (
                    <ResourceOperation {...props} />
                  ),
                  ResourceOperationMethod: (props) => (
                    <ResourceOperationMethod {...props} />
                  ),
                  PersistentTab: (props) => <PersistentTab {...props} />,
                  PersistentTabGroup: (props) => (
                    <PersistentTabGroup {...props} />
                  ),
                  PropertyDoc: (props) => <PropertyDoc {...props} />,
                  PropertyDocList: (props) => <PropertyDocList {...props} />,
                  PropertyReferenceTable: (props) => (
                    <PropertyReferenceTable {...props} />
                  ),
                  VideoPropertyReference: () => <VideoPropertyReference />,
                  AudioPropertyReference: () => <AudioPropertyReference />,
                  TimegroupPropertyReference: () => (
                    <TimegroupPropertyReference />
                  ),
                  CaptionsPropertyReference: () => (
                    <CaptionsPropertyReference />
                  ),
                  WaveformPropertyReference: () => (
                    <WaveformPropertyReference />
                  ),
                  ImagePropertyReference: () => <ImagePropertyReference />,
                  TextPropertyReference: () => <TextPropertyReference />,
                  SurfacePropertyReference: () => <SurfacePropertyReference />,
                  ThumbnailStripPropertyReference: () => (
                    <ThumbnailStripPropertyReference />
                  ),
                  ControlsPropertyReference: () => (
                    <ControlsPropertyReference />
                  ),
                  TogglePlayPropertyReference: () => (
                    <TogglePlayPropertyReference />
                  ),
                  ScrubberPropertyReference: () => (
                    <ScrubberPropertyReference />
                  ),
                  ToggleLoopPropertyReference: () => (
                    <ToggleLoopPropertyReference />
                  ),
                  TimeDisplayPropertyReference: () => (
                    <TimeDisplayPropertyReference />
                  ),
                  TransformHandlesPropertyReference: () => (
                    <TransformHandlesPropertyReference />
                  ),
                  PanZoomPropertyReference: () => <PanZoomPropertyReference />,
                  TimelineRulerPropertyReference: () => (
                    <TimelineRulerPropertyReference />
                  ),
                  Demonstration: (props) => <Demonstration {...props} />,
                  DocSectionIndex: (props) => <DocSectionIndex {...props} />,
                  DocLinkList: (props) => <DocLinkList {...props} />,
                  DocNavSection: (props) => <DocNavSection {...props} />,
                  AutoDocIndex: (props) => <AutoDocIndex {...props} />,
                  HowToIndex: (props) => <HowToIndex {...props} />,
                  ExplanationIndex: (props) => <ExplanationIndex {...props} />,
                  ElementIndex: (props) => <ElementIndex {...props} />,
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

function MobileOnThisPage({
  headings,
  onLinkClick,
}: {
  headings: Heading[];
  onLinkClick: () => void;
}) {
  return (
    <ul className="md-toc flex flex-col gap-0.5">
      {headings.map((heading, i) => (
        <li key={i} className={heading.level === 2 ? "ml-0" : "ml-3"}>
          <Link
            to={`#${heading.id}`}
            onClick={onLinkClick}
            className={clsx(
              "group relative block py-1 text-sm leading-5 transition-colors touch-manipulation",
              "text-[var(--warm-gray)] hover:text-[var(--accent-blue)]",
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
    <div className="order-1 w-56 flex-shrink-0 self-start overflow-y-auto pb-10 xl:block sticky top-0 pt-8 border-l-2 border-[var(--ink-black)]/10 dark:border-white/10 pl-4">
      <nav className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--ink-black)] dark:text-white">
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
                  "group relative block py-1 text-sm leading-5 transition-colors",
                  isActive
                    ? "font-medium text-[var(--accent-blue)]"
                    : "text-[var(--warm-gray)] hover:text-[var(--accent-blue)]",
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
