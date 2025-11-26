import React from "react";
import type { ElementNode } from "~/lib/motion-designer/types";
import { Trash, Copy, Files } from "@phosphor-icons/react";

interface ElementContextMenuProps {
  element: ElementNode;
  x: number;
  y: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onClose: () => void;
}

export function ElementContextMenu({
  element,
  x,
  y,
  onDelete,
  onDuplicate,
  onCopy,
  onClose,
}: ElementContextMenuProps) {
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
      className="fixed bg-gray-800 border border-gray-700 rounded shadow-lg py-1 z-50 min-w-[160px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        onClick={() => {
          onCopy();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
      >
        <Copy size={14} />
        <span>Copy</span>
      </button>
      <button
        onClick={() => {
          onDuplicate();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
      >
        <Files size={14} />
        <span>Duplicate</span>
      </button>
      <div className="h-px bg-gray-700 my-1" />
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
      >
        <Trash size={14} />
        <span>Delete</span>
      </button>
    </div>
  );
}
