import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { ThemeToggle } from "~/components/ThemeToggle";
import { LandingNavLink } from "./LandingNavLink";

const WITH_ROUTES = [
  { name: "Anime.js", href: "/with/animejs" },
  { name: "SVG SMIL", href: "/with/svg" },
];

function readLoggedInCookie(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith("_logged_in=1"));
}

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const integrationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoggedIn(readLoggedInCookie());
  }, []);

  useEffect(() => {
    if (!integrationsOpen) return;
    const handler = (e: MouseEvent) => {
      if (integrationsRef.current && !integrationsRef.current.contains(e.target as Node)) {
        setIntegrationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [integrationsOpen]);

  return (
    <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-[var(--paper-cream)] border-b-2 border-[var(--ink-black)] dark:border-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center">
          <span className="text-xl font-black tracking-tighter uppercase">editframe</span>
        </Link>
        <div className="hidden md:flex items-center gap-1">
          <LandingNavLink to="/skills">Docs & Skills</LandingNavLink>
          <LandingNavLink to="/pricing">Pricing</LandingNavLink>
          <div ref={integrationsRef} className="relative">
            <button
              onClick={() => setIntegrationsOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={integrationsOpen}
              className="px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors flex items-center gap-1"
            >
              Integrations
              <span className="text-[10px] leading-none" aria-hidden="true">{integrationsOpen ? "▲" : "▼"}</span>
            </button>
            {integrationsOpen && (
              <div className="absolute top-full left-0 mt-0 bg-[var(--paper-cream)] border-2 border-t-0 border-[var(--ink-black)] dark:border-white min-w-[160px] z-50">
                {WITH_ROUTES.map((route) => (
                  <Link
                    key={route.href}
                    to={route.href}
                    onClick={() => setIntegrationsOpen(false)}
                    className="block px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors"
                  >
                    {route.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
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
            <>
              <Link to="/auth/login" className="hidden md:inline-flex px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors">
                Sign in
              </Link>
              <Link
                to="/auth/register"
                className="hidden md:inline-flex px-5 py-2 bg-[var(--poster-red)] text-white text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-blue)] transition-colors"
              >
                Get Early Access
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
            <LandingNavLink to="/skills" onClick={() => setMobileMenuOpen(false)}>
              Docs & Skills
            </LandingNavLink>
            <LandingNavLink to="/pricing" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </LandingNavLink>
            <div className="border-t-2 border-[var(--ink-black)]/10 dark:border-white/10 mt-2 pt-2" />
            <p className="px-4 text-xs font-bold uppercase tracking-widest text-[var(--warm-gray)]">Integrations</p>
            {WITH_ROUTES.map((route) => (
              <LandingNavLink key={route.href} to={route.href} onClick={() => setMobileMenuOpen(false)}>
                {route.name}
              </LandingNavLink>
            ))}
            {!isLoggedIn && (
              <>
                <div className="border-t-2 border-[var(--ink-black)]/10 dark:border-white/10 mt-2 pt-2" />
                <LandingNavLink to="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign in
                </LandingNavLink>
                <Link
                  to="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 bg-[var(--poster-red)] text-white text-sm font-bold uppercase tracking-wider text-center hover:bg-[var(--poster-blue)] transition-colors"
                >
                  Get Early Access
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
