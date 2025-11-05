import { BellAlertIcon } from "@heroicons/react/24/outline";
import type { PropsWithChildren } from "react";

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
    <div className="p-4 flex gap-2 items-start">
      <BellAlertIcon className="size-6 text-gray-400 fill-gray-300 mt-1" aria-hidden />
      <div>
        <p className="text-lg font-medium mb-2">
          No {prettyText(resourceLabel)} records found matching filters
        </p>
        {children}
      </div>
    </div>
  );
};
