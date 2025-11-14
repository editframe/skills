import { useEffect } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";

interface UseKeyboardShortcutsProps {
  state: MotionDesignerState;
  onDeleteElement: (id: string) => void;
  onSelectElement: (id: string | null) => void;
}

export function useKeyboardShortcuts({
  state,
  onDeleteElement,
  onSelectElement,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") {
        return;
      }

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.ui.selectedElementId, state.composition.elements, onDeleteElement, onSelectElement]);
}

