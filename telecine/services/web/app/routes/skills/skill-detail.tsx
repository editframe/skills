import { Link } from "react-router";
import * as React from "react";
import { getMDXComponent } from "mdx-bundler/client";
import type { Route } from "./+types/skill-detail";
import {
  getSkillContent,
  getSkillNav,
  getSkillReferencesMeta,
} from "~/utils/skills.server";
import type { NavGroup, SkillReference } from "~/utils/skills.server";
import { parseMdx } from "~/utils/mdx-bundler.server";
import { getSkillsMDXComponents } from "~/utils/skills-mdx-components";
import clsx from "clsx";
import { useTheme } from "~/hooks/useTheme";
import { SkillsLayout } from "~/components/skills/SkillsLayout";

const TYPE_BADGE_STYLES: Record<string, string> = {
  tutorial: "bg-[var(--poster-green)] text-white",
  "how-to": "bg-[var(--poster-blue)] text-white",
  explanation: "bg-[var(--poster-gold)] text-[var(--ink-black)]",
  reference: "bg-[var(--warm-gray)]/20 text-[var(--warm-gray)]",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={clsx(
        "inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider leading-none rounded-sm flex-shrink-0",
        TYPE_BADGE_STYLES[type] || TYPE_BADGE_STYLES.reference,
      )}
    >
      {type}
    </span>
  );
}

