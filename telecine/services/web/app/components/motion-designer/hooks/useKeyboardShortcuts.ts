import { useEffect } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";

interface UseKeyboardShortcutsProps {
  state: MotionDesignerState;
  onDeleteElement: (id: string) => void;
  onSelectElement: (id: string | null) => void;
  onSetPlacementMode: (mode: string | null) => void;
}

export function useKeyboardShortcuts({
  state,
  onDeleteElement,
  onSelectElement,
  onSetPlacementMode,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Tool selection shortcuts (only when not typing in inputs)
      if (!isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            e.preventDefault();
            onSetPlacementMode(null);
            return;
          case "t":
            e.preventDefault();
            onSetPlacementMode(state.ui.placementMode === "text" ? null : "text");
            return;
          case "d":
            e.preventDefault();
            onSetPlacementMode(state.ui.placementMode === "div" ? null : "div");
            return;
          case "g":
            e.preventDefault();
            onSetPlacementMode(state.ui.placementMode === "timegroup" ? null : "timegroup");
            return;
          case "i":
            e.preventDefault();
            onSetPlacementMode(state.ui.placementMode === "image" ? null : "image");
            return;
          case "m":
            e.preventDefault();
            onSetPlacementMode(state.ui.placementMode === "video" ? null : "video");
            return;
          case "a":
            e.preventDefault();
            onSetPlacementMode(state.ui.placementMode === "audio" ? null : "audio");
            return;
          case "escape":
            e.preventDefault();
            onSetPlacementMode(null);
            return;
        }
      }

      // Delete element shortcuts
      if (e.key === "Delete" || e.key === "Backspace") {
        if (isInputFocused) {
          return;
        }

        if (state.ui.selectedElementId) {
          const selectedElement = state.composition.elements[state.ui.selectedElementId];
          if (selectedElement) {
            e.preventDefault();
            onDeleteElement(selectedElement.id);
            onSelectElement(null);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    state.ui.selectedElementId,
    state.ui.placementMode,
    state.composition.elements,
    onDeleteElement,
    onSelectElement,
    onSetPlacementMode,
  ]);
}

