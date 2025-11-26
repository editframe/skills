// Helper to calculate AAC frame-aligned segment durations for audio
export function truncateDecimal(num: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.trunc(num * factor) / factor;
}
