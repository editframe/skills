import type { PropertySectionConfig } from "./types";
import { layoutProperties } from "./layoutProperties";
import { visualProperties } from "./visualProperties";
import { textProperties } from "./textProperties";
import { timegroupProperties } from "./timegroupProperties";
import { mediaProperties } from "./mediaProperties";
import { captionsProperties } from "./captionsProperties";
import { waveformProperties } from "./waveformProperties";
import { surfaceProperties } from "./surfaceProperties";

export const propertySections: PropertySectionConfig[] = [
  // Element-specific properties first
  ...textProperties,
  ...timegroupProperties,
  ...mediaProperties,
  ...captionsProperties,
  ...waveformProperties,
  ...surfaceProperties,
  // Common properties after
  ...layoutProperties,
  ...visualProperties,
];
