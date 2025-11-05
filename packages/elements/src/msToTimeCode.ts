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
