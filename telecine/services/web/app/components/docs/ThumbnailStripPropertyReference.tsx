import { PropertyReferenceTable } from "./PropertyReference";
import { thumbnailStripProperties } from "./thumbnail-strip-properties";

export function ThumbnailStripPropertyReference() {
  return <PropertyReferenceTable properties={thumbnailStripProperties} elementName="thumbnail-strip" />;
}


