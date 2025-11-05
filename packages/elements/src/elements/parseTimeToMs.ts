export const parseTimeToMs = (time: string) => {
  if (time.endsWith("ms")) {
    return Number.parseFloat(time);
  }
  if (time.endsWith("s")) {
    return Number.parseFloat(time) * 1000;
  }
  throw new Error("Time must be in milliseconds or seconds (10s, 10000ms)");
};
