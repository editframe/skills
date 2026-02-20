import { usePageHeadings } from "~/hooks/usePageHeadings";

export function TocList({
  activeId,
  headings,
  onNavigate,
}: {
  activeId: string;
  headings: { id: string; text: string; level: number }[];
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-2 text-sm border-l-2 border-gray-200 dark:border-gray-700">
      {headings.map((heading) => (
        <li
          key={heading.id}
          style={{ paddingLeft: heading.level === 3 ? "1rem" : "0.5rem" }}
        >
          <a
            href={`#${heading.id}`}
            onClick={onNavigate}
            className={`block py-0.5 transition-colors ${
              activeId === heading.id
                ? "text-blue-600 dark:text-blue-400 font-medium border-l-2 border-blue-600 dark:border-blue-400 -ml-[2px] pl-[calc(0.5rem-2px)]"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            style={{
              paddingLeft:
                activeId === heading.id
                  ? heading.level === 3
                    ? "calc(1rem - 2px)"
                    : "calc(0.5rem - 2px)"
                  : undefined,
            }}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function OnThisPage() {
  const { headings, activeId } = usePageHeadings();

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-10 hidden xl:block w-56 flex-shrink-0 pl-8">
      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
        On This Page
      </div>
      <TocList headings={headings} activeId={activeId} />
    </nav>
  );
}
