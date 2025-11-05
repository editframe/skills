import type { FC } from "react";

export const msToTimeCode = (ms: number, subSecond = false): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const pad = (num: number): string => num.toString().padStart(2, "0");

  let timecode = `${pad(hours)}:${pad(minutes % 60)}:${pad(seconds % 60)}`;

  if (subSecond) {
    const subSeconds = Math.floor((ms % 1000) / 10);
    timecode += `.${subSeconds.toString().padStart(2, "0")}`;
  }

  return timecode;
};

interface TimecodeProps {
  ms: number;
  subSecond?: boolean;
}

export const TimeCode: FC<TimecodeProps> = ({ ms, subSecond }) => (
  <span className="font-mono">{msToTimeCode(ms, subSecond)}</span>
);

const msToHumanReadable = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours.toFixed(2)} hours`;
  }
  if (minutes > 0) {
    return `${(seconds / 60).toFixed(2)} minutes`;
  }
  return `${seconds} seconds`;
};

interface DurationProps {
  ms: number;
}

export const Duration: FC<DurationProps> = ({ ms }) => (
  <span>{msToHumanReadable(ms)}</span>
);
