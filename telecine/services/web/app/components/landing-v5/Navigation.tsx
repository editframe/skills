import { useState } from "react";
import { Link } from "react-router";
import { ThemeToggle } from "~/components/ThemeToggle";
import { LandingNavLink } from "./LandingNavLink";

interface NavigationProps {
  isLoggedIn: boolean;
}

export function Navigation({ isLoggedIn }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--paper-cream)] border-b-2 border-[var(--ink-black)] dark:border-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center">
          <span className="text-xl font-black tracking-tighter uppercase">editframe</span>
        </Link>
        <div className="hidden md:flex items-center gap-1">
          <LandingNavLink to="/docs">Docs</LandingNavLink>
          <LandingNavLink to="/examples">Examples</LandingNavLink>
          <LandingNavLink to="/pricing">Pricing</LandingNavLink>
          <a href="https://github.com/editframe/elements" target="_blank" rel="noopener noreferrer" className="px-4 py-2 hover:bg-[var(--poster-gold)] transition-colors" aria-label="GitHub">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isLoggedIn ? (
            <Link
              to="/dashboard"
              className="px-5 py-2 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-blue)] transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden md:inline-flex px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
                Sign in
              </Link>
              <Link
                to="/welcome"
                className="hidden md:inline-flex px-5 py-2 bg-[var(--poster-red)] text-white text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-blue)] transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2"
            aria-label="Toggle menu"
          >
            <div className={`w-5 h-0.5 bg-[var(--ink-black)] dark:bg-white transition-transform ${mobileMenuOpen ? "translate-y-[4px] rotate-45" : ""}`} />
            <div className={`w-5 h-0.5 bg-[var(--ink-black)] dark:bg-white transition-opacity ${mobileMenuOpen ? "opacity-0" : ""}`} />
            <div className={`w-5 h-0.5 bg-[var(--ink-black)] dark:bg-white transition-transform ${mobileMenuOpen ? "-translate-y-[4px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>
        {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-[var(--ink-black)] dark:border-white bg-[var(--paper-cream)]">
          <div className="px-6 py-4 flex flex-col gap-2">
            <LandingNavLink to="/docs" onClick={() => setMobileMenuOpen(false)}>
              Docs
            </LandingNavLink>
            <LandingNavLink to="/examples" onClick={() => setMobileMenuOpen(false)}>
              Examples
            </LandingNavLink>
            <LandingNavLink to="/pricing" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </LandingNavLink>
            {!isLoggedIn && (
              <>
                <div className="border-t-2 border-[var(--ink-black)]/10 dark:border-white/10 mt-2 pt-2" />
                <LandingNavLink to="/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign in
                </LandingNavLink>
                <Link
                  to="/welcome"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 bg-[var(--poster-red)] text-white text-sm font-bold uppercase tracking-wider text-center hover:bg-[var(--poster-blue)] transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
