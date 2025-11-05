import { createContext } from "@lit/context";

export const currentTimeContext = createContext<number>(
  Symbol("currentTimeMs"),
);
