import { PropertyReferenceTable } from "./PropertyReference";
import { togglePlayProperties } from "./controls-properties";

export function TogglePlayPropertyReference() {
  return <PropertyReferenceTable properties={togglePlayProperties} elementName="controls" />;
}










