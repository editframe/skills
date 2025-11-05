export function formatDuration(nanos: number): string {
  const ms = nanos / 1_000_000;
  if (ms < 1) return `${(nanos / 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
