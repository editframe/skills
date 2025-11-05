export const awaitMicrotask = async () => {
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
};
