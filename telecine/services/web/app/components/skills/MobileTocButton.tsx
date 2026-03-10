import * as React from "react";
import { usePageHeadings } from "~/hooks/usePageHeadings";
import { TocList } from "./OnThisPage";

export function MobileTocButton() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { headings, activeId } = usePageHeadings();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  if (headings.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 xl:hidden ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Right drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-[#FAFAF9] dark:bg-[#1a1a1a] border-l border-black/[0.06] dark:border-white/[0.12] transform transition-transform duration-200 ease-in-out xl:hidden overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="On this page"
      >
        <div className="pt-6 pb-20 px-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              On This Page
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <TocList
            headings={headings}
            activeId={activeId}
            onNavigate={() => setIsOpen(false)}
          />
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-30 xl:hidden flex items-center justify-center w-11 h-11 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg hover:bg-blue-600 dark:hover:bg-blue-400 transition-colors"
        aria-label="Open table of contents"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 10h10M4 14h12M4 18h8"
          />
        </svg>
      </button>
    </>
  );
}
