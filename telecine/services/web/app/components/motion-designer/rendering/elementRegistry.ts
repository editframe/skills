import {
  Timegroup,
  Video,
  Audio,
  Image,
  Text,
  TextSegment,
  Captions,
  Surface,
  Waveform,
  ThumbnailStrip,
} from "@editframe/react";

export { TextSegment };

export const elementRegistry: Record<string, React.ComponentType<any>> = {
  timegroup: Timegroup,
  div: "div" as any,
  video: Video,
  audio: Audio,
  image: Image,
  text: Text,
  captions: Captions,
  surface: Surface,
  waveform: Waveform,
  thumbnailstrip: ThumbnailStrip,
};
