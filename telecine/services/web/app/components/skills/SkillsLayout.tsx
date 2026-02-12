import { Link } from "react-router";
import * as React from "react";
import { ThemeToggle } from "~/components/ThemeToggle";

interface SkillsLayoutProps {
  children: React.ReactNode;
}

export function SkillsLayout({ children }: SkillsLayoutProps) {
  return (
    <div className="grid grid-rows-[auto_minmax(0,1fr)] h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      {/* Header - branded, bold, stays punchy */}
      <header className="border-b-2 border-gray-900 dark:border-white/20 bg-white dark:bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <Link
                to="/"
                className="text-xl md:text-2xl font-black uppercase tracking-tighter flex-shrink-0 text-gray-900 dark:text-white"
              >
                Editframe
              </Link>
              <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">/</span>
              <Link
                to="/skills"
                className="text-xs md:text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 hover:text-red-600 dark:hover:text-red-400 transition-colors hidden sm:inline"
              >
                Skills
              </Link>
            </div>
            <div className="flex items-center gap-3 md:gap-6">
              <ThemeToggle />
              <Link
                to="/docs"
                className="text-xs md:text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 hover:text-red-600 dark:hover:text-red-400 transition-colors hidden sm:inline"
              >
                Docs
              </Link>
              <Link
                to="/welcome"
                className="px-4 md:px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-xs md:text-sm uppercase tracking-wider hover:bg-red-600 dark:hover:bg-red-500 transition-colors"
              >
                Start
              </Link>
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
