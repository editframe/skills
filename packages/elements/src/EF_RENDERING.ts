export const EF_RENDERING = () =>
  typeof window !== "undefined" && "FRAMEGEN_BRIDGE" in window;
