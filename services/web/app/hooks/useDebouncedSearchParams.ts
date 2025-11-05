import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";

/**
 * Hook to handle debounced search parameter updates.
 * Fixes race condition issues when typing rapidly in search inputs.
 * 
 * @param paramName - The search param key to manage
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns [localValue, setLocalValue] - Local state for the input value and setter
 */
export function useDebouncedSearchParams(paramName: string, debounceMs = 300) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial value from search params
  const urlValue = searchParams.get(paramName) ?? "";

  // Local state for immediate UI updates
  const [localValue, setLocalValue] = useState(urlValue);

  // Sync local value when URL changes (e.g., navigation, page load)
  useEffect(() => {
    const currentUrlValue = searchParams.get(paramName) ?? "";
    if (currentUrlValue !== localValue) {
      setLocalValue(currentUrlValue);
    }
  }, [searchParams, paramName]);

  // Debounced effect to update search params
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentUrlValue = searchParams.get(paramName) ?? "";

      // Only update if the value has actually changed
      if (localValue !== currentUrlValue) {
        setSearchParams(
          {
            ...Object.fromEntries(searchParams.entries()),
            [paramName]: localValue,
            page: "0", // Reset to first page when searching
          },
          { preventScrollReset: true }
        );
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [localValue, searchParams, setSearchParams, paramName, debounceMs]);

  return [localValue, setLocalValue] as const;
} 