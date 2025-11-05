import { createContext } from "@lit/context";

export const focusedElementContext = createContext<HTMLElement | undefined>(
  Symbol("focusedElement"),
);
