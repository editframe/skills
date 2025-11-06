import { useEffect } from "react";
import { useLocation } from "react-router";
import clsx from "clsx";
import type { DocsMenuItem } from "~/utils/fs.server";
import { Menu } from "./Menu";

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  menu: DocsMenuItem[];
}

export function MobileMenuDrawer({
  isOpen,
  onClose,
  menu,
}: MobileMenuDrawerProps) {
  const location = useLocation();

  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.key]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[1002] bg-black/50 transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-[1003] w-80 max-w-[85vw] transform bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-gray-900 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Documentation</h2>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
              aria-label="Close menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <Menu menu={menu} className="pb-20" />
          </div>
        </div>
      </div>
    </>
  );
}
