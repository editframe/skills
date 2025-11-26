export function buildFragmentIds(render: {
  duration_ms: number;
  work_slice_ms: number;
}): ("init" | number)[] {
  const totalFragmentCount = Math.ceil(
    render.duration_ms / render.work_slice_ms,
  );

  return ["init", ...Array.from({ length: totalFragmentCount }, (_, i) => i)];
}
