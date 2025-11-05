export const invariant = <T>(
  condition: false | undefined | null | T,
  message: string,
): condition is T => {
  if (condition === false || condition === undefined || condition === null) {
    throw new Error(message);
  }
  return !!condition;
};
