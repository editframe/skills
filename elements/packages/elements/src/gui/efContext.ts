import { createContext } from "@lit/context";
import type { ControllableInterface } from "./Controllable.js";

export const efContext = createContext<ControllableInterface | null>(Symbol("efContext"));
