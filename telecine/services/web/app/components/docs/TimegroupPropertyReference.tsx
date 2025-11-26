import { PropertyReferenceTable } from "./PropertyReference";
import { timegroupProperties } from "./timegroup-properties";

export function TimegroupPropertyReference() {
  return <PropertyReferenceTable properties={timegroupProperties} elementName="timegroup" />;
}


