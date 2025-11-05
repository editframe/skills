import { createContext } from "@lit/context";

export const fetchContext = createContext<
  (url: string, init?: RequestInit) => Promise<Response>
>(Symbol("fetchContext"));
