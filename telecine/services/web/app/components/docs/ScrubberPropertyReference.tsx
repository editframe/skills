import { PropertyReferenceTable } from "./PropertyReference";
import { scrubberProperties } from "./controls-properties";

export function ScrubberPropertyReference() {
  return <PropertyReferenceTable properties={scrubberProperties} elementName="controls" />;
}





