import { createContext } from "@lit/context";

export const durationContext = createContext<number>(Symbol("durationMs"));
