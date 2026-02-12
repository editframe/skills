import { Link, NavLink, useLocation } from "react-router";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { ThemeToggle } from "~/components/ThemeToggle";

const navigation = [
  // {
  //   to: "/blog",
  //   label: "Blog",
  // },
  {
    to: "/skills",
    label: "Documentation",
  },
  // {
  //   to: "/guides",
  //   label: "Guides",
  // },
  // {
  //   to: "/tools",
  //   label: "Tools",
  // },
  // {
  //   to: "/playground",
  //   label: "Playground",
  // },
];

export const Header = ({
  isLoggedIn,
  className,
  hideMobileMenu,
}: {
  isLoggedIn?: boolean;
  className?: string;
  hideMobileMenu?: boolean;
}) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isDocsPage = location.pathname.startsWith("/skills");

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <header
      className={clsx(
        "z-1000 w-full border-b-2 border-[var(--ink-black)] dark:border-white bg-[var(--paper-white)] dark:bg-[#0a0a0a]",
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link
              className="flex items-center text-[var(--ink-black)] dark:text-white"
              to="/"
            >
              <img
                className="mr-2 h-5 sm:h-6 w-auto dark:invert"
                src="/images/logo/dark.svg"
                alt="Editframe logo"
              />
              <span className="hidden sm:block text-base font-bold tracking-tight">
                Editframe
              </span>
            </Link>
          </div>
          <div
            className={`hidden lg:-ml-24 ${hideMobileMenu ? "lg:flex" : "md:flex"} items-center gap-1`}
          >
            <nav className="flex items-center gap-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      "px-4 py-2 text-sm font-bold tracking-wider transition-colors",
                      isActive
                        ? "text-[var(--ink-black)] dark:text-white bg-[var(--accent-blue)]/10"
                        : "text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white hover:bg-[var(--accent-gold)]/20",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {isLoggedIn ? (
                <Link
                  to="/welcome"
                  className="inline-flex items-center px-4 py-2 text-sm font-bold text-white bg-[var(--ink-black)] dark:bg-white dark:text-[var(--ink-black)] hover:bg-[var(--accent-blue)] dark:hover:bg-[var(--accent-blue)] dark:hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/auth/login"
                  className="inline-flex items-center px-4 py-2 text-sm font-bold text-white bg-[var(--ink-black)] dark:bg-white dark:text-[var(--ink-black)] hover:bg-[var(--accent-blue)] dark:hover:bg-[var(--accent-blue)] dark:hover:text-white transition-colors"
                >
                  Login
                </Link>
              )}
            </nav>
            <div className="w-px h-5 bg-[var(--ink-black)]/20 dark:bg-white/20 mx-2" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <a
                href="https://x.com/editframe"
                aria-label="x"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
                </svg>
              </a>
              <a
                href="https://github.com/editframe"
                aria-label="github"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors"
              >
                <svg
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
          {!hideMobileMenu && (
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white hover:bg-[var(--accent-gold)]/20 transition-colors"
                aria-label="Open main menu"
              >
                {isMenuOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      {isMenuOpen && !hideMobileMenu && (
        <div className="md:hidden border-t-2 border-[var(--ink-black)] dark:border-white bg-[var(--paper-white)] dark:bg-[#0a0a0a]">
          <div className="px-4 pt-4 pb-3 space-y-1">
            {isLoggedIn ? (
              <Link
                to="/welcome"
                className="block w-full text-center px-4 py-3 text-sm font-bold text-white bg-[var(--ink-black)] dark:bg-white dark:text-[var(--ink-black)] hover:bg-[var(--accent-blue)] transition-colors mb-3"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/auth/login"
                className="block w-full text-center px-4 py-3 text-sm font-bold text-white bg-[var(--ink-black)] dark:bg-white dark:text-[var(--ink-black)] hover:bg-[var(--accent-blue)] transition-colors mb-3"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
            )}
            {navigation.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "block px-3 py-3 text-base font-bold transition-colors border-l-2",
                    isActive
                      ? "text-[var(--ink-black)] dark:text-white border-[var(--accent-blue)] bg-[var(--accent-blue)]/5"
                      : "text-[var(--warm-gray)] border-transparent hover:text-[var(--ink-black)] dark:hover:text-white hover:border-[var(--ink-black)]/20",
                  )
                }
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="pt-4 pb-4 border-t-2 border-[var(--ink-black)]/10 dark:border-white/10">
            <div className="px-4 space-y-1">
              <div className="flex items-center px-3 py-3">
                <ThemeToggle />
                <span className="ml-3 text-base font-medium text-[var(--warm-gray)]">
                  Theme
                </span>
              </div>
              <a
                href="https://x.com/editframe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-3 text-base font-medium text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg
                  className="h-5 w-5 mr-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
                </svg>
                X
              </a>
              <a
                href="https://github.com/editframe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-3 text-base font-medium text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 mr-3"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
