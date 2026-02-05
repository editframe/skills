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
  elementName: _elementName = "video",
  className,
}) => {
  return (
    <div className={clsx("overflow-x-auto my-6", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-[var(--ink-black)] dark:border-white">
            <th className="text-left py-3 px-4 font-bold text-sm text-[var(--ink-black)] dark:text-white uppercase tracking-wider">
              Property
            </th>
            <th className="text-left py-3 px-4 font-bold text-sm text-[var(--ink-black)] dark:text-white uppercase tracking-wider">
              Type
            </th>
            <th className="text-left py-3 px-4 font-bold text-sm text-[var(--ink-black)] dark:text-white uppercase tracking-wider">
              R/W
            </th>
            <th className="text-left py-3 px-4 font-bold text-sm text-[var(--ink-black)] dark:text-white uppercase tracking-wider">
              Primary Use Case
            </th>
          </tr>
        </thead>
        <tbody>
          {properties.map((prop) => (
            <tr
              key={prop.name}
              className="border-b border-[var(--ink-black)]/10 dark:border-white/10 hover:bg-[var(--accent-blue)]/5 transition-colors"
            >
              <td className="py-3 px-4">
                <Link
                  to={`#attr-${prop.name}`}
                  className="font-mono text-sm font-semibold text-[var(--accent-blue)] hover:text-[var(--accent-red)] transition-colors"
                >
                  {prop.name}
                </Link>
              </td>
              <td className="py-3 px-4">
                <code className="font-mono text-xs text-[var(--warm-gray)]">
                  {prop.type}
                </code>
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
                  {prop.access}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-[var(--warm-gray)]">
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

