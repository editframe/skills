import { Link } from "react-router";
import * as React from "react";
import { getMDXComponent } from "mdx-bundler/client";
import type { Route } from "./+types/reference-detail";
import {
  getSkillReference,
  getSkillNav,
} from "~/utils/skills.server";
import { parseMdx } from "~/utils/mdx-bundler.server";
import { getSkillsMDXComponents } from "~/utils/skills-mdx-components";
import clsx from "clsx";
import { useTheme } from "~/hooks/useTheme";
import { SkillsLayout } from "~/components/skills/SkillsLayout";
import { SkillSidebar } from "./skill-detail";

export const meta = ({ data }: Route.MetaArgs) => {
  if (!data) {
    return [{ title: "Skills - Editframe" }];
  }

  const { skillName, referenceName } = data;
  const title = referenceName
    ? `${referenceName} - ${skillName} - Skills`
    : `${skillName} - Skills`;

  return [
    { title: `${title} - Editframe` },
    {
      name: "description",
      content: `Agent skill documentation for ${skillName}`,
    },
  ];
};

export const loader = async ({ params }: Route.LoaderArgs) => {
  const skillName = params.skill;
  const referenceName = params.reference;

  if (!skillName || !referenceName) {
    throw new Response("Not Found", { status: 404 });
  }

  // Load reference content only
  const referenceContent = getSkillReference(skillName, referenceName);
  if (!referenceContent) {
    throw new Response("Not Found", { status: 404 });
  }

  const parsed = await parseMdx(referenceContent);
  const nav = getSkillNav(skillName);

  return {
    skillName,
    referenceName,
    content: parsed,
    nav,
    isReference: true,
  };
};

export default function ReferenceDetail({ loaderData }: Route.ComponentProps) {
  useTheme();
  const { skillName, referenceName, content, nav, isReference } =
    loaderData;
  const { code } = content;
  const MDXAsComponent = React.useMemo(() => getMDXComponent(code), [code]);

  // Scroll to top when navigating between pages
  React.useEffect(() => {
    const mainElement = document.querySelector('main[data-skills-main]');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, [skillName, referenceName]);

  return (
    <SkillsLayout>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] overflow-hidden">
        {/* Sidebar */}
        <SkillSidebar
          skillName={skillName}
          referenceName={referenceName}
          nav={nav}
          isReference={isReference}
        />

        {/* Main content - clean white reading surface */}
        <main className="overflow-y-auto bg-white dark:bg-[#0a0a0a]" data-skills-main>
          <div className="max-w-[65ch] mx-auto px-6 lg:px-10 py-10 pb-24">
            {/* Mobile breadcrumb */}
            <div className="lg:hidden mb-6 flex items-center gap-2 text-[13px] flex-wrap text-[var(--warm-gray)]">
              <Link
                to="/skills"
                className="hover:text-[var(--ink-black)] dark:hover:text-white transition-colors"
              >
                Skills
              </Link>
              <span>/</span>
              <Link
                to={`/skills/${skillName}`}
                className="hover:text-[var(--ink-black)] dark:hover:text-white transition-colors"
              >
                {skillName.replace(/-/g, " ")}
              </Link>
              <span>/</span>
              <span className="text-[var(--ink-black)] dark:text-white font-medium">
                {referenceName?.replace(/-/g, " ")}
              </span>
            </div>

            {/* Desktop breadcrumb */}
            <div className="hidden lg:flex mb-6 items-center gap-2 text-[13px] text-[var(--warm-gray)]">
              <Link
                to="/skills"
                className="hover:text-[var(--ink-black)] dark:hover:text-white transition-colors"
              >
                Skills
              </Link>
              <span>/</span>
              <Link
                to={`/skills/${skillName}`}
                className="hover:text-[var(--ink-black)] dark:hover:text-white transition-colors"
              >
                {skillName.replace(/-/g, " ")}
              </Link>
              <span>/</span>
              <span className="text-[var(--ink-black)] dark:text-white font-medium">
                {referenceName?.replace(/-/g, " ")}
              </span>
            </div>

            {/* Content */}
            <div
              className={clsx(
                "markdown",
                "prose dark:prose-invert",
                "prose-base",
                // Paragraphs
                "prose-p:text-[var(--warm-gray)] prose-p:leading-[1.75] prose-p:mb-4",
                // Headings - clear hierarchy
                "prose-headings:scroll-mt-20 prose-headings:tracking-tight prose-headings:text-[var(--ink-black)] dark:prose-headings:text-white",
                "prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4 prose-h1:mt-0 prose-h1:leading-[1.2]",
                "prose-h2:text-xl prose-h2:font-bold prose-h2:mt-10 prose-h2:mb-4 prose-h2:leading-tight prose-h2:border-b prose-h2:border-black/10 dark:prose-h2:border-white/10 prose-h2:pb-2",
                "prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3 prose-h3:leading-snug",
                "prose-h4:text-base prose-h4:font-semibold prose-h4:mt-6 prose-h4:mb-2 prose-h4:leading-snug prose-h4:text-[var(--accent-blue)]",
                // Links
                "prose-a:text-[var(--accent-blue)] prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-a:transition-colors",
                // Strong
                "prose-strong:text-[var(--ink-black)] dark:prose-strong:text-white prose-strong:font-semibold",
                // Lists
                "prose-ul:my-4 prose-ol:my-4",
                "prose-li:text-[var(--warm-gray)] prose-li:leading-[1.75] prose-li:my-1",
                // Code blocks
                "prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-black/10 dark:prose-pre:border-white/10 prose-pre:overflow-x-auto prose-pre:p-5 prose-pre:text-sm prose-pre:leading-relaxed prose-pre:rounded-md",
                // Inline code
                "prose-code:bg-black/[0.04] dark:prose-code:bg-white/[0.08] prose-code:text-[var(--ink-black)] dark:prose-code:text-white prose-code:font-mono prose-code:text-[0.9em] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
                "prose-code:before:content-none prose-code:after:content-none",
                "prose-pre:prose-code:bg-transparent prose-pre:prose-code:text-white prose-pre:prose-code:p-0 prose-pre:prose-code:text-[1em]",
                // HR
                "prose-hr:border-t prose-hr:border-black/10 dark:prose-hr:border-white/10 prose-hr:my-8",
                // Blockquotes
                "prose-blockquote:border-l-2 prose-blockquote:border-[var(--accent-blue)] prose-blockquote:pl-4 prose-blockquote:not-italic prose-blockquote:text-[var(--warm-gray)] prose-blockquote:font-normal",
                // Tables
                "prose-table:text-sm prose-table:border-collapse",
                "prose-th:text-[var(--ink-black)] dark:prose-th:text-white prose-th:font-semibold prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-th:border-b-2 prose-th:border-black/20 dark:prose-th:border-white/20 prose-th:px-3 prose-th:py-2 prose-th:text-left",
                "prose-td:text-[var(--warm-gray)] prose-td:border-b prose-td:border-black/5 dark:prose-td:border-white/5 prose-td:px-3 prose-td:py-2",
                // Selection
                "selection:bg-[var(--accent-blue)]/10",
              )}
            >
              <MDXAsComponent
                components={getSkillsMDXComponents(skillName)}
              />
            </div>
          </div>
        </main>
      </div>
    </SkillsLayout>
  );
}
