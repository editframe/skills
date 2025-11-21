import type { FC } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import type { PropertyDefinition } from "./video-properties";

export type { PropertyDefinition };

interface PropertyReferenceTableProps {
  properties: PropertyDefinition[];
  elementName?: string;
  className?: string;
}

export const PropertyReferenceTable: FC<PropertyReferenceTableProps> = ({
  properties,
  elementName = "video",
  className,
}) => {
  return (
    <div className={clsx("overflow-x-auto my-6", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700 dark:text-slate-300">
              Property
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700 dark:text-slate-300">
              Type
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700 dark:text-slate-300">
              R/W
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700 dark:text-slate-300">
              Primary Use Case
            </th>
          </tr>
        </thead>
        <tbody>
          {properties.map((prop) => (
            <tr
              key={prop.name}
              className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <td className="py-3 px-4">
                <Link
                  to={`#attr-${prop.name}`}
                  className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {prop.name}
                </Link>
              </td>
              <td className="py-3 px-4">
                <code className="font-mono text-xs text-slate-600 dark:text-slate-400">
                  {prop.type}
                </code>
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {prop.access}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                {prop.useCase}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export function getPropertyAnchor(name: string): string {
  return `#attr-${name}`;
}

export function getPropertyLink(
  name: string,
  elementPath: string = "video"
): string {
  return `/docs/elements/${elementPath}/reference${getPropertyAnchor(name)}`;
}

