import * as React from "react";
import { Link } from "react-router";
import type { SkillReference } from "~/utils/skills.server";

interface DropdownItem {
  name: string;
  title: string;
  to: string;
}

function BreadcrumbSegment({
  label,
  items,
  isLast,
  to,
}: {
  label: string;
  items?: DropdownItem[];
  isLast: boolean;
  to?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const hasDropdown = items && items.length > 0;

  return (
    <div ref={ref} className="relative flex items-center min-w-0">
      {hasDropdown ? (
        <button
          onClick={() => setIsOpen((v) => !v)}
          className={`flex items-center gap-1 text-[13px] font-medium transition-colors truncate max-w-[160px] ${
            isLast
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <span className="truncate">{label}</span>
          <svg
            className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : to ? (
        <Link
          to={to}
          className="text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors truncate max-w-[160px]"
        >
          {label}
        </Link>
      ) : (
        <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate max-w-[160px]">
          {label}
        </span>
      )}

      {isOpen && hasDropdown && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 max-h-72 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-md shadow-lg">
          {items.map((item) => (
            <Link
              key={item.name}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors truncate"
            >
              {item.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface MobileBreadcrumbBarProps {
  allSkills: { name: string; title: string; description: string }[];
  currentSkill: string | null;
  currentSkillTitle: string | null;
  referencesMeta?: SkillReference[];
  currentReference: string | null;
  currentReferenceTitle: string | null;
}

export function MobileBreadcrumbBar({
  allSkills,
  currentSkill,
  currentSkillTitle,
  referencesMeta,
  currentReference,
  currentReferenceTitle,
}: MobileBreadcrumbBarProps) {
  const skillItems: DropdownItem[] = allSkills.map((s) => ({
    name: s.name,
    title: s.title,
    to: `/skills/${s.name}`,
  }));

  const referenceItems: DropdownItem[] = referencesMeta
    ? referencesMeta.map((r) => ({
        name: r.name,
        title: r.title,
        to: `/skills/${currentSkill}/${r.name}`,
      }))
    : [];

  return (
    <div className="lg:hidden sticky top-0 z-20 bg-white dark:bg-[#0a0a0a] border-b border-black/[0.06] dark:border-white/[0.08] px-4 py-2.5">
      <div className="flex items-center gap-1.5 min-w-0">
        {/* "Docs" segment — always a dropdown to switch docs */}
        <BreadcrumbSegment
          label="Docs"
          items={skillItems}
          isLast={!currentSkill}
          to="/skills"
        />

        {currentSkill && currentSkillTitle && (
          <>
            <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">/</span>
            {currentReference ? (
              /* On a reference page: skill segment links back, ref segment has dropdown */
              <>
                <BreadcrumbSegment
                  label={currentSkillTitle}
                  isLast={false}
                  to={`/skills/${currentSkill}`}
                />
                <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">/</span>
                <BreadcrumbSegment
                  label={currentReferenceTitle || currentReference}
                  items={referenceItems}
                  isLast={true}
                />
              </>
            ) : (
              /* On the skill overview page: skill segment is the last item */
              <BreadcrumbSegment
                label={currentSkillTitle}
                isLast={true}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
