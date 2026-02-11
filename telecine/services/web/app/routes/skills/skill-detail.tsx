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
  isReference,
}: {
  skillName: string;
  referenceName: string | null;
  nav: NavGroup[];
  isReference: boolean;
}) {
  return (
    <aside className="hidden lg:block overflow-y-auto pt-6 pb-20 pl-6 pr-4 bg-[#FAFAF9] dark:bg-[#111] border-r border-black/5 dark:border-white/5">
      {/* Breadcrumb */}
      <div className="mb-5">
        <Link
          to="/skills"
          className="text-xs font-medium text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors"
        >
          ← All Skills
        </Link>
      </div>

      {/* Skill name — overview link */}
      <div className="mb-1">
        <Link
          to={`/skills/${skillName}`}
          className={clsx(
            "text-sm font-bold block",
            isReference
              ? "text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white"
              : "text-[var(--ink-black)] dark:text-white",
          )}
        >
          {skillName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Link>
      </div>

      {/* Transparency note */}
      <p className="text-[11px] text-[var(--warm-gray)]/60 mb-5">
        AI agent reads this skill
      </p>

      {/* Grouped navigation */}
      {nav.length > 0 && (
        <nav className="space-y-0">
          {nav.map((group) => {
            const allTypes = group.items.flatMap(tg => tg.items.map(i => i.type));
            const uniqueTypes = new Set(allTypes);
            const showTypeBadges = uniqueTypes.size > 1;

            const totalItems = group.items.reduce((sum, tg) => sum + tg.items.length, 0);
            const showTopicHeader = totalItems > 1;

            return (
              <div key={group.label} className="mb-3">
                {showTopicHeader && (
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] mt-2 mb-1 text-[var(--warm-gray)]/60 px-2">
                    {group.label}
                  </h3>
                )}

                {group.items.map((typeGroup) => (
                  <div key={typeGroup.type}>
                    {typeGroup.items.map((ref) => (
                      <Link
                        key={ref.name}
                        to={`/skills/${skillName}/${ref.name}`}
                        className={clsx(
                          "block px-2 py-1 text-[13px] leading-snug transition-colors border-l-2 rounded-r-sm",
                          referenceName === ref.name
                            ? "border-[var(--accent-blue)] text-[var(--ink-black)] dark:text-white bg-[var(--accent-blue)]/5 font-medium"
                            : "border-transparent text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.03]",
                        )}
                      >
                        <div className="flex items-center gap-1.5">
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

export default function SkillDetail({ loaderData }: Route.ComponentProps) {
  useTheme();
  const { skillName, referenceName, content, nav, referencesMeta, isReference } =
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
                className={clsx(
                  "hover:text-[var(--ink-black)] dark:hover:text-white transition-colors",
                  isReference ? "" : "text-[var(--ink-black)] dark:text-white font-medium"
                )}
              >
                {skillName.replace(/-/g, " ")}
              </Link>
              {isReference && (
                <>
                  <span>/</span>
                  <span className="text-[var(--ink-black)] dark:text-white font-medium">
                    {referenceName?.replace(/-/g, " ")}
                  </span>
                </>
              )}
            </div>

            {/* Desktop breadcrumb for reference pages only */}
            {isReference && (
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
            )}

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

            {/* Reference links at bottom for overview page */}
            {!isReference && referencesMeta.length > 0 && (
              <div className="mt-12 pt-8 border-t border-black/10 dark:border-white/10">
                <h2 className="text-lg font-bold tracking-tight mb-4 text-[var(--ink-black)] dark:text-white">
                  References
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {referencesMeta.map((ref: SkillReference) => (
                    <Link
                      key={ref.name}
                      to={`/skills/${skillName}/${ref.name}`}
                      className="group block p-3 border border-black/10 dark:border-white/10 rounded-md hover:border-[var(--accent-blue)]/40 hover:bg-[var(--accent-blue)]/[0.02] dark:hover:bg-[var(--accent-blue)]/[0.05] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm text-[var(--ink-black)] dark:text-white truncate">
                          {ref.title}
                        </span>
                        <TypeBadge type={ref.type} />
                      </div>
                      {ref.description && (
                        <p className="text-xs text-[var(--warm-gray)] mt-1 line-clamp-1">
                          {ref.description}
                        </p>
                      )}
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
