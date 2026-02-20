import * as React from "react";
import { SkillPicker, ReferenceNav } from "./SkillsSidebar";
import type { NavNode } from "~/utils/skills.server";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allSkills: { name: string; title: string; description: string }[];
  currentSkill: string | null;
  navTree: NavNode[];
  currentReference: string | null;
}

export function MobileNavDrawer({
  isOpen,
  onClose,
  allSkills,
  currentSkill,
  navTree,
  currentReference,
}: MobileNavDrawerProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
        className={`fixed inset-y-0 left-0 z-50 flex w-[calc(180px+240px)] max-w-[90vw] transform transition-transform duration-200 ease-in-out lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation"
        role="dialog"
        aria-modal="true"
      >
        {/* SkillPicker column */}
        <div className="w-[180px] flex-shrink-0 flex flex-col">
          <SkillPicker
            allSkills={allSkills}
            currentSkill={currentSkill}
            onNavigate={onClose}
            inline
          />
        </div>

        {/* ReferenceNav column — only shown when inside a skill */}
        {currentSkill && navTree.length > 0 && (
          <div className="flex-1 min-w-0">
            <ReferenceNav
              skillName={currentSkill}
              currentReference={currentReference}
              navTree={navTree}
              onNavigate={onClose}
              inline
            />
          </div>
        )}
      </div>
    </>
  );
}
