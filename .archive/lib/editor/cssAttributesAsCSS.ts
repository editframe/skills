const camelToKebab = (str: string): string =>
  str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
export const cssAttributesAsCSS = (
  cssAttributes: React.CSSProperties
): string => {
  return Object.entries(cssAttributes).reduce(
    (acc, [key, value]) => `${acc}${camelToKebab(key)}: ${value};`,
    ""
  );
};
