import { useEvent } from "~/ui/useEvent";
import { useNavigateWithSearch } from "./navigateWithSearch";

export const useNavigateOnEscape = (url: string | number) => {
  const navigate = useNavigateWithSearch();
  if ("window" in globalThis) {
    useEvent(
      { current: globalThis.window },
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          navigate(url, { preventScrollReset: true });
        }
      },
      undefined,
      [url, navigate],
    );
  }
};
