import React from "react";
import { useMotionDesigner } from "~/lib/motion-designer/store";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import { HierarchyPanel } from "./hierarchy/HierarchyPanel";
import { Canvas } from "./canvas/Canvas";
import { PropertiesPanel } from "./properties/PropertiesPanel";
import { Timeline } from "./timeline/Timeline";
import { TopBar } from "./TopBar";
import { HelpButton } from "./HelpButton";
import { MotionDesignerProvider } from "./context/MotionDesignerContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useTimeSync } from "./hooks/useTimeSync";
import { useBodyScrollLock } from "./hooks/useBodyScrollLock";
import { useInitialization } from "./hooks/useInitialization";

export function MotionDesigner() {
  const [state, actions, { isHydrated }] = useMotionDesigner();
  const isScrubbingRef = React.useRef(false);

  useKeyboardShortcuts({
    state,
    onDeleteElement: actions.deleteElement,
    onSelectElement: actions.selectElement,
  });

  useTimeSync({
    activeRootTimegroupId: getActiveRootTimegroupId(state),
    currentTime: state.ui.currentTime,
    onSetCurrentTime: actions.setCurrentTime,
    isScrubbingRef,
    state,
  });

  useBodyScrollLock();

  useInitialization({
    isHydrated,
    state,
    onAddElement: actions.addElement,
  });

  return (
    <MotionDesignerProvider actions={actions}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Hide number input spinners for cleaner look */
          input[type="number"]::-webkit-inner-spin-button,
          input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
            appearance: textfield;
          }
          
          /* Range slider styling */
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgb(96 165 250 / 0.9);
            cursor: pointer;
            border: none;
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgb(96 165 250 / 0.9);
            cursor: pointer;
            border: none;
          }
          
          /* Custom scrollbar styling */
          .overflow-y-auto::-webkit-scrollbar {
            width: 8px;
          }
          .overflow-y-auto::-webkit-scrollbar-track {
            background: rgba(31, 41, 55, 0.3);
          }
          .overflow-y-auto::-webkit-scrollbar-thumb {
            background: rgba(75, 85, 99, 0.5);
            border-radius: 4px;
          }
          .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background: rgba(75, 85, 99, 0.7);
          }
        `,
        }}
      />
      <div
        className="flex flex-col h-screen bg-gray-900 text-white"
        style={{
          overscrollBehavior: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        <TopBar state={state} />
        <div
          className="flex flex-1 min-h-0"
          style={{ overscrollBehavior: "none" }}
        >
          <HierarchyPanel state={state} />
          <Canvas state={state} />
          <PropertiesPanel state={state} />
        </div>
        <Timeline state={state} isScrubbingRef={isScrubbingRef} />
        <HelpButton />
      </div>
    </MotionDesignerProvider>
  );
}

