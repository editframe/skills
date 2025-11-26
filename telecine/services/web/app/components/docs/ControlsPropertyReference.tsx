import { PropertyReferenceTable } from "./PropertyReference";
import { controlsElementProperties } from "./controls-properties";

export function ControlsPropertyReference() {
  return <PropertyReferenceTable properties={controlsElementProperties} elementName="controls" />;
}





