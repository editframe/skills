import type { ReactNode } from "react";
import clsx from "clsx";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveContainer({
  children,
  className,
}: ResponsiveContainerProps) {
  return (
    <div
      className={clsx("px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6", className)}
    >
      {children}
    </div>
  );
}
