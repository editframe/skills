import { parseTimeToMs } from "./parseTimeToMs.js";

export const durationConverter = {
  fromAttribute: (value: string | null) => (value === null ? null : parseTimeToMs(value)),
  toAttribute: (value: number | null) => (value === null ? null : `${value}s`),
};

const positiveDurationConverter = (error: string) => {
  return {
    fromAttribute: (value: string | null): number | null => {
      if (value === null) {
        return null;
      }
      if (value.startsWith("-")) {
        throw new Error(error);
      }
      return parseTimeToMs(value);
    },
    toAttribute: (value: number | null) => (value === null ? null : `${value}s`),
  };
};

export const trimDurationConverter = positiveDurationConverter(
  "Trimstart & trimend must be a positive value in milliseconds or seconds (1s, 1000ms)",
);

export const imageDurationConverter = positiveDurationConverter(
  "Image duration must be a positive value in milliseconds or seconds (1s, 1000ms)",
);

export const sourceDurationConverter = positiveDurationConverter(
  "Sourcein & sourceout must be a positive value in milliseconds or seconds (1s, 1000ms)",
);
