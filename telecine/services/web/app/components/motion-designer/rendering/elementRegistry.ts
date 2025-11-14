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
import type { ElementType } from "~/lib/motion-designer/types";

export { TextSegment };

export const elementRegistry: Record<
  ElementType,
  React.ComponentType<any>
> = {
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

