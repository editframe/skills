import { useEffect } from "react";

export interface UseKeyboardShortcutOptions {
  key: string;
  metaKey?: boolean; // Cmd on Mac, Ctrl on Windows/Linux
  ctrlKey?: boolean; // Ctrl key
  shiftKey?: boolean;
  altKey?: boolean;
  onPress: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

/**
 * React hook for keyboard shortcut detection
 * Handles Cmd+K (Mac) and Ctrl+K (Windows/Linux) patterns
 */
export function useKeyboardShortcut({
  key,
  metaKey = false,
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  onPress,
  preventDefault = true,
}: UseKeyboardShortcutOptions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Check if the main key matches
      if (event.key !== key && event.code !== key) {
        return;
      }

      // For Cmd+K / Ctrl+K pattern, accept either metaKey (Mac) or ctrlKey (Windows/Linux)
      // When both metaKey and ctrlKey are true in options, we want to match either modifier
      if (key === "k" && (metaKey || ctrlKey)) {
        const modifierPressed = event.metaKey || event.ctrlKey;
        const shiftMatch = shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = altKey ? event.altKey : !event.altKey;

        if (modifierPressed && shiftMatch && altMatch) {
          if (preventDefault) {
            event.preventDefault();
          }
          onPress(event);
          return;
        }
      }

      // Standard pattern matching for other shortcuts
      const metaMatch = metaKey ? event.metaKey : !event.metaKey;
      const ctrlMatch = ctrlKey ? event.ctrlKey : !event.ctrlKey;
      const shiftMatch = shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatch = altKey ? event.altKey : !event.altKey;

      if (metaMatch && ctrlMatch && shiftMatch && altMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        onPress(event);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [key, metaKey, ctrlKey, shiftKey, altKey, onPress, preventDefault]);
}
