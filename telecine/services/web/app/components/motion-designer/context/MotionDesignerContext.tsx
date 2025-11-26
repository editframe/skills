import React, { createContext, useContext } from "react";
import type {
  MotionDesignerState,
  ElementNode,
  Animation,
} from "~/lib/motion-designer/types";

interface MotionDesignerActions {
  selectElement: (id: string | null) => void;
  selectAnimation: (
    animationId: string | null,
    elementId: string | null,
  ) => void;
  addElement: (
    element: Omit<ElementNode, "id">,
    parentId: string | null,
  ) => void;
  deleteElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<ElementNode["props"]>) => void;
  moveElement: (
    id: string,
    newParentId: string | null,
    newIndex?: number,
  ) => void;
  addAnimation: (elementId: string, animation: Omit<Animation, "id">) => void;
  updateAnimation: (
    elementId: string,
    animationId: string,
    updates: Partial<Animation>,
  ) => void;
  deleteAnimation: (elementId: string, animationId: string) => void;
  reorderAnimation: (
    elementId: string,
    animationId: string,
    newIndex: number,
  ) => void;
  setActiveRootTimegroup: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setPlacementMode: (mode: string | null) => void;
  updateCanvasTransform: (
    transform: Partial<MotionDesignerState["ui"]["canvasTransform"]>,
  ) => void;
  replaceState: (newState: MotionDesignerState) => void;
}

const MotionDesignerContext = createContext<MotionDesignerActions | null>(null);

export function MotionDesignerProvider({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions: MotionDesignerActions;
}) {
  return (
    <MotionDesignerContext.Provider value={actions}>
      {children}
    </MotionDesignerContext.Provider>
  );
}

export function useMotionDesignerActions(): MotionDesignerActions {
  const context = useContext(MotionDesignerContext);
  if (!context) {
    throw new Error(
      "useMotionDesignerActions must be used within MotionDesignerProvider",
    );
  }
  return context;
}
