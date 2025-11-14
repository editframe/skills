import type { PropertySectionConfig } from "./types";
import { layoutProperties } from "./layoutProperties";
import { visualProperties } from "./visualProperties";
import { textProperties } from "./textProperties";
import { timegroupProperties } from "./timegroupProperties";
import { mediaProperties } from "./mediaProperties";

export const propertySections: PropertySectionConfig[] = [
  ...layoutProperties,
  ...visualProperties,
  ...textProperties,
  ...timegroupProperties,
  ...mediaProperties,
];

