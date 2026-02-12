import { Link } from "react-router";
import * as React from "react";
import { getMDXComponent } from "mdx-bundler/client";
import type { Route } from "./+types/skill-detail";
import {
  getSkillContent,
  getSkillNav,
  getSkillNavTree,
  getSkillReferencesMeta,
} from "~/utils/skills.server";
import type { NavGroup, NavNode, SkillReference } from "~/utils/skills.server";
import { parseMdx } from "~/utils/mdx-bundler.server";
import { getSkillsMDXComponents } from "~/utils/skills-mdx-components";
import clsx from "clsx";
import { useTheme } from "~/hooks/useTheme";
import { SkillsLayout } from "~/components/skills/SkillsLayout";
import { OnThisPage } from "~/components/skills/OnThisPage";

const TYPE_BADGE_STYLES: Record<string, string> = {
  tutorial: "bg-green-700 dark:bg-green-600 text-white",
  "how-to": "bg-blue-700 dark:bg-blue-600 text-white",
  explanation: "bg-amber-500 dark:bg-amber-400 text-gray-900",
  reference: "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
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

function NavTreeNode({
  node,
  skillName,
  referenceName,
  depth = 0,
}: {
  node: NavNode;
  skillName: string;
  referenceName: string | null;
  depth?: number;
}) {
  const hasChildren = node.children.length > 0;
  const hasItems = node.items.length > 0;
  
  const allTypes = node.items.map(i => i.type);
  const uniqueTypes = new Set(allTypes);
  const showTypeBadges = uniqueTypes.size > 1;
  
  return (
    <div className={depth === 0 ? "mb-4" : "mb-0"}>
      {/* Node header */}
      {depth === 0 ? (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-2">
          {node.icon && <span className="text-base leading-none">{node.icon}</span>}
          <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-200">
            {node.label}
          </span>
        </div>
      ) : (
        <div className="mb-1.5 ml-3 pl-0 py-0.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-600 select-none">
            {node.label}
          </span>
        </div>
      )}
      
      {/* Node contents */}
      <div className={depth === 0 ? "" : "ml-3 pl-3 border-l border-black/[0.06] dark:border-white/[0.15]"}>
        {/* Items */}
        {hasItems && (
          <div className="space-y-px">
            {node.items.map((ref) => (
              <Link
                key={ref.name}
                to={`/skills/${skillName}/${ref.name}`}
                className={clsx(
                  "block px-3 py-1.5 text-[13px] leading-tight transition-all rounded-md",
                  referenceName === ref.name
                    ? "text-gray-900 dark:text-white bg-blue-600/[0.12] dark:bg-blue-500/[0.2] font-bold border-l-2 border-blue-600 dark:border-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.08] font-medium border-l-2 border-transparent",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0">{ref.title}</span>
                  {showTypeBadges && <TypeBadge type={ref.type} />}
                </div>
              </Link>
            ))}
          </div>
        )}
        
        {/* Children */}
        {hasChildren && (
          <div className="space-y-2 mt-2">
            {node.children.map((child) => (
              <NavTreeNode
                key={child.path}
                node={child}
                skillName={skillName}
                referenceName={referenceName}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SkillSidebarTree({
  skillName,
  referenceName,
  navTree,
  isReference,
}: {
  skillName: string;
  referenceName: string | null;
  navTree: NavNode[];
  isReference: boolean;
}) {
  return (
    <aside className="hidden lg:block overflow-y-auto pt-6 pb-20 px-4 bg-[#FAFAF9] dark:bg-[#1a1a1a] border-r border-black/[0.06] dark:border-white/[0.12]">
      {/* Breadcrumb */}
      <div className="mb-6 px-2">
        <Link
          to="/skills"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <span>←</span>
          <span>All Skills</span>
        </Link>
      </div>

      {/* Skill name — overview link */}
      <div className="mb-1 px-2">
        <Link
          to={`/skills/${skillName}`}
          className={clsx(
            "block text-base font-bold tracking-tight transition-colors",
            isReference
              ? "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              : "text-gray-900 dark:text-white",
          )}
        >
          {skillName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Link>
      </div>

      {/* Transparency note */}
      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-8 px-2">
        AI agent reads this skill
      </p>

      {/* Tree navigation */}
      {navTree.length > 0 && (
        <nav>
          {navTree.map((node) => (
            <NavTreeNode
              key={node.path}
              node={node}
              skillName={skillName}
              referenceName={referenceName}
              depth={0}
            />
          ))}
        </nav>
      )}
    </aside>
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
          className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
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
              ? "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              : "text-gray-900 dark:text-white",
          )}
        >
          {skillName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Link>
      </div>

      {/* Transparency note */}
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-5">
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
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] mt-2 mb-1 text-gray-400 dark:text-gray-500 px-2">
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
                            ? "border-blue-600 dark:border-blue-400 text-gray-900 dark:text-white bg-blue-600/5 dark:bg-blue-500/10 font-medium"
                            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.03]",
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
  const navTree = getSkillNavTree(skillName);
  const referencesMeta = getSkillReferencesMeta(skillName);

  // Extract API metadata from frontmatter
  const apiMetadata = (parsed.frontmatter as any)?.api || null;

  return {
    skillName,
    referenceName: null,
    content: parsed,
    nav,
    navTree,
    referencesMeta,
    apiMetadata,
    isReference: false,
  };
};

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
    .filter(ref => ref.track === currentRef.track)
    .sort((a, b) => (a.track_step ?? 999) - (b.track_step ?? 999));

  const currentIndex = trackRefs.findIndex(ref => ref.name === currentRef.name);
  const prevRef = currentIndex > 0 ? trackRefs[currentIndex - 1] : null;
  const nextRef = currentIndex < trackRefs.length - 1 ? trackRefs[currentIndex + 1] : null;

  const progress = trackRefs.length > 0 ? ((currentIndex + 1) / trackRefs.length) * 100 : 0;

  return (
    <div className="mt-12 pt-8 border-t border-black/10 dark:border-white/10">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span className="font-medium">{currentRef.track_title || "Learning Path"}</span>
          <span>Step {currentIndex + 1} of {trackRefs.length}</span>
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
            <span className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">←</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">Previous</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{prevRef.title}</div>
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
              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">Next</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{nextRef.title}</div>
            </div>
            <span className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">→</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function SkillDetail({ loaderData }: Route.ComponentProps) {
  useTheme();
  const { skillName, referenceName, content, navTree, referencesMeta, apiMetadata, isReference } =
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
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_auto] overflow-hidden">
        {/* Sidebar */}
        <SkillSidebarTree
          skillName={skillName}
          referenceName={referenceName}
          navTree={navTree}
          isReference={isReference}
        />

        {/* Main content - clean white reading surface */}
        <main className="overflow-y-auto bg-white dark:bg-[#0a0a0a]" data-skills-main>
          <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10 pb-24">
            {/* Mobile breadcrumb */}
            <div className="lg:hidden mb-6 flex items-center gap-2 text-[13px] flex-wrap text-gray-500 dark:text-gray-400">
              <Link
                to="/skills"
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Skills
              </Link>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <Link
                to={`/skills/${skillName}`}
                className={clsx(
                  "hover:text-gray-900 dark:hover:text-white transition-colors",
                  isReference ? "" : "text-gray-900 dark:text-gray-100 font-medium"
                )}
              >
                {skillName.replace(/-/g, " ")}
              </Link>
              {isReference && (
                <>
                  <span className="text-gray-400 dark:text-gray-600">/</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {referenceName?.replace(/-/g, " ")}
                  </span>
                </>
              )}
            </div>

            {/* Desktop breadcrumb for reference pages only */}
            {isReference && (
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
                  {skillName.replace(/-/g, " ")}
                </Link>
                <span className="text-gray-400 dark:text-gray-600">/</span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">
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
            {isReference && (
              <LearningPathNav
                currentRef={referencesMeta.find((r: SkillReference) => r.name === referenceName) || null}
                allRefs={referencesMeta}
                skillName={skillName}
              />
            )}

            {/* Reference links at bottom for overview page */}
            {!isReference && referencesMeta.length > 0 && (
              <div className="mt-12 pt-8 border-t border-black/10 dark:border-white/10">
                <h2 className="text-lg font-bold tracking-tight mb-4 text-gray-900 dark:text-white">
                  References
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {referencesMeta.map((ref: SkillReference) => (
                    <Link
                      key={ref.name}
                      to={`/skills/${skillName}/${ref.name}`}
                      className="group block p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:border-blue-600/40 dark:hover:border-blue-400/40 hover:bg-blue-600/[0.02] dark:hover:bg-blue-500/[0.05] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {ref.title}
                        </span>
                        <TypeBadge type={ref.type} />
                      </div>
                      {ref.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
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

        {/* On This Page navigation */}
        <OnThisPage />
      </div>
    </SkillsLayout>
  );
}
