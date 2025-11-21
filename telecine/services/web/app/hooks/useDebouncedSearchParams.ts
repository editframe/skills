import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";

/**
 * Hook to handle debounced search parameter updates.
 * Fixes race condition issues when typing rapidly in search inputs.
 * Preserves cursor position by avoiding unnecessary re-renders.
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
  
  // Track the last URL value we synced from, to detect external changes
  const lastSyncedUrlValueRef = useRef(urlValue);
  
  // Track if we're updating the URL ourselves to avoid sync loops
  const isUpdatingRef = useRef(false);

  // Sync local value when URL changes from external sources (e.g., navigation, page load)
  // But skip if we're the ones updating it
  useEffect(() => {
    const currentUrlValue = searchParams.get(paramName) ?? "";
    
    // If we just updated the URL ourselves, mark it and skip syncing
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false;
      lastSyncedUrlValueRef.current = currentUrlValue;
      return;
    }
    
    // Only sync if URL changed externally (different from what we last synced)
    if (currentUrlValue !== lastSyncedUrlValueRef.current) {
      lastSyncedUrlValueRef.current = currentUrlValue;
      setLocalValue(currentUrlValue);
    }
  }, [searchParams, paramName]);

  // Debounced effect to update search params
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentUrlValue = searchParams.get(paramName) ?? "";

      // Only update if the value has actually changed
      if (localValue !== currentUrlValue) {
        isUpdatingRef.current = true;
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