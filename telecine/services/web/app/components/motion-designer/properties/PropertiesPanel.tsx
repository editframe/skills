import { useState, useEffect } from "react";
import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { DesignTab } from "./DesignTab";
import { AnimateTab } from "./AnimateTab";
import { CSSTab } from "./CSSTab";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";

interface PropertiesPanelProps {
  state: MotionDesignerState;
}

export function PropertiesPanel({ state }: PropertiesPanelProps) {
  const actions = useMotionDesignerActions();
  const [activeTab, setActiveTab] = useState<"design" | "animate" | "css">("design");
  const selectedElement = state.ui.selectedElementId
    ? state.composition.elements[state.ui.selectedElementId]
    : null;

  // Switch to Animate tab when an animation is selected from timeline
  useEffect(() => {
    if (state.ui.selectedAnimationId) {
      setActiveTab("animate");
    }
  }, [state.ui.selectedAnimationId]);

  if (!selectedElement) {
    return (
      <div className="w-80 bg-gray-800 border-l border-gray-700 flex items-center justify-center text-gray-500">
        <p className="text-sm">No element selected</p>
      </div>
    );
  }

  const handleDelete = () => {
    if (selectedElement) {
      actions.deleteElement(selectedElement.id);
      actions.selectElement(null);
    }
  };

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700/50 flex flex-col">
      <div className="flex border-b border-gray-700/30 bg-gray-850">
        <button
          onClick={() => setActiveTab("design")}
          className={`flex-1 px-4 py-1.5 text-[11px] font-semibold transition-all tracking-tight ${
            activeTab === "design"
              ? "bg-gray-750 text-white border-b-2 border-blue-500/80"
              : "text-gray-400 hover:bg-gray-750/50 hover:text-gray-300"
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setActiveTab("animate")}
          className={`flex-1 px-4 py-1.5 text-[11px] font-semibold transition-all tracking-tight ${
            activeTab === "animate"
              ? "bg-gray-750 text-white border-b-2 border-blue-500/80"
              : "text-gray-400 hover:bg-gray-750/50 hover:text-gray-300"
          }`}
        >
          Animate
        </button>
        <button
          onClick={() => setActiveTab("css")}
          className={`flex-1 px-4 py-1.5 text-[11px] font-semibold transition-all tracking-tight ${
            activeTab === "css"
              ? "bg-gray-750 text-white border-b-2 border-blue-500/80"
              : "text-gray-400 hover:bg-gray-750/50 hover:text-gray-300"
          }`}
        >
          CSS
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {activeTab === "design" && (
          <DesignTab element={selectedElement} state={state} />
        )}
        {activeTab === "animate" && (
          <AnimateTab 
            element={selectedElement} 
            selectedAnimationId={state.ui.selectedAnimationId}
          />
        )}
        {activeTab === "css" && (
          <CSSTab element={selectedElement} />
        )}
      </div>
      <div className="border-t border-gray-700/30 p-2.5 bg-gray-850">
        <button
          onClick={handleDelete}
          className="w-full px-3 py-1.5 text-[11px] font-medium bg-red-600/80 hover:bg-red-600 rounded transition-colors text-white shadow-sm"
        >
          Delete Element
        </button>
      </div>
    </div>
  );
}

