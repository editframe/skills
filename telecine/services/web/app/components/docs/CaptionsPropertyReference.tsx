import { PropertyReferenceTable } from "./PropertyReference";
import { captionsElementProperties } from "./captions-properties";

export function CaptionsPropertyReference() {
  return <PropertyReferenceTable properties={captionsElementProperties} elementName="captions" />;
}


