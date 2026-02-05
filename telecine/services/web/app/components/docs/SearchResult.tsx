import { Link } from "react-router";
import clsx from "clsx";
import type { SearchResult as SearchResultType } from "~/utils/search.client";

interface SearchResultProps {
  result: SearchResultType;
  query: string;
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * Highlights matching text in a string
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  // Escape special regex characters in query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return (
        <mark
          key={index}
          className="bg-[var(--accent-gold)]/20 text-[var(--ink-black)] dark:text-white px-0.5"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

/**
 * Truncates text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim() + "…";
}

/**
 * Gets a snippet of content around the first match
 */
function getContentSnippet(content: string, query: string, maxLength: number = 150): string {
  if (!query.trim()) {
    return truncateText(content, maxLength);
  }

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return truncateText(content, maxLength);
  }

  // Get context around the match
  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(content.length, matchIndex + query.length + 50);
  let snippet = content.slice(start, end);

  // Add ellipsis if not at start/end
  if (start > 0) {
    snippet = "…" + snippet;
  }
  if (end < content.length) {
    snippet = snippet + "…";
  }

  return snippet;
}

export function SearchResult({
  result,
  query,
  isSelected = false,
  onClick,
}: SearchResultProps) {
  const descriptionSnippet = result.description
    ? truncateText(result.description, 120)
    : getContentSnippet(result.content, query, 120);

  return (
    <Link
      to={result.slug}
      onClick={onClick}
      className={clsx(
        "block search-result-item transition-colors",
        "hover:bg-[var(--accent-blue)]/5",
        isSelected && "bg-[var(--accent-blue)]/5 border-l-2 border-[var(--accent-blue)]",
        "focus:outline-none"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-[var(--ink-black)] dark:text-white">
              {highlightText(result.title, query)}
            </h3>
            {result.category && (
              <span className="text-xs px-2 py-0.5 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-semibold">
                {result.category}
              </span>
            )}
          </div>
          {descriptionSnippet && (
            <p className="text-xs text-[var(--warm-gray)] line-clamp-2">
              {highlightText(descriptionSnippet, query)}
            </p>
          )}
          {result.headings.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {result.headings.slice(0, 2).map((heading, index) => (
                <span
                  key={index}
                  className="text-xs text-[var(--warm-gray)]/70"
                >
                  {heading}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-[var(--warm-gray)]">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}

