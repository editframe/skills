import React, { createContext, useContext } from "react";
import type { EFPanZoom } from "@editframe/elements";

interface PanZoomContextValue {
  panZoomRef: React.RefObject<EFPanZoom | null>;
}

const PanZoomContext = createContext<PanZoomContextValue | null>(null);

export function PanZoomProvider({
  children,
  panZoomRef,
}: {
  children: React.ReactNode;
  panZoomRef: React.RefObject<EFPanZoom | null>;
}) {
  return (
    <PanZoomContext.Provider value={{ panZoomRef }}>
      {children}
    </PanZoomContext.Provider>
  );
}

export function usePanZoom(): EFPanZoom | null {
  const context = useContext(PanZoomContext);
  if (!context) {
    throw new Error("usePanZoom must be used within PanZoomProvider");
  }
  return context.panZoomRef.current;
}

