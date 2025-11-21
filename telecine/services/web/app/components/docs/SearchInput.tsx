import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import clsx from "clsx";
import { useSearch } from "~/hooks/useSearch";
import { useKeyboardShortcut } from "~/hooks/useKeyboardShortcut";
import { SearchResult } from "./SearchResult";
import "~/styles/search.css";

export function SearchInput() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { results, loading, error, search, isInitialized } = useSearch();

  // Cmd+K to focus search input
  useKeyboardShortcut({
    key: "k",
    metaKey: true,
    ctrlKey: true,
    onPress: (event) => {
      event.preventDefault();
      inputRef.current?.focus();
      setIsOpen(true);
    },
  });

  // Perform search when query changes
  useEffect(() => {
    if (isInitialized && query) {
      search(query);
    }
  }, [query, isInitialized, search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
        setSelectedIndex(0);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (results[selectedIndex]) {
          navigate(results[selectedIndex].slug);
          setIsOpen(false);
          setQuery("");
        } else if (query.trim()) {
          // Navigate to search results page if no result is selected
          navigate(`/docs/search?q=${encodeURIComponent(query)}`);
          setIsOpen(false);
          setQuery("");
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, results, selectedIndex, navigate]);

  // Scroll selected result into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0 && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex, results.length]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleInputFocus = () => {
    if (query && isInitialized) {
      setIsOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length > 0 && isInitialized);
  };

  const handleResultClick = () => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  };

  return (
    <div ref={containerRef} className="search-input-container">
      <div className="search-input-wrapper-inline">
        <svg
          className="search-icon-inline"
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
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder="Search docs..."
          className="search-input-inline"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        {!query && (
          <div className="search-shortcut-hint">
            <kbd className="search-kbd-inline">⌘</kbd>
            <kbd className="search-kbd-inline">K</kbd>
          </div>
        )}
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="search-clear-button-inline"
            aria-label="Clear search"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="search-dropdown-backdrop"
          onClick={() => {
            setIsOpen(false);
            setQuery("");
            inputRef.current?.blur();
          }}
          aria-hidden="true"
        />
      )}

      {/* Dropdown Results */}
      {isOpen && (
        <div className="search-dropdown">
          {loading && !isInitialized && (
            <div className="search-loading">
              <div className="search-loading-spinner" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Loading search index...
              </p>
            </div>
          )}

          {error && (
            <div className="search-error">
              <p className="text-xs text-red-600 dark:text-red-400">
                {error.message}
              </p>
            </div>
          )}

          {isInitialized && !loading && !query && (
            <div className="search-empty">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Start typing to search documentation
              </p>
            </div>
          )}

          {isInitialized && !loading && query && results.length === 0 && (
            <div className="search-empty">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No results found for &quot;{query}&quot;
              </p>
            </div>
          )}

          {isInitialized && !loading && query && results.length > 0 && (
            <>
              <div ref={resultsRef} className="search-results-dropdown">
                {results.map((result, index) => (
                  <SearchResult
                    key={result.id}
                    result={result}
                    query={query}
                    isSelected={index === selectedIndex}
                    onClick={handleResultClick}
                  />
                ))}
              </div>
              {query.trim() && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2">
                  <Link
                    to={`/docs/search?q=${encodeURIComponent(query)}`}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center"
                  >
                    View all results →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

