import * as React from "react";
import { Link } from "react-router";
import clsx from "clsx";
import { NavTreeSection } from "./SkillsSidebar";
import type { NavNode } from "~/utils/skills.server";

const NAV_BG = "bg-[#FAFAF9] dark:bg-[#1a1a1a]";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allSkills: { name: string; title: string; description: string }[];
  allNavTrees: Record<string, NavNode[]>;
  currentSkill: string | null;
  currentReference: string | null;
}

export function MobileNavDrawer({
  isOpen,
  onClose,
  allSkills,
  allNavTrees,
  currentSkill,
  currentReference,
}: MobileNavDrawerProps) {
  const [activeSkill, setActiveSkill] = React.useState<string | null>(currentSkill);

  // When the drawer opens, jump to the current skill's reference level if applicable
  React.useEffect(() => {
    if (isOpen) {
      setActiveSkill(currentSkill);
    }
  }, [isOpen, currentSkill]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeSkill) {
          setActiveSkill(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, activeSkill, onClose]);

  React.useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const activeNavTree = activeSkill ? (allNavTrees[activeSkill] ?? []) : [];
  const activeSkillData = allSkills.find((s) => s.name === activeSkill);

  const atLevel2 = activeSkill !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-80 max-w-[90vw]",
          "transform transition-transform duration-200 ease-in-out",
          "overflow-hidden lg:hidden",
          NAV_BG,
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        {/* Level 1 — skill list */}
        <div
          className={`absolute inset-0 flex flex-col transition-transform duration-200 ${
            atLevel2 ? "-translate-x-full" : "translate-x-0"
          }`}
        >
          <div className="flex-shrink-0 px-4 pt-5 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Docs
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {allSkills.map((skill) => {
              const isActive = skill.name === currentSkill;
              return (
                <button
                  key={skill.name}
                  onClick={() => setActiveSkill(skill.name)}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                    isActive
                      ? "text-gray-900 dark:text-white font-bold bg-blue-600/[0.08] dark:bg-blue-500/[0.12]"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-medium",
                  )}
                >
                  <span className="text-[14px]">{skill.title}</span>
                  <svg
                    className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>

        {/* Level 2 — reference tree for selected skill */}
        <div
          className={`absolute inset-0 flex flex-col transition-transform duration-200 ${
            atLevel2 ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center gap-1 px-2 pt-3 pb-1">
              <button
                onClick={() => setActiveSkill(null)}
                className="flex items-center gap-1 px-2 py-1.5 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                All Docs
              </button>
            </div>
            {activeSkillData && (
              <Link
                to={`/skills/${activeSkillData.name}`}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-2.5 mb-1 group"
              >
                <span className="text-[14px] font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {activeSkillData.title}
                </span>
                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-wider">
                  Overview →
                </span>
              </Link>
            )}
          </div>

          {/* Reference tree */}
          <div className="flex-1 overflow-y-auto pt-4 pb-20 px-3">
            {activeNavTree.map((node) => (
              <NavTreeSection
                key={node.path}
                node={node}
                skillName={activeSkill!}
                referenceName={activeSkill === currentSkill ? currentReference : null}
                onNavigate={onClose}
              />
            ))}
            {activeNavTree.length === 0 && activeSkillData && (
              <div className="px-3 py-4 text-[13px] text-gray-400 dark:text-gray-500">
                No references yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
