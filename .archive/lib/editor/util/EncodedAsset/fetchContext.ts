import { createContext } from "mobx-keystone";

export const fetchContext = createContext<
  { fetchConfig: RequestInit; origin: string } | undefined
>();
