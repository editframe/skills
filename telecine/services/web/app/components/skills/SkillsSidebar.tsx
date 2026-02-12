import { Link } from "react-router";
import * as React from "react";
import clsx from "clsx";
import type { NavNode } from "~/utils/skills.server";

const TYPE_BADGE_STYLES: Record<string, string> = {
  tutorial: "bg-green-700 dark:bg-green-600 text-white",
  "how-to": "bg-blue-700 dark:bg-blue-600 text-white",
  explanation: "bg-amber-500 dark:bg-amber-400 text-gray-900",
  reference: "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
};

export function TypeBadge({ type }: { type: string }) {
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

const SIDEBAR_BG = "bg-[#FAFAF9] dark:bg-[#1a1a1a]";

function NavTreeItems({
  items,
  skillName,
  referenceName,
  showTypeBadges,
}: {
  items: NavNode["items"];
  skillName: string;
  referenceName: string | null;
  showTypeBadges: boolean;
}) {
  return (
    <div className="space-y-px">
      {items.map((ref) => (
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
  );
}

function NavTreeSubNode({
  node,
  skillName,
  referenceName,
}: {
  node: NavNode;
  skillName: string;
  referenceName: string | null;
}) {
  const hasChildren = node.children.length > 0;
  const hasItems = node.items.length > 0;
  const allTypes = node.items.map((i) => i.type);
  const uniqueTypes = new Set(allTypes);
  const showTypeBadges = uniqueTypes.size > 1;

  return (
    <div>
      <div className="mb-1.5 ml-3 pl-0 py-0.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-600 select-none">
          {node.label}
        </span>
      </div>

      <div className="ml-3 pl-3 border-l border-black/[0.06] dark:border-white/[0.15]">
        {hasItems && (
          <NavTreeItems
            items={node.items}
            skillName={skillName}
            referenceName={referenceName}
            showTypeBadges={showTypeBadges}
          />
        )}
        {hasChildren && (
          <div className="space-y-2 mt-2">
            {node.children.map((child) => (
              <NavTreeSubNode
                key={child.path}
                node={child}
                skillName={skillName}
                referenceName={referenceName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NavTreeSection({
  node,
  skillName,
  referenceName,
}: {
  node: NavNode;
  skillName: string;
  referenceName: string | null;
}) {
  const hasChildren = node.children.length > 0;
  const hasItems = node.items.length > 0;
  const allTypes = node.items.map((i) => i.type);
  const uniqueTypes = new Set(allTypes);
  const showTypeBadges = uniqueTypes.size > 1;

  return (
    <div className="mb-4">
      {/* Sticky section header */}
      <div
        className={clsx(
          "sticky top-[37px] z-[9] -mx-4 px-4 pb-1 pt-1",
          SIDEBAR_BG,
        )}
      >
        <div className="flex items-center gap-2 px-3 py-1.5">
          {node.icon && (
            <span className="text-base leading-none">{node.icon}</span>
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-200">
            {node.label}
          </span>
        </div>
      </div>

      <div>
        {hasItems && (
          <NavTreeItems
            items={node.items}
            skillName={skillName}
            referenceName={referenceName}
            showTypeBadges={showTypeBadges}
          />
        )}
        {hasChildren && (
          <div className="space-y-2 mt-2">
            {node.children.map((child) => (
              <NavTreeSubNode
                key={child.path}
                node={child}
                skillName={skillName}
                referenceName={referenceName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={clsx(
        "w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150",
        expanded && "rotate-90",
      )}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M6 3.5l4.5 4.5L6 12.5V3.5z" />
    </svg>
  );
}

interface SkillsSidebarProps {
  allSkills: { name: string; description: string }[];
  currentSkill: string | null;
  currentReference: string | null;
  navTree: NavNode[];
}

export function SkillsSidebar({
  allSkills,
  currentSkill,
  currentReference,
  navTree,
}: SkillsSidebarProps) {
  const [expanded, setExpanded] = React.useState(true);

  // Re-expand when navigating to a different skill
  React.useEffect(() => {
    setExpanded(true);
  }, [currentSkill]);

  return (
    <aside className="hidden lg:block overflow-y-auto pb-20 bg-[#FAFAF9] dark:bg-[#1a1a1a] border-r border-black/[0.06] dark:border-white/[0.12]">
      <nav className="px-4 pt-6">
        {allSkills.map((skill) => {
          const isActive = skill.name === currentSkill;
          const hasTree = isActive && navTree.length > 0;
          const isExpanded = hasTree && expanded;

          return (
            <div key={skill.name} className="mb-0.5">
              {/* Sticky skill name when expanded */}
              <div
                className={clsx(
                  isExpanded && "sticky top-0 z-10 -mx-4 px-4 pt-0.5",
                  isExpanded && SIDEBAR_BG,
                )}
              >
                <div
                  className={clsx(
                    "flex items-center rounded-md transition-colors",
                    isActive
                      ? "text-gray-900 dark:text-white font-bold"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium",
                  )}
                >
                  {hasTree ? (
                    <button
                      onClick={() => setExpanded((e) => !e)}
                      className="flex items-center justify-center w-7 h-7 flex-shrink-0 rounded hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-gray-400 dark:text-gray-500"
                    >
                      <Chevron expanded={isExpanded} />
                    </button>
                  ) : (
                    <span className="w-7 flex-shrink-0" />
                  )}
                  <Link
                    to={`/skills/${skill.name}`}
                    className={clsx(
                      "flex-1 min-w-0 px-1.5 py-2 text-[13px] leading-tight rounded-md transition-colors",
                      isActive
                        ? "hover:bg-blue-600/[0.06] dark:hover:bg-blue-500/[0.1]"
                        : "hover:bg-black/[0.03] dark:hover:bg-white/[0.06]",
                    )}
                  >
                    {skill.name
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Link>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-1 mb-2 ml-3 pl-3 border-l border-black/[0.06] dark:border-white/[0.12]">
                  {navTree.map((node) => (
                    <NavTreeSection
                      key={node.path}
                      node={node}
                      skillName={skill.name}
                      referenceName={currentReference}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-6 px-7">
        AI agent reads these skills
      </p>
    </aside>
  );
}
