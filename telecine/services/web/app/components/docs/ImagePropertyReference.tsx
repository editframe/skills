import { PropertyReferenceTable } from "./PropertyReference";
import { imageElementProperties } from "./image-properties";

export function ImagePropertyReference() {
  return <PropertyReferenceTable properties={imageElementProperties} elementName="image" />;
}


