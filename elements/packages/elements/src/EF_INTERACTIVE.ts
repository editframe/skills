export let EF_INTERACTIVE = false;

if (typeof window !== "undefined") {
  EF_INTERACTIVE = !window.location?.search.includes("EF_NONINTERACTIVE");
}
