import { PropertyReferenceTable } from "./PropertyReference";
import { textElementProperties } from "./text-properties";

export function TextPropertyReference() {
  return <PropertyReferenceTable properties={textElementProperties} elementName="text" />;
}


