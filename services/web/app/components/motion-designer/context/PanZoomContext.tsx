import {
  createContext,
  useContext,
  useRef,
  type RefObject,
  type ReactNode,
} from "react";

interface PanZoomHandle {
  scale: number;
  reset(): void;
}

const PanZoomContext = createContext<RefObject<PanZoomHandle | null> | null>(
  null,
);

export function PanZoomProvider({ children }: { children: ReactNode }) {
  const ref = useRef<PanZoomHandle | null>(null);
  return (
    <PanZoomContext.Provider value={ref}>{children}</PanZoomContext.Provider>
  );
}

export function usePanZoom(): PanZoomHandle | null {
  const ref = useContext(PanZoomContext);
  return ref?.current ?? null;
}
