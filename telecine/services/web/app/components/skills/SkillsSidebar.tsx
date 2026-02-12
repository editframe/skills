import { Link } from "react-router";
import clsx from "clsx";
import type { NavNode, SkillReference } from "~/utils/skills.server";

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

  const allTypes = node.items.map((i) => i.type);
  const uniqueTypes = new Set(allTypes);
  const showTypeBadges = uniqueTypes.size > 1;

  return (
    <div className={depth === 0 ? "mb-4" : "mb-0"}>
      {depth === 0 ? (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-2">
          {node.icon && (
            <span className="text-base leading-none">{node.icon}</span>
          )}
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

      <div
        className={
          depth === 0
            ? ""
            : "ml-3 pl-3 border-l border-black/[0.06] dark:border-white/[0.15]"
        }
      >
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
  return (
    <aside className="hidden lg:block overflow-y-auto pt-6 pb-20 px-4 bg-[#FAFAF9] dark:bg-[#1a1a1a] border-r border-black/[0.06] dark:border-white/[0.12]">
      <nav>
        {allSkills.map((skill) => {
          const isActive = skill.name === currentSkill;
          const isExpanded = isActive && navTree.length > 0;

          return (
            <div key={skill.name} className="mb-1">
              <Link
                to={`/skills/${skill.name}`}
                className={clsx(
                  "block px-3 py-2 text-[13px] leading-tight rounded-md transition-colors",
                  isActive
                    ? "text-gray-900 dark:text-white font-bold bg-blue-600/[0.08] dark:bg-blue-500/[0.12]"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.06] font-medium",
                )}
              >
                {skill.name
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </Link>

              {isExpanded && (
                <div className="mt-2 mb-3 ml-3 pl-3 border-l border-black/[0.06] dark:border-white/[0.12]">
                  {navTree.map((node) => (
                    <NavTreeNode
                      key={node.path}
                      node={node}
                      skillName={skill.name}
                      referenceName={currentReference}
                      depth={0}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-6 px-3">
        AI agent reads these skills
      </p>
    </aside>
  );
}
