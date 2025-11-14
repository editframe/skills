import React from "react";

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}

export function IconButton({ icon, onClick, active = false, disabled = false, title }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-5 h-5 flex items-center justify-center rounded-sm border transition-colors ${
        active
          ? "bg-blue-500/15 border-blue-500/50 text-blue-400"
          : "bg-gray-900/50 border-gray-700/30 text-gray-500 hover:bg-gray-800/50 hover:border-gray-600/50 hover:text-gray-400"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {icon}
    </button>
  );
}

