import { PropertyReferenceTable } from "./PropertyReference";
import { toggleLoopProperties } from "./controls-properties";

export function ToggleLoopPropertyReference() {
  return <PropertyReferenceTable properties={toggleLoopProperties} elementName="controls" />;
}





