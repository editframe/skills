/** A small starting collection; the picker also accepts any Google Fonts family by name. */
export const GOOGLE_FONTS = [
  ["Inter", "Sans"],
  ["DM Sans", "Sans"],
  ["Manrope", "Sans"],
  ["Space Grotesk", "Sans"],
  ["Outfit", "Sans"],
  ["Montserrat", "Sans"],
  ["Oswald", "Sans"],
  ["Bebas Neue", "Display"],
  ["Playfair Display", "Serif"],
  ["Cormorant Garamond", "Serif"],
  ["Bodoni Moda", "Serif"],
  ["DM Serif Display", "Serif"],
  ["Libre Baskerville", "Serif"],
  ["Lora", "Serif"],
  ["Fraunces", "Serif"],
  ["Cinzel", "Serif"],
  ["UnifrakturCook", "Display"],
  ["Pirata One", "Display"],
  ["Almendra", "Display"],
  ["Abril Fatface", "Display"],
  ["Righteous", "Display"],
  ["Monoton", "Display"],
  ["Orbitron", "Display"],
  ["Syne", "Display"],
  ["Space Mono", "Mono"],
  ["IBM Plex Mono", "Mono"],
  ["JetBrains Mono", "Mono"],
  ["VT323", "Mono"],
  ["Press Start 2P", "Mono"],
  ["Silkscreen", "Mono"],
  ["Caveat", "Script"],
  ["Dancing Script", "Script"],
  ["Italianno", "Script"],
  ["Parisienne", "Script"],
  ["Pacifico", "Script"],
  ["Sacramento", "Script"],
] as const;
export type AestheticFont = "preset" | "sans" | "serif" | "mono" | `google:${string}`;
export const isAestheticFont = (value: unknown): value is AestheticFont =>
  typeof value === "string" &&
  (["preset", "sans", "serif", "mono"].includes(value) ||
    /^google:[A-Za-z][A-Za-z0-9 -]{0,79}$/.test(value));
export function fontFamily(choice: AestheticFont | undefined, fallback: string) {
  if (!choice || choice === "preset") return fallback;
  if (choice.startsWith("google:")) return `"${choice.slice(7)}", ${fallback}`;
  return {
    sans: "Arial, Helvetica, sans-serif",
    serif: "Georgia, serif",
    mono: "Courier New, monospace",
  }[choice as "sans" | "serif" | "mono"];
}
const loaded = new Map<string, Promise<void>>();
/** Loading participates in frame presentation; a paused frame never keeps a stale fallback font. */
export function prepareAestheticFont(choice: AestheticFont | undefined): Promise<void> {
  if (!choice?.startsWith("google:")) return Promise.resolve();
  const family = choice.slice(7);
  let pending = loaded.get(family);
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}${family === "UnifrakturCook" ? ":wght@700" : ""}&display=swap`;
      const timer = window.setTimeout(() => fail(), 12000);
      const fail = () => {
        clearTimeout(timer);
        link.remove();
        reject(new Error(`Could not load ${family}. Check the family name or connection.`));
      };
      link.onerror = fail;
      link.onload = () => {
        void document.fonts
          .load(`32px "${family}"`)
          .then((faces) => {
            if (!faces.length) {
              fail();
              return;
            }
            clearTimeout(timer);
            resolve();
          })
          .catch(fail);
      };
      document.head.append(link);
    });
    loaded.set(family, pending);
  }
  return pending;
}
export function retryAestheticFont(choice: AestheticFont) {
  loaded.delete(choice.slice(7));
  return prepareAestheticFont(choice);
}
