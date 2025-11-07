import { Bell } from "@phosphor-icons/react";
import type { PropsWithChildren } from "react";
import clsx from "clsx";

const prettyText = (text: string) => {
  return text.replace(/_/g, " ");
};

interface EmptyResultProps {
  resourceLabel: string;
}
export const EmptyResult = ({
  resourceLabel,
  children,
}: PropsWithChildren<EmptyResultProps>) => {
  return (
    <div className="p-6 flex gap-3 items-start">
      <Bell className={clsx(
        "h-6 w-6 flex-shrink-0 mt-0.5 transition-colors",
        "text-slate-500 dark:text-slate-400"
      )} weight="regular" aria-hidden />
      <div>
        <p className={clsx(
          "text-sm font-medium mb-1.5 transition-colors",
          "text-slate-700 dark:text-slate-300"
        )}>
          No {prettyText(resourceLabel)} records found matching filters
        </p>
        {children}
      </div>
    </div>
  );
};
