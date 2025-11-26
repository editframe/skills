import { useState, useEffect } from "react";

interface ExternalScriptLoader {
  loaded: boolean;
  error: string | null;
}

interface ScriptState {
  loaded: boolean;
  error: string | null;
  element: HTMLScriptElement | null;
  callbacks: Set<(state: ScriptState) => void>;
}

// Global registry to track scripts by URL
const scriptRegistry = new Map<string, ScriptState>();

/**
 * Hook to load external scripts with deduplication and error handling.
 * Multiple components can use the same script URL and share the loading state.
 *
 * @param src - The script URL to load
 * @returns {loaded: boolean, error: string | null} - Loading state and any error
 */
export function useExternalScript(src: string): ExternalScriptLoader {
  const [state, setState] = useState<ExternalScriptLoader>(() => {
    const existingState = scriptRegistry.get(src);
    return {
      loaded: existingState?.loaded ?? false,
      error: existingState?.error ?? null,
    };
  });

  useEffect(() => {
    // Check if we already have this script in the registry
    let scriptState = scriptRegistry.get(src);

    if (!scriptState) {
      // Create new script state
      scriptState = {
        loaded: false,
        error: null,
        element: null,
        callbacks: new Set(),
      };
      scriptRegistry.set(src, scriptState);

      // Check if script already exists in DOM (loaded by another method)
      const existingScript = document.querySelector(
        `script[src="${src}"]`,
      ) as HTMLScriptElement;

      if (existingScript) {
        scriptState.loaded = true;
        scriptState.element = existingScript;
      } else {
        // Create and append new script
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        scriptState.element = script;

        const handleLoad = () => {
          scriptState!.loaded = true;
          // Notify all subscribers
          scriptState!.callbacks.forEach((callback) => callback(scriptState!));
        };

        const handleError = () => {
          scriptState!.error = `Failed to load script: ${src}`;
          // Notify all subscribers
          scriptState!.callbacks.forEach((callback) => callback(scriptState!));
        };

        script.addEventListener("load", handleLoad);
        script.addEventListener("error", handleError);

        document.head.appendChild(script);
      }
    }

    // Subscribe to state changes for this script
    const callback = (newState: ScriptState) => {
      setState({
        loaded: newState.loaded,
        error: newState.error,
      });
    };

    scriptState.callbacks.add(callback);

    // Set initial state if already loaded
    if (scriptState.loaded || scriptState.error) {
      setState({
        loaded: scriptState.loaded,
        error: scriptState.error,
      });
    }

    return () => {
      // Unsubscribe from state changes
      scriptState?.callbacks.delete(callback);
    };
  }, [src]);

  return state;
}
