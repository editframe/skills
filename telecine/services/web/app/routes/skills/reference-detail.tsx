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
import { ThemeToggle } from "~/components/ThemeToggle";
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

const getCategoryColor = (skillName: string) => {
  const colors: Record<string, string> = {
    "elements-composition": "var(--poster-blue)",
    "react-composition": "var(--poster-green)",
    "motion-design": "var(--poster-gold)",
    "brand-video-generator": "var(--poster-red)",
  };
  return colors[skillName] || "var(--poster-blue)";
};

export default function ReferenceDetail({ loaderData }: Route.ComponentProps) {
  useTheme();
  const { skillName, referenceName, content, nav, isReference } =
    loaderData;
  const { code } = content;
  const MDXAsComponent = React.useMemo(() => getMDXComponent(code), [code]);
  const categoryColor = getCategoryColor(skillName);

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] texture-paper">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-4 border-[var(--ink-black)] dark:border-white bg-white dark:bg-[var(--card-dark-bg)]">
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <Link
                to="/"
                className="text-xl md:text-2xl font-black uppercase tracking-tighter flex-shrink-0"
              >
                Editframe
              </Link>
              <span className="text-[var(--warm-gray)] hidden sm:inline">/</span>
              <Link
                to="/skills"
                className="text-xs md:text-sm font-bold uppercase tracking-wider hover:text-[var(--poster-red)] transition-colors hidden sm:inline"
              >
                Skills
              </Link>
            </div>
            <div className="flex items-center gap-3 md:gap-6">
              <ThemeToggle />
              <Link
                to="/docs"
                className="text-xs md:text-sm font-bold uppercase tracking-wider hover:text-[var(--poster-red)] transition-colors hidden sm:inline"
              >
                Docs
              </Link>
              <Link
                to="/welcome"
                className="px-4 md:px-6 py-2 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black font-bold text-xs md:text-sm uppercase tracking-wider hover:bg-[var(--poster-red)] transition-colors"
              >
                Start
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[280px_1fr] gap-12">
          {/* Sidebar */}
          <SkillSidebar
            skillName={skillName}
            referenceName={referenceName}
            nav={nav}
            categoryColor={categoryColor}
            isReference={isReference}
          />

          {/* Main content */}
          <main>
            {/* Mobile breadcrumb */}
            <div className="lg:hidden mb-6 flex items-center gap-2 text-sm flex-wrap">
              <Link
                to="/skills"
                className="text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white font-medium"
              >
                Skills
              </Link>
              <span className="text-[var(--warm-gray)]">/</span>
              <Link
                to={`/skills/${skillName}`}
                className="text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white font-medium"
              >
                {skillName.replace(/-/g, " ")}
              </Link>
              <span className="text-[var(--warm-gray)]">/</span>
              <span className="text-[var(--ink-black)] dark:text-white font-medium">
                {referenceName?.replace(/-/g, " ")}
              </span>
            </div>

            {/* Desktop breadcrumb */}
            <div className="hidden lg:flex mb-6 items-center gap-2 text-sm">
              <Link
                to="/skills"
                className="text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white"
              >
                Skills
              </Link>
              <span className="text-[var(--warm-gray)]">/</span>
              <Link
                to={`/skills/${skillName}`}
                className="text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white"
              >
                {skillName.replace(/-/g, " ")}
              </Link>
              <span className="text-[var(--warm-gray)]">/</span>
              <span className="text-[var(--ink-black)] dark:text-white font-medium">
                {referenceName?.replace(/-/g, " ")}
              </span>
            </div>

            {/* Content */}
            <div className="relative">
              <div
                className="absolute -bottom-4 -right-4 w-full h-full"
                style={{ backgroundColor: categoryColor, opacity: 0.1 }}
              />
              <div className="relative bg-white dark:bg-[var(--card-dark-bg)] border-4 border-[var(--ink-black)] dark:border-white p-8 md:p-12">
                <div
                  className={clsx(
                    "markdown",
                    "prose max-w-none dark:prose-invert",
                    "prose-base",
                    "prose-p:text-[var(--warm-gray)] prose-p:leading-relaxed prose-p:mb-5",
                    "prose-headings:scroll-mt-20 prose-headings:tracking-tight prose-headings:text-[var(--ink-black)] dark:prose-headings:text-white",
                    "prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6 prose-h1:mt-0 prose-h1:leading-[1.1]",
                    "prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-4 prose-h2:leading-tight prose-h2:border-b-2 prose-h2:border-[var(--ink-black)]/10 dark:prose-h2:border-white/10 prose-h2:pb-3",
                    "prose-h3:text-xl prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-3 prose-h3:leading-tight",
                    "prose-h4:text-lg prose-h4:font-semibold prose-h4:mt-6 prose-h4:mb-2 prose-h4:leading-tight",
                    "prose-a:text-[var(--accent-blue)] prose-a:font-semibold prose-a:no-underline hover:prose-a:text-[var(--accent-red)] prose-a:transition-colors",
                    "prose-strong:text-[var(--ink-black)] dark:prose-strong:text-white prose-strong:font-bold",
                    "prose-ul:my-5 prose-ol:my-5",
                    "prose-li:text-[var(--warm-gray)] prose-li:leading-relaxed prose-li:my-1.5",
                    "prose-pre:bg-[#1a1a1a] prose-pre:border-2 prose-pre:border-[var(--ink-black)]/10 dark:prose-pre:border-white/10 prose-pre:overflow-x-auto prose-pre:p-4",
                    "prose-code:bg-[var(--accent-gold)]/10 prose-code:text-[var(--ink-black)] dark:prose-code:text-white prose-code:font-mono prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
                    "prose-code:before:content-none prose-code:after:content-none",
                    "prose-pre:prose-code:bg-transparent prose-pre:prose-code:text-white prose-pre:prose-code:p-0",
                    "prose-hr:border-t-2 prose-hr:border-[var(--ink-black)]/10 dark:prose-hr:border-white/10 prose-hr:my-10",
                    "prose-blockquote:border-l-4 prose-blockquote:border-[var(--accent-blue)] prose-blockquote:pl-4 prose-blockquote:not-italic prose-blockquote:text-[var(--warm-gray)] prose-blockquote:font-medium",
                    "prose-table:text-sm prose-table:border-collapse",
                    "prose-th:text-[var(--ink-black)] dark:prose-th:text-white prose-th:font-bold prose-th:uppercase prose-th:tracking-wider prose-th:text-xs prose-th:border-b-2 prose-th:border-[var(--ink-black)] dark:prose-th:border-white prose-th:px-4 prose-th:py-2 prose-th:text-left",
                    "prose-td:text-[var(--warm-gray)] prose-td:border-b prose-td:border-[var(--ink-black)]/10 dark:prose-td:border-white/10 prose-td:px-4 prose-td:py-2",
                    "selection:bg-[var(--accent-gold)]/20",
                  )}
                >
                  <MDXAsComponent
                    components={getSkillsMDXComponents(skillName)}
                  />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
