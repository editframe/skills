export let EF_INTERACTIVE = false;

if (typeof window !== "undefined") {
  EF_INTERACTIVE = !window.location?.search.includes("EF_NONINTERACTIVE");
}

/**
 * Set EF_INTERACTIVE value for testing purposes.
 * @internal
 */
export const setEFInteractive = (value: boolean) => {
  EF_INTERACTIVE = value;
};
