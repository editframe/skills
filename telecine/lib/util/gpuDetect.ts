/**
 * Returns true when running inside a Cloud Run GPU instance.
 * The NVIDIA container runtime sets NVIDIA_VISIBLE_DEVICES automatically.
 */
export const hasGpu = (): boolean =>
  process.env.NVIDIA_VISIBLE_DEVICES !== undefined &&
  process.env.NVIDIA_VISIBLE_DEVICES !== "none";
