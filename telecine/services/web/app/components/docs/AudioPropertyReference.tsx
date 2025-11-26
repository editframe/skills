import { PropertyReferenceTable } from "./PropertyReference";
import { audioElementProperties } from "./audio-properties";

export function AudioPropertyReference() {
  return <PropertyReferenceTable properties={audioElementProperties} elementName="audio" />;
}

