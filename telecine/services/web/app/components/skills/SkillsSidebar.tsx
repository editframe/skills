import { Link } from "react-router";
import clsx from "clsx";
import type { NavNode } from "~/utils/skills.server";

const NAV_BG = "bg-[#FAFAF9] dark:bg-[#1a1a1a]";

// ─── Skill Picker (Column 1) ────────────────────────────────────────────────

interface SkillPickerProps {
  allSkills: { name: string; title: string; description: string }[];
  currentSkill: string | null;
  onNavigate?: () => void;
  inline?: boolean;
}

export function SkillPicker({ allSkills, currentSkill, onNavigate, inline }: SkillPickerProps) {
  return (
    <aside
      className={clsx(
        inline ? "block" : "hidden lg:block",
        "overflow-y-auto pt-6 pb-20 px-3",
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
              onClick={onNavigate}
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

    </aside>
  );
}

// ─── Reference Nav (Column 2) ───────────────────────────────────────────────

function NavTreeItems({
  items,
  skillName,
  referenceName,
  onNavigate,
}: {
  items: NavNode["items"];
  skillName: string;
  referenceName: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-px">
      {items.map((ref) => (
        <Link
          key={ref.name}
          to={`/skills/${skillName}/${ref.name}`}
          onClick={onNavigate}
          className={clsx(
            "block px-3 py-1.5 text-[13px] leading-tight transition-all rounded-md",
            referenceName === ref.name
              ? "text-gray-900 dark:text-white bg-blue-600/[0.12] dark:bg-blue-500/[0.2] font-bold border-l-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.08] font-medium border-l-2 border-transparent",
          )}
        >
          {ref.title}
        </Link>
      ))}
    </div>
  );
}

function NavTreeSubNode({
  node,
  skillName,
  referenceName,
  onNavigate,
}: {
  node: NavNode;
  skillName: string;
  referenceName: string | null;
  onNavigate?: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const hasItems = node.items.length > 0;

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
            onNavigate={onNavigate}
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
                onNavigate={onNavigate}
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
  onNavigate,
}: {
  node: NavNode;
  skillName: string;
  referenceName: string | null;
  onNavigate?: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const hasItems = node.items.length > 0;

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
            onNavigate={onNavigate}
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
                onNavigate={onNavigate}
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
  onNavigate?: () => void;
  inline?: boolean;
}

export function ReferenceNav({
  skillName,
  currentReference,
  navTree,
  onNavigate,
  inline,
}: ReferenceNavProps) {
  if (navTree.length === 0) return null;

  return (
    <aside
      className={clsx(
        inline ? "block" : "hidden lg:block",
        "overflow-y-auto pt-6 pb-20 px-3",
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
          onNavigate={onNavigate}
        />
      ))}
    </aside>
  );
}
