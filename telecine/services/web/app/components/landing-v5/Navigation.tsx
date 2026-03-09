import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ThemeToggle } from "~/components/ThemeToggle";
import { LandingNavLink } from "./LandingNavLink";

function readLoggedInCookie(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith("_logged_in=1"));
}

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(readLoggedInCookie());
  }, []);

  return (
    <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-[var(--paper-cream)] border-b-2 border-[var(--ink-black)] dark:border-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center">
          <span className="text-xl font-black tracking-tighter uppercase">editframe</span>
        </Link>
        <div className="max-md:hidden flex items-center gap-1">
          <LandingNavLink to="/skills">Docs</LandingNavLink>
          <LandingNavLink to="/pricing">Pricing</LandingNavLink>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isLoggedIn ? (
            <Link
              to="/welcome"
              className="px-5 py-2 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-blue)] transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <Link to="/auth/login" className="max-md:hidden inline-flex px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
              Sign in
            </Link>
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
            <LandingNavLink to="/skills" onClick={() => setMobileMenuOpen(false)}>
              Docs
            </LandingNavLink>
            <LandingNavLink to="/pricing" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </LandingNavLink>
            {!isLoggedIn && (
              <>
                <div className="border-t-2 border-[var(--ink-black)]/10 dark:border-white/10 mt-2 pt-2" />
                <LandingNavLink to="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign in
                </LandingNavLink>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
