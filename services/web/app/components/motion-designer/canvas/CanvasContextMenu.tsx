import React from "react";
import { ELEMENT_TYPES } from "~/lib/motion-designer/elementTypes";

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onSelectTool: (tool: string | null) => void;
  onClose: () => void;
}

export function CanvasContextMenu({
  x,
  y,
  onSelectTool,
  onClose,
}: CanvasContextMenuProps) {
  React.useEffect(() => {
    const handleClickOutside = () => {
      onClose();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Small delay to prevent immediate close from the right-click event
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
      window.addEventListener("keydown", handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed bg-gray-800 border border-gray-700 rounded shadow-lg py-1 z-50 min-w-[180px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Create Element
      </div>
      <div className="h-px bg-gray-700 my-1" />
      {ELEMENT_TYPES.map(({ type, icon: IconComponent, label, shortcut }) => (
        <button
          key={type}
          onClick={() => {
            onSelectTool(type);
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
        >
          <IconComponent size={14} />
          <span className="flex-1">{label}</span>
          <span className="text-xs text-gray-500">{shortcut}</span>
        </button>
      ))}
    </div>
  );
}