export function SkillSidebar({
  skillName,
  referenceName,
  nav,
  categoryColor,
  isReference,
}: {
  skillName: string;
  referenceName: string | null;
  nav: NavGroup[];
  categoryColor: string;
  isReference: boolean;
}) {
  return (
    <aside className="hidden lg:block overflow-y-auto pt-8 pb-20 pl-6 pr-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to="/skills"
          className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors"
        >
          ← All Skills
        </Link>
      </div>

      {/* Skill name — overview link */}
      <div className="mb-4">
        <Link
          to={`/skills/${skillName}`}
          className={clsx(
            "text-xl font-black uppercase tracking-tighter block",
            isReference
              ? "text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white"
              : "text-[var(--ink-black)] dark:text-white",
          )}
        >
          {skillName.replace(/-/g, " ")}
        </Link>
      </div>

      {/* Transparency badge */}
      <div className="mb-6 p-3 bg-white dark:bg-[var(--card-dark-bg)] border-2 border-[var(--ink-black)] dark:border-white">
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: categoryColor }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-[var(--warm-gray)] leading-tight">
            AI agent reads this
          </p>
        </div>
      </div>

      {/* Grouped navigation */}
      {nav.length > 0 && (
        <nav className="space-y-4">
          {nav.map((group) => {
            // Check if all items in this group are the same type
            const allTypes = group.items.flatMap(tg => tg.items.map(i => i.type));
            const uniqueTypes = new Set(allTypes);
            const showTypeBadges = uniqueTypes.size > 1;

            return (
              <div key={group.label}>
                {/* Topic label - smaller, less prominent */}
                <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5 text-[var(--warm-gray)] px-3">
                  {group.label}
                </h3>

                {/* Type sub-groups */}
                {group.items.map((typeGroup) => (
                  <div key={typeGroup.type} className="space-y-0.5">
                    {typeGroup.items.map((ref) => (
                      <Link
                        key={ref.name}
                        to={`/skills/${skillName}/${ref.name}`}
                        className={clsx(
                          "block px-3 py-1 text-sm transition-all border-l-2",
                          referenceName === ref.name
                            ? "border-[var(--ink-black)] dark:border-white text-[var(--ink-black)] dark:text-white bg-[var(--accent-gold)]/10 font-semibold"
                            : "border-transparent text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white hover:border-[var(--warm-gray)]",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex-1 min-w-0">{ref.title}</span>
                          {showTypeBadges && <TypeBadge type={ref.type} />}
                        </div>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </nav>
      )}
    </aside>
  );
}

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

  if (!skillName) {
    throw new Response("Not Found", { status: 404 });
  }

  // Load skill overview only
  const skillContent = getSkillContent(skillName);
  if (!skillContent) {
    throw new Response("Not Found", { status: 404 });
  }

  const parsed = await parseMdx(skillContent.content);
  const nav = getSkillNav(skillName);
  const referencesMeta = getSkillReferencesMeta(skillName);

  return {
    skillName,
    referenceName: null,
    content: parsed,
    nav,
    referencesMeta,
    isReference: false,
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

export default function SkillDetail({ loaderData }: Route.ComponentProps) {
  useTheme();
  const { skillName, referenceName, content, nav, referencesMeta, isReference } =
    loaderData;
  const { code } = content;
  const MDXAsComponent = React.useMemo(() => getMDXComponent(code), [code]);
  const categoryColor = getCategoryColor(skillName);

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
          categoryColor={categoryColor}
          isReference={isReference}
        />

        {/* Main content */}
        <main className="overflow-y-auto" data-skills-main>
          <div className="max-w-4xl mx-auto px-6 py-8 pb-20">
            {/* Mobile breadcrumb - always show on mobile */}
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
                className={clsx(
                  "hover:text-[var(--ink-black)] dark:hover:text-white font-medium",
                  isReference ? "text-[var(--warm-gray)]" : "text-[var(--ink-black)] dark:text-white"
                )}
              >
                {skillName.replace(/-/g, " ")}
              </Link>
              {isReference && (
                <>
                  <span className="text-[var(--warm-gray)]">/</span>
                  <span className="text-[var(--ink-black)] dark:text-white font-medium">
                    {referenceName?.replace(/-/g, " ")}
                  </span>
                </>
              )}
            </div>

            {/* Desktop breadcrumb for reference pages only */}
            {isReference && (
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
            )}

            {/* Content */}
            <div
              className={clsx(
                "markdown",
                "prose max-w-none dark:prose-invert",
                "prose-base",
                // Paragraphs - warm gray, good leading
                "prose-p:text-[var(--warm-gray)] prose-p:leading-relaxed prose-p:mb-5",
                // Headings - bold hierarchy with tight tracking
                "prose-headings:scroll-mt-20 prose-headings:tracking-tight prose-headings:text-[var(--ink-black)] dark:prose-headings:text-white",
                "prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6 prose-h1:mt-0 prose-h1:leading-[1.1]",
                "prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-4 prose-h2:leading-tight prose-h2:border-b-2 prose-h2:border-[var(--ink-black)]/10 dark:prose-h2:border-white/10 prose-h2:pb-3",
                "prose-h3:text-xl prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-3 prose-h3:leading-tight",
                "prose-h4:text-lg prose-h4:font-semibold prose-h4:mt-6 prose-h4:mb-2 prose-h4:leading-tight",
                // Links - accent blue, bold on hover
                "prose-a:text-[var(--accent-blue)] prose-a:font-semibold prose-a:no-underline hover:prose-a:text-[var(--accent-red)] prose-a:transition-colors",
                // Strong - ink black
                "prose-strong:text-[var(--ink-black)] dark:prose-strong:text-white prose-strong:font-bold",
                // Lists
                "prose-ul:my-5 prose-ol:my-5",
                "prose-li:text-[var(--warm-gray)] prose-li:leading-relaxed prose-li:my-1.5",
                // Code blocks - dark background with border
                "prose-pre:bg-[#1a1a1a] prose-pre:border-2 prose-pre:border-[var(--ink-black)]/10 dark:prose-pre:border-white/10 prose-pre:overflow-x-auto prose-pre:p-4",
                // Inline code - accent background, readable text
                "prose-code:bg-[var(--accent-gold)]/10 prose-code:text-[var(--ink-black)] dark:prose-code:text-white prose-code:font-mono prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
                "prose-code:before:content-none prose-code:after:content-none",
                // Code inside pre blocks should be white
                "prose-pre:prose-code:bg-transparent prose-pre:prose-code:text-white prose-pre:prose-code:p-0",
                // HR - 2px rule
                "prose-hr:border-t-2 prose-hr:border-[var(--ink-black)]/10 dark:prose-hr:border-white/10 prose-hr:my-10",
                // Blockquotes - accent left border
                "prose-blockquote:border-l-4 prose-blockquote:border-[var(--accent-blue)] prose-blockquote:pl-4 prose-blockquote:not-italic prose-blockquote:text-[var(--warm-gray)] prose-blockquote:font-medium",
                // Tables - clean with 2px header border
                "prose-table:text-sm prose-table:border-collapse",
                "prose-th:text-[var(--ink-black)] dark:prose-th:text-white prose-th:font-bold prose-th:uppercase prose-th:tracking-wider prose-th:text-xs prose-th:border-b-2 prose-th:border-[var(--ink-black)] dark:prose-th:border-white prose-th:px-4 prose-th:py-2 prose-th:text-left",
                "prose-td:text-[var(--warm-gray)] prose-td:border-b prose-td:border-[var(--ink-black)]/10 dark:prose-td:border-white/10 prose-td:px-4 prose-td:py-2",
                // Selection style
                "selection:bg-[var(--accent-gold)]/20",
              )}
            >
              <MDXAsComponent
                components={getSkillsMDXComponents(skillName)}
              />
            </div>

            {/* Reference links at bottom for overview page */}
            {!isReference && referencesMeta.length > 0 && (
              <div className="mt-12">
                <h2 className="text-3xl font-black tracking-tighter uppercase mb-6">
                  References
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {referencesMeta.map((ref: SkillReference) => (
                    <Link
                      key={ref.name}
                      to={`/skills/${skillName}/${ref.name}`}
                      className="group relative block"
                    >
                      <div
                        className="absolute -bottom-2 -right-2 w-full h-full transition-all group-hover:-bottom-1 group-hover:-right-1"
                        style={{ backgroundColor: categoryColor }}
                      />
                      <div className="relative bg-white dark:bg-[var(--card-dark-bg)] border-2 border-[var(--ink-black)] dark:border-white p-4 transition-all group-hover:translate-x-[2px] group-hover:translate-y-[2px]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-sm truncate">
                              {ref.title}
                            </span>
                            <TypeBadge type={ref.type} />
                          </div>
                          <svg
                            className="w-4 h-4 text-[var(--warm-gray)] group-hover:text-[var(--ink-black)] dark:group-hover:text-white transition-colors flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                          </svg>
                        </div>
                        {ref.description && (
                          <p className="text-xs text-[var(--warm-gray)] mt-1 truncate">
                            {ref.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </SkillsLayout>
  );
}
