export function getFragmentCount(render: {
  duration_ms: number;
  work_slice_ms: number;
}): number {
  return Math.ceil(render.duration_ms / render.work_slice_ms);
}
