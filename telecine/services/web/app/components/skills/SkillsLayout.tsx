import { Link } from "react-router";
import * as React from "react";
import { ThemeToggle } from "~/components/ThemeToggle";

interface SkillsLayoutProps {
  children: React.ReactNode;
}

export function SkillsLayout({ children }: SkillsLayoutProps) {
  return (
    <div className="grid grid-rows-[auto_minmax(0,1fr)] h-screen bg-[var(--paper-cream)] texture-paper">
      {/* Header */}
      <header className="border-b-4 border-[var(--ink-black)] dark:border-white bg-white dark:bg-[var(--card-dark-bg)]">
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <Link
                to="/"
                className="text-xl md:text-2xl font-black uppercase tracking-tighter flex-shrink-0"
              >
                Editframe
              </Link>
              <span className="text-[var(--warm-gray)] hidden sm:inline">/</span>
              <Link
                to="/skills"
                className="text-xs md:text-sm font-bold uppercase tracking-wider hover:text-[var(--poster-red)] transition-colors hidden sm:inline"
              >
                Skills
              </Link>
            </div>
            <div className="flex items-center gap-3 md:gap-6">
              <ThemeToggle />
              <Link
                to="/docs"
                className="text-xs md:text-sm font-bold uppercase tracking-wider hover:text-[var(--poster-red)] transition-colors hidden sm:inline"
              >
                Docs
              </Link>
              <Link
                to="/welcome"
                className="px-4 md:px-6 py-2 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black font-bold text-xs md:text-sm uppercase tracking-wider hover:bg-[var(--poster-red)] transition-colors"
              >
                Start
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content grid - children provide the sidebar and main content */}
      {children}
    </div>
  );
}
