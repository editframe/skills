import { PropertyReferenceTable } from "./PropertyReference";
import { videoElementProperties } from "./video-properties";

export function VideoPropertyReference() {
  return <PropertyReferenceTable properties={videoElementProperties} elementName="video" />;
}

