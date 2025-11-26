import { Link, NavLink, useLocation } from "react-router";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { ThemeToggle } from "~/components/ThemeToggle";
import { themeClasses } from "~/utils/theme-classes";
import { SearchInput } from "~/components/docs/SearchInput";

const navigation = [
  // {
  //   to: "/blog",
  //   label: "Blog",
  // },
  {
    to: "/docs",
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isDocsPage = location.pathname.startsWith("/docs");

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 10);
    }
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

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
        "z-1000 w-full transition-all duration-300 ease-in-out",
        themeClasses.pageText,
        className,
        {
          [clsx(themeClasses.pageBg, themeClasses.pageBorder, "border-b")]:
            isScrolled,
        },
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
        <div className="flex justify-between items-center min-h-[64px] py-3">
          <div className="flex-shrink-0 flex items-center">
            <Link
              className={clsx(
                "flex items-center text-base font-semibold",
                themeClasses.pageText,
              )}
              to="/"
            >
              <img
                className="mr-2 h-5 sm:h-6 w-auto dark:invert"
                src="/images/logo/dark.svg"
                alt="Editframe logo"
              />
              <span className="hidden sm:block text-sm sm:text-base">
                Editframe
              </span>
            </Link>
          </div>
          <div
            className={`hidden lg:-ml-24 ${hideMobileMenu ? "lg:flex" : "md:flex"} items-center space-x-4`}
          >
            <nav className="flex space-x-4 text-sm font-medium items-center">
              {/* Search Input - only show on docs pages */}
              {isDocsPage && <SearchInput />}
              {isLoggedIn ? (
                <Link
                  to="/welcome"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/auth/login"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
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
                      "text-sm font-medium",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : clsx(
                            themeClasses.pageTextSecondary,
                            "hover:text-slate-900 dark:hover:text-white",
                          ),
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className={clsx("border-l h-4", themeClasses.pageBorder)} />
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <a
                href="https://x.com/editframe"
                aria-label="x"
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  "flex items-center transition-colors",
                  themeClasses.pageTextMuted,
                  "hover:text-slate-700 dark:hover:text-slate-200",
                )}
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
                className={clsx(
                  "transition-colors",
                  themeClasses.pageTextMuted,
                  "hover:text-slate-700 dark:hover:text-slate-200",
                )}
              >
                <svg
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
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
                className={clsx(
                  "inline-flex items-center justify-center p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:focus:ring-blue-400",
                  themeClasses.pageTextSecondary,
                  "hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
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
        <div
          className={clsx(
            "md:hidden border-t",
            themeClasses.pageBg,
            themeClasses.pageBorder,
          )}
        >
          <div className="px-4 pt-4 pb-3 space-y-1">
            {isLoggedIn ? (
              <Link
                to="/welcome"
                className="block w-full text-center px-4 py-2.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors mb-3"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/auth/login"
                className="block w-full text-center px-4 py-2.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors mb-3"
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
                    "block px-3 py-2.5 rounded-md text-base font-medium transition-colors",
                    isActive
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"
                      : clsx(
                          themeClasses.pageTextSecondary,
                          "hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800",
                        ),
                  )
                }
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className={clsx("pt-4 pb-4 border-t", themeClasses.pageBorder)}>
            <div className="px-4 space-y-1">
              <div className="flex items-center px-3 py-2.5">
                <ThemeToggle className="text-slate-700 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800" />
                <span
                  className={clsx(
                    "ml-3 text-base font-medium",
                    themeClasses.pageTextSecondary,
                  )}
                >
                  Theme
                </span>
              </div>
              <a
                href="https://x.com/editframe"
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  "flex items-center px-3 py-2.5 rounded-md text-base font-medium transition-colors",
                  themeClasses.pageTextSecondary,
                  "hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
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
                className={clsx(
                  "flex items-center px-3 py-2.5 rounded-md text-base font-medium transition-colors",
                  themeClasses.pageTextSecondary,
                  "hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
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
