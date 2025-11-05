import { createContext } from "@lit/context";

export interface FocusContext {
  focusedElement: HTMLElement | null;
}

export const focusContext = createContext<FocusContext>(Symbol("focusContext"));
