export type AestheticFont = "preset" | "sans" | "serif" | "mono" | `google:${string}`;
export function fontFamily(choice: AestheticFont | undefined, fallback: string) {
  if (!choice || choice === "preset") return fallback;
  if (choice.startsWith("google:")) return `"${choice.slice(7)}", ${fallback}`;
  return {
    sans: "Arial, Helvetica, sans-serif",
    serif: "Georgia, serif",
    mono: "Courier New, monospace",
  }[choice as "sans" | "serif" | "mono"];
}
