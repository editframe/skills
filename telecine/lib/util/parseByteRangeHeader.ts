export function parseByteRangeHeader(header: string) {
  const matches = header.match(/^bytes=(\d+)-(\d+)\/(\d+)$/);
  if (!matches) {
    return null;
  }

  // Because we're using a capture group, we know that the
  // matches array will be populated, so `!` is appropriate here.
  const start = Number.parseInt(matches[1]!, 10);
  const end = Number.parseInt(matches[2]!, 10);
  const total = Number.parseInt(matches[3]!, 10);

  return { start, end, total } as const;
}
