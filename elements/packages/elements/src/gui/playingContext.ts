import { createContext } from "@lit/context";

export const playingContext = createContext<boolean>(Symbol("playingContext"));

export const loopContext = createContext<boolean>(Symbol("loopContext"));
