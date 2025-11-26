import { PropertyReferenceTable } from "./PropertyReference";
import { surfaceElementProperties } from "./surface-properties";

export function SurfacePropertyReference() {
  return <PropertyReferenceTable properties={surfaceElementProperties} elementName="surface" />;
}


