import { PropertyReferenceTable } from "./PropertyReference";
import { waveformProperties } from "./waveform-properties";

export function WaveformPropertyReference() {
  return <PropertyReferenceTable properties={waveformProperties} elementName="waveform" />;
}


