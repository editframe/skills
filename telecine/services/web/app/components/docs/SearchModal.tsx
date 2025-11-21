import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import { useSearch } from "~/hooks/useSearch";
import { SearchResult } from "./SearchResult";
import "~/styles/search.css";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { results, loading, error, search, isInitialized } = useSearch();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Reset query and selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Perform search when query changes (debounced in hook)
  useEffect(() => {
    if (isInitialized) {
      search(query);
    }
  }, [query, isInitialized, search]);

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
      } else if (event.key === "Enter" && results[selectedIndex]) {
        event.preventDefault();
        navigate(results[selectedIndex].slug);
        onClose();
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, results, selectedIndex, navigate, onClose]);

  // Scroll selected result into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex]);


  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="search-modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="search-modal" role="dialog" aria-modal="true" aria-label="Search documentation">
        <div className="search-modal-content">
          {/* Search Input */}
          <div className="search-input-wrapper">
            <svg
              className="search-icon"
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documentation..."
              className="search-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="search-clear-button"
                aria-label="Clear search"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Results */}
          <div className="search-results-container">
            {loading && !isInitialized && (
              <div className="search-loading">
                <div className="search-loading-spinner" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading search index...
                </p>
              </div>
            )}

            {error && (
              <div className="search-error">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error.message}
                </p>
              </div>
            )}

            {isInitialized && !loading && query && results.length === 0 && (
              <div className="search-empty">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No results found for &quot;{query}&quot;
                </p>
              </div>
            )}

            {isInitialized && !loading && !query && (
              <div className="search-empty">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Start typing to search documentation
                </p>
              </div>
            )}

            {isInitialized && !loading && results.length > 0 && (
              <div ref={resultsRef} className="search-results">
                {results.map((result, index) => (
                  <SearchResult
                    key={result.id}
                    result={result}
                    query={query}
                    isSelected={index === selectedIndex}
                    onClick={onClose}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer with keyboard shortcuts */}
          <div className="search-footer">
            <div className="search-shortcuts">
              <kbd className="search-kbd">↑↓</kbd>
              <span className="text-xs text-gray-500 dark:text-gray-400">Navigate</span>
              <kbd className="search-kbd">↵</kbd>
              <span className="text-xs text-gray-500 dark:text-gray-400">Select</span>
              <kbd className="search-kbd">Esc</kbd>
              <span className="text-xs text-gray-500 dark:text-gray-400">Close</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

