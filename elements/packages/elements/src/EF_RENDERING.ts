export const EF_RENDERING = () => typeof window !== "undefined" && "FRAMEGEN_BRIDGE" in window;

export const EF_NO_WORKBENCH = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("noWorkbench") === "true" || params.get("no-workbench") === "true";
};
