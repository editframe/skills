#!/usr/bin/env node --no-warnings=ExperimentalWarning --loader ts-node/esm/transpile-only

import { LayerComposition } from "../model/LayerComposition";
import { SizeMode } from "../model/types";
import { VideoLayer } from "../model/VideoLayer/VideoLayer";

const componentDemo = async () => {
  const composition = new LayerComposition({
    id: "feelgoodinc",
    title: "Feel Good Inc",
  });
  await composition.waitForSync();

  if (!composition.isEmpty) {
    return composition;
  }

  composition.pushLayers(
    await VideoLayer.createFromURL("/video/feelgoodinc.mp4", {
      widthMode: SizeMode.Fixed,
      heightMode: SizeMode.Fixed,
    }),
  );

  return composition;
};

export default componentDemo;
