#!/usr/bin/env node --no-warnings=ExperimentalWarning --loader ts-node/esm/transpile-only

import { LayerComposition } from "../model/LayerComposition";
import { TimeGroup } from "../model/TimeGroup/TimeGroup";
import { ContainerTimeMode, SizeMode } from "../model/types";
import { CaptionLayer } from "../model/CaptionLayer/CaptionLayer";
import { VideoLayer } from "../model/VideoLayer/VideoLayer";

const componentDemo = async () => {
  const composition = new LayerComposition({});
  await composition.waitForSync();

  if (!composition.isEmpty) {
    return composition;
  }

  const videoTimeGroup = new TimeGroup({
    containerTimeMode: ContainerTimeMode.Fit,
    widthMode: SizeMode.Fixed,
    fixedWidth: 1920 / 4,
    heightMode: SizeMode.Fixed,
    fixedHeight: 1080 / 4,
  });
  composition.pushLayers(videoTimeGroup);

  videoTimeGroup.pushLayers(
    await CaptionLayer.createFromURL(
      `${location.origin}/cards/card-9-spades.json`,
      {
        title: "Nine of Spades Captions",
        activeWordColor: "red",
        wordColor: "black",
        activeWordBackgroundColor: "orange",
        wordBackgroundColor: "white",
      }
    ),
    await VideoLayer.createFromURL("/video/tsla.mp4", {
      widthMode: SizeMode.Fill,
      heightMode: SizeMode.Fill,
    })
  );

  return composition;
};

export default componentDemo;
