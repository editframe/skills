export const awaitNextTick = () =>
  new Promise((resolve) => process.nextTick(resolve));
