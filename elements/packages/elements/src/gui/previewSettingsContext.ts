import { createContext } from "@lit/context";

/**
 * Available preview resolution scale factors.
 * - 1: Full resolution (default)
 * - 0.75: 3/4 resolution
 * - 0.5: Half resolution
 * - 0.25: Quarter resolution
 * - "auto": Adaptive resolution that scales down during motion to prevent dropped frames,
 *           and renders at full resolution when at rest
 */
export type PreviewResolutionScale = 1 | 0.75 | 0.5 | 0.25 | "auto";

/**
 * Settings for the preview canvas mode.
 */
export interface PreviewSettings {
  resolutionScale: PreviewResolutionScale;
}

/**
 * Context for propagating preview settings through the component tree.
 * Provided by EFWorkbench, consumable by any descendant.
 */
export const previewSettingsContext = createContext<PreviewSettings>(
  Symbol("preview-settings")
);
