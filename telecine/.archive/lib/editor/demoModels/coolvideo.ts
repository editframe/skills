#!/usr/bin/env node --no-warnings=ExperimentalWarning --loader ts-node/esm/transpile-only

import { LayerComposition } from "../model/LayerComposition";
import { SizeMode } from "../model/types";
import { VideoLayer } from "../model/VideoLayer/VideoLayer";

const componentDemo = async () => {
  const composition = new LayerComposition({
    id: "cool-video",
    title: "Cool Video",
  });
  await composition.waitForSync();

  if (!composition.isEmpty) {
    return composition;
  }

  composition.pushLayers(
    await VideoLayer.createFromURL("/video/CoolVideo.mp4", {
      widthMode: SizeMode.Fixed,
      heightMode: SizeMode.Fixed,
    }),
  );

  return composition;
};

export default componentDemo;
