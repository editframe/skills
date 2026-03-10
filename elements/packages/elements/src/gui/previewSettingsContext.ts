import { createContext } from "@lit/context";
import type {
  PreviewPresentationMode,
  PreviewResolutionScale,
  RenderMode,
} from "../preview/previewSettings.js";

/**
 * Settings for the preview workbench.
 * Provided by EFWorkbench via context, consumable by any descendant.
 */
export interface PreviewSettings {
  presentationMode: PreviewPresentationMode;
  renderMode: RenderMode;
  resolutionScale: PreviewResolutionScale;
  showStats: boolean;
  showThumbnailTimestamps: boolean;
}

/**
 * Context for propagating preview settings through the component tree.
 * Provided by EFWorkbench, consumable by any descendant.
 */
export const previewSettingsContext = createContext<PreviewSettings>(Symbol("preview-settings"));
