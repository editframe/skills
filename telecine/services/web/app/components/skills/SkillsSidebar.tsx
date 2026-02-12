import { Link } from "react-router";
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

const NAV_BG = "bg-[#FAFAF9] dark:bg-[#1a1a1a]";

// ─── Skill Picker (Column 1) ────────────────────────────────────────────────

interface SkillPickerProps {
  allSkills: { name: string; title: string; description: string }[];
  currentSkill: string | null;
}

export function SkillPicker({ allSkills, currentSkill }: SkillPickerProps) {
  return (
    <aside
      className={clsx(
        "hidden lg:block overflow-y-auto pt-6 pb-20 px-3",
        NAV_BG,
        "border-r border-black/[0.06] dark:border-white/[0.12]",
      )}
    >
      <nav className="space-y-0.5">
        {allSkills.map((skill) => {
          const isActive = skill.name === currentSkill;
          return (
            <Link
              key={skill.name}
              to={`/skills/${skill.name}`}
              className={clsx(
                "block px-2.5 py-2 text-[13px] leading-tight rounded-md transition-colors",
                isActive
                  ? "text-gray-900 dark:text-white font-bold bg-blue-600/[0.1] dark:bg-blue-500/[0.15]"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-medium",
              )}
            >
              {skill.title}
            </Link>
          );
        })}
      </nav>

      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-8 px-2.5">
        AI agent reads these skills
      </p>
    </aside>
  );
}

// ─── Reference Nav (Column 2) ───────────────────────────────────────────────

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
          "sticky top-0 z-[9] -mx-3 px-3 pb-1 pt-1",
          NAV_BG,
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

interface ReferenceNavProps {
  skillName: string;
  currentReference: string | null;
  navTree: NavNode[];
}

export function ReferenceNav({
  skillName,
  currentReference,
  navTree,
}: ReferenceNavProps) {
  if (navTree.length === 0) return null;

  return (
    <aside
      className={clsx(
        "hidden lg:block overflow-y-auto pt-6 pb-20 px-3",
        NAV_BG,
        "border-r border-black/[0.06] dark:border-white/[0.12]",
      )}
    >
      {navTree.map((node) => (
        <NavTreeSection
          key={node.path}
          node={node}
          skillName={skillName}
          referenceName={currentReference}
        />
      ))}
    </aside>
  );
}
