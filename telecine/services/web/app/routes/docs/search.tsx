import type { MetaFunction } from "react-router";
import { useSearchParams } from "react-router";
import { Header } from "~/components/marketing/Header";
import { Footer } from "~/components/Footer";
import { SearchResult } from "~/components/docs/SearchResult";
import { useSearch } from "~/hooks/useSearch";
import { useEffect, useLayoutEffect, useRef } from "react";
import clsx from "clsx";
import { themeClasses } from "~/utils/theme-classes";

export const meta: MetaFunction = () => {
  return [
    { title: "Search Documentation - Editframe" },
    { name: "description", content: "Search Editframe documentation" },
  ];
};

export default function DocsSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading, error, search, isInitialized } = useSearch();

  // Sync input value from URL on mount or external navigation (but not during typing)
  useEffect(() => {
    const input = inputRef.current;
    if (input && input.value !== query && document.activeElement !== input) {
      // Only sync if input is not focused (external navigation)
      input.value = query;
    }
  }, [query]);

  // Perform search when query changes
  useEffect(() => {
    if (isInitialized && query) {
      search(query);
    }
  }, [query, isInitialized, search]);

  return (
    <div className={clsx("min-h-screen flex flex-col", themeClasses.pageBg)}>
      <Header className="bg-background" hideMobileMenu={true} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Search Documentation</h1>
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              defaultValue={query}
              onChange={(e) => {
                // Update URL params immediately (one-way data flow)
                // Input manages its own cursor position naturally
                setSearchParams({ q: e.target.value }, { preventScrollReset: true });
              }}
              placeholder="Search documentation..."
              className={clsx(
                "w-full pl-12 pr-4 py-3 text-lg rounded-lg border",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                themeClasses.pageBg,
                themeClasses.pageBorder,
                themeClasses.pageText
              )}
              autoFocus
            />
          </div>
        </div>

        {loading && !isInitialized && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading search index...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error.message}</p>
          </div>
        )}

        {isInitialized && !loading && query && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              No results found for &quot;{query}&quot;
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Try different keywords or check your spelling
            </p>
          </div>
        )}

        {isInitialized && !loading && !query && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Enter a search query to find documentation
            </p>
          </div>
        )}

        {isInitialized && !loading && results.length > 0 && (
          <div>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Found {results.length} result{results.length !== 1 ? "s" : ""}
            </div>
            <div className="space-y-2">
              {results.map((result) => (
                <SearchResult
                  key={result.id}
                  result={result}
                  query={query}
                  onClick={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

