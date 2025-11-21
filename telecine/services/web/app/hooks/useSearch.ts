import { useState, useEffect, useCallback, useMemo } from "react";
import {
  initializeSearch,
  search,
  isSearchInitialized,
  type SearchResult,
} from "~/utils/search.client";

export interface UseSearchReturn {
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
  search: (query: string) => void;
  isInitialized: boolean;
}

/**
 * React hook for documentation search functionality
 * Lazy loads search index on first use
 */
export function useSearch(): UseSearchReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  // Initialize search index on first use
  useEffect(() => {
    if (isSearchInitialized()) {
      setIsInitialized(true);
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        setLoading(true);
        setError(null);
        await initializeSearch();
        if (!cancelled) {
          setIsInitialized(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to initialize search"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Perform search when query changes
  useEffect(() => {
    if (!isInitialized || !query.trim()) {
      setResults([]);
      return;
    }

    try {
      const searchResults = search(query);
      setResults(searchResults);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Search failed"));
      setResults([]);
    }
  }, [query, isInitialized]);

  const performSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  return {
    results,
    loading,
    error,
    search: performSearch,
    isInitialized,
  };
}

