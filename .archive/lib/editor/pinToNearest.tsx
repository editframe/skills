export const pinToNearest = (value: number, step: number): number => {
  const remainder = value % step;
  if (remainder < step / 2) {
    return value - remainder;
  } else {
    return value + step - remainder;
  }
};
