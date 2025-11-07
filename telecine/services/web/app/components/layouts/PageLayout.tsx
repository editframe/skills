import { useTheme } from "~/hooks/useTheme";
import { themeClasses } from "~/utils/theme-classes";
import clsx from "clsx";
import type { PropsWithChildren } from "react";

interface PageLayoutProps {
  className?: string;
  containerClassName?: string;
}

/**
 * Base page layout component with consistent dark mode styling and theme initialization.
 * Provides the foundation for all page layouts with proper theme support.
 */
export function PageLayout({
  children,
  className = "",
  containerClassName = "",
}: PropsWithChildren<PageLayoutProps>) {
  useTheme();

  return (
    <div
      className={clsx(
        themeClasses.pageBg,
        themeClasses.pageText,
        themeClasses.pageSelection,
        "min-h-screen antialiased",
        className
      )}
    >
      {containerClassName ? (
        <div className={containerClassName}>{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

