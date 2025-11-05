import { Link, NavLink } from "react-router";
import clsx from "clsx";
import { useEffect, useState } from "react";

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
}: {
  isLoggedIn?: boolean;
  className?: string;
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  return (
    <header
      className={clsx(
        "z-1000 w-full transition-all duration-300 ease-in-out text-gray-800",
        className,
        {
          "bg-white border-b border-[#E2E2E3]": isScrolled,
        },
      )}
    >
      <div className="max-w-7xl mx-auto py-1 px-4 sm:px-6 lg:px-20">
        <div className="flex justify-between items-center h-12 py-6">
          <div className="flex-shrink-0">
            <Link className="flex items-center text-base font-semibold" to="/">
              <img
                className="mr-2 h-4 w-auto"
                src="/images/logo/dark.svg"
                alt="Editframe logo"
              />
              <span className="sm:block text-sm">Editframe</span>
            </Link>
          </div>
          <div className="lg:-ml-24 md:flex space-x-4">
            <nav className="flex space-x-4 text-sm font-medium items-center">
              {isLoggedIn ? (
                <Link
                  to="/welcome"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-[#646CFF] hover:bg-[#4b51ff] transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/auth/login"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-[#646CFF] hover:bg-[#4b51ff] transition-colors"
                >
                  Login
                </Link>
              )}
              {navigation.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `text-sm font-medium ${isActive
                      ? "text-[#646CFF]"
                      : "text-[#3c3c43] hover:text-gray-700"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="border-l border-gray-200 h-4" />
            <div className="flex space-x-2">
              <a
                href="https://x.com/editframe"
                aria-label="twitter"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 flex items-center hover:text-gray-700"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <mask
                    id="mask0_95_1445"
                    style={{ maskType: "alpha" }}
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="20"
                    height="20"
                  >
                    <g clipPath="url(#clip0_95_1445)">
                      <g clipPath="url(#clip1_95_1445)">
                        <path
                          d="M15.7508 0.960815H18.8175L12.1175 8.61915L20 19.0383H13.8283L8.995 12.7183L3.46333 19.0383H0.395L7.56167 10.8466L0 0.961649H6.32833L10.6975 6.73832L15.7508 0.960815ZM14.675 17.2033H16.3742L5.405 2.69998H3.58167L14.675 17.2033Z"
                          fill="black"
                        />
                      </g>
                    </g>
                  </mask>
                  <g mask="url(#mask0_95_1445)">
                    <rect
                      width="20"
                      height="20"
                      fill="currentColor"
                      fillOpacity="0.78"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_95_1445">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                    <clipPath id="clip1_95_1445">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </a>
              <a
                href="https://github.com/editframe"
                aria-label="github"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700"
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
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring--[#646CFF] "
            >
              <span className="sr-only">Open main menu</span>
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
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navigation.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${isActive
                    ? "text-[#646CFF]"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`
                }
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="mt-3 px-2 space-y-1">
              <a
                href="https://x.com/editframe"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                Twitter
              </a>
              <a
                href="https://github.com/editframe"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
