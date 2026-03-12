import { Link } from "react-router";
import * as React from "react";
import { getMDXComponent } from "mdx-bundler/client";
import type { Route } from "./+types/reference-detail";
import {
  getSkillReference,
  getSkillReferenceSection,
  getSkillNavTree,
  getSkillNames,
  getSkillReferencesMeta,
} from "~/utils/skills.server";
import type { NavNode } from "~/utils/skills.server";
import { parseMdx } from "~/utils/mdx-bundler.server";
import { getSkillsMDXComponents } from "~/utils/skills-mdx-components";
import clsx from "clsx";
import { useTheme } from "~/hooks/useTheme";
import { SkillsLayout } from "~/components/skills/SkillsLayout";
import { SkillPicker, ReferenceNav } from "~/components/skills/SkillsSidebar";
import { OnThisPage } from "~/components/skills/OnThisPage";
import { MobileBreadcrumbBar } from "~/components/skills/MobileBreadcrumbBar";
import { MobileTocButton } from "~/components/skills/MobileTocButton";
import type { SkillReference } from "~/utils/skills.server";

function LearningPathNav({
  currentRef,
  allRefs,
  skillName,
}: {
  currentRef: SkillReference | null;
  allRefs: SkillReference[];
  skillName: string;
}) {
  if (!currentRef || !currentRef.track) return null;

  const trackRefs = allRefs
    .filter((ref) => ref.track === currentRef.track)
    .sort((a, b) => (a.track_step ?? 999) - (b.track_step ?? 999));

  const currentIndex = trackRefs.findIndex(
    (ref) => ref.name === currentRef.name,
  );
  const prevRef = currentIndex > 0 ? trackRefs[currentIndex - 1] : null;
  const nextRef =
    currentIndex < trackRefs.length - 1 ? trackRefs[currentIndex + 1] : null;

  const progress =
    trackRefs.length > 0 ? ((currentIndex + 1) / trackRefs.length) * 100 : 0;

  return (
    <div className="mt-12 pt-8 border-t border-black/10 dark:border-white/10">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span className="font-medium">
            {currentRef.track_title || "Learning Path"}
          </span>
          <span>
            Step {currentIndex + 1} of {trackRefs.length}
          </span>
        </div>
        <div className="h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-4">
        {prevRef ? (
          <Link
            to={`/skills/${skillName}/${prevRef.name}`}
            className="flex items-center gap-2 p-3 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-400 hover:bg-blue-600/5 dark:hover:bg-blue-500/5 transition-colors group"
          >
            <span className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              ←
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                Previous
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {prevRef.title}
              </div>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {nextRef ? (
          <Link
            to={`/skills/${skillName}/${nextRef.name}`}
            className="flex items-center gap-2 p-3 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-400 hover:bg-blue-600/5 dark:hover:bg-blue-500/5 transition-colors group text-right"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                Next
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {nextRef.title}
              </div>
            </div>
            <span className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              →
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export const meta = ({ data }: Route.MetaArgs) => {
  if (!data) {
    return [{ title: "Documentation | Editframe" }];
  }

  const { skillTitle, referenceTitle, description } = data;
  const title = referenceTitle || skillTitle;

  const metaDescription = description
    ? description.length > 160
      ? description.slice(0, 157) + "..."
      : description
    : `Documentation for ${skillTitle}`;

  return [
    { title: `${title} | Editframe` },
    { name: "description", content: metaDescription },
    { property: "og:description", content: metaDescription },
  ];
};

export const loader = async ({ params }: Route.LoaderArgs) => {
  const skillName = params.skill;
  const referenceParam = params.reference;

  if (!skillName || !referenceParam) {
    throw new Response("Not Found", { status: 404 });
  }

  // Parse reference param for section separator
  const [refName, sectionSlug] = referenceParam.split("~");

  // Load reference content
  let referenceContent: string | null;
  if (sectionSlug) {
    // Load specific section
    referenceContent = getSkillReferenceSection(
      skillName,
      refName,
      sectionSlug,
    );
  } else {
    // Load root or full file
    referenceContent = getSkillReference(skillName, refName);
  }

  if (!referenceContent) {
    throw new Response("Not Found", { status: 404 });
  }

  const parsed = await parseMdx(referenceContent);
  const navTree = getSkillNavTree(skillName);
  const referencesMeta = getSkillReferencesMeta(skillName);
  const allSkills = getSkillNames();
  const allNavTrees: Record<string, NavNode[]> = Object.fromEntries(
    allSkills.map((s) => [s.name, getSkillNavTree(s.name)]),
  );

  // Extract API metadata from frontmatter
  const apiMetadata = (parsed.frontmatter as any)?.api || null;
  const description = (parsed.frontmatter as any)?.description || null;

  const skillTitle =
    allSkills.find((s: { name: string }) => s.name === skillName)?.title ||
    skillName;
  const referenceTitle =
    referencesMeta.find((r: { name: string }) => r.name === referenceParam)
      ?.title || referenceParam;

  return {
    skillName,
    skillTitle,
    referenceName: referenceParam,
    referenceTitle,
    content: parsed,
    navTree,
    referencesMeta,
    allSkills,
    allNavTrees,
    apiMetadata,
    description,
    isReference: true,
  };
};

export default function ReferenceDetail({ loaderData }: Route.ComponentProps) {
  useTheme();
  const {
    skillName,
    skillTitle,
    referenceName,
    referenceTitle,
    content,
    navTree,
    referencesMeta,
    allSkills,
    allNavTrees,
    apiMetadata,
  } = loaderData;
  const { code } = content;
  const MDXAsComponent = React.useMemo(() => getMDXComponent(code), [code]);

  // Scroll to top when navigating between pages
  React.useEffect(() => {
    const mainElement = document.querySelector("main[data-skills-main]");
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, [skillName, referenceName]);

  return (
    <SkillsLayout
      allSkills={allSkills}
      allNavTrees={allNavTrees}
      currentSkill={skillName}
      currentReference={referenceName}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[180px_240px_1fr] xl:grid-cols-[180px_240px_1fr_auto] overflow-hidden">
        <SkillPicker allSkills={allSkills} currentSkill={skillName} />
        <ReferenceNav
          skillName={skillName}
          currentReference={referenceName}
          navTree={navTree}
        />

        {/* Main content - clean white reading surface */}
        <main
          className="overflow-y-auto bg-white dark:bg-[#0a0a0a]"
          data-skills-main
        >
          <MobileBreadcrumbBar
            allSkills={allSkills}
            currentSkill={skillName}
            currentSkillTitle={skillTitle}
            referencesMeta={referencesMeta}
            currentReference={referenceName}
            currentReferenceTitle={referenceTitle}
          />
          <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10 pb-24">
            {/* Desktop breadcrumb */}
            <div className="hidden lg:flex mb-6 items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
              <Link
                to="/skills"
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Skills
              </Link>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <Link
                to={`/skills/${skillName}`}
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {skillTitle}
              </Link>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {referenceTitle}
              </span>
            </div>

            {/* Content */}
            <div
              className={clsx(
                "markdown",
                "prose dark:prose-invert",
                "prose-base",
                // Paragraphs
                "prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-[1.75] prose-p:mb-4",
                // Headings - clear hierarchy
                "prose-headings:scroll-mt-20 prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-white",
                "prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4 prose-h1:mt-0 prose-h1:leading-[1.2]",
                "prose-h2:text-xl prose-h2:font-bold prose-h2:mt-10 prose-h2:mb-4 prose-h2:leading-tight prose-h2:border-b prose-h2:border-black/10 dark:prose-h2:border-white/10 prose-h2:pb-2",
                "prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3 prose-h3:leading-snug",
                "prose-h4:text-base prose-h4:font-semibold prose-h4:mt-6 prose-h4:mb-2 prose-h4:leading-snug prose-h4:text-blue-800 dark:prose-h4:text-blue-400",
                // Links
                "prose-a:text-blue-800 dark:prose-a:text-blue-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-a:transition-colors",
                // Strong
                "prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold",
                // Lists
                "prose-ul:my-4 prose-ol:my-4",
                "prose-li:text-gray-600 dark:prose-li:text-gray-400 prose-li:leading-[1.75] prose-li:my-1",
                // Code blocks
                "prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-black/10 dark:prose-pre:border-white/10 prose-pre:overflow-x-auto prose-pre:p-5 prose-pre:text-sm prose-pre:leading-relaxed prose-pre:rounded-md",
                // Inline code
                "prose-code:bg-black/[0.04] dark:prose-code:bg-white/[0.08] prose-code:text-gray-900 dark:prose-code:text-white prose-code:font-mono prose-code:text-[0.9em] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
                "prose-code:before:content-none prose-code:after:content-none",
                "prose-pre:prose-code:bg-transparent prose-pre:prose-code:text-white prose-pre:prose-code:p-0 prose-pre:prose-code:text-[1em]",
                // HR
                "prose-hr:border-t prose-hr:border-black/10 dark:prose-hr:border-white/10 prose-hr:my-8",
                // Blockquotes
                "prose-blockquote:border-l-2 prose-blockquote:border-blue-800 dark:prose-blockquote:border-blue-400 prose-blockquote:pl-4 prose-blockquote:not-italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-blockquote:font-normal",
                // Tables
                "prose-table:text-sm prose-table:border-collapse",
                "prose-th:text-gray-900 dark:prose-th:text-white prose-th:font-semibold prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-th:border-b-2 prose-th:border-black/20 dark:prose-th:border-white/20 prose-th:px-3 prose-th:py-2 prose-th:text-left",
                "prose-td:text-gray-600 dark:prose-td:text-gray-400 prose-td:border-b prose-td:border-black/5 dark:prose-td:border-white/5 prose-td:px-3 prose-td:py-2",
                // Selection
                "selection:bg-blue-600/10 dark:selection:bg-blue-400/10",
              )}
            >
              <MDXAsComponent
                components={getSkillsMDXComponents(skillName, apiMetadata)}
              />
            </div>

            {/* Learning path navigation */}
            <LearningPathNav
              currentRef={
                referencesMeta.find(
                  (r: SkillReference) => r.name === referenceName,
                ) || null
              }
              allRefs={referencesMeta}
              skillName={skillName}
            />
          </div>
        </main>

        {/* On This Page navigation */}
        <OnThisPage skillName={skillName} referenceName={referenceName} />
      </div>

      {/* Mobile floating TOC button */}
      <MobileTocButton skillName={skillName} referenceName={referenceName} />
    </SkillsLayout>
  );
}
