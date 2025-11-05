import { ContextRoot } from "@lit/context";

let contextRoot: ContextRoot | null = null;
export const attachContextRoot = () => {
  if (typeof window === "undefined") {
    return;
  }
  if (contextRoot !== null) {
    return;
  }
  contextRoot = new ContextRoot();
  contextRoot.attach(document.body);
};
