#!/usr/bin/env node --no-warnings=ExperimentalWarning --loader ts-node/esm/transpile-only

import { LayerComposition } from "../model/LayerComposition";
import { TimeGroup } from "../model/TimeGroup/TimeGroup";
import { ContainerTimeMode, SizeMode, TimeMode } from "../model/types";
import { AudioLayer } from "../model/AudioLayer/AudioLayer";
import { ImageLayer } from "../model/ImageLayer/ImageLayer";
import { CaptionLayer } from "../model/CaptionLayer/CaptionLayer";
import { TextLayer } from "../model/TextLayer/TextLayer";
import { VideoLayer } from "../model/VideoLayer/VideoLayer";
import { Trim } from "../model/Layer";

const deckOfCards = async () => {
  const composition = new LayerComposition({
    id: "deck-of-cards",
    title: "Deck of Cards",
  });
  await composition.waitForSync();
  if (!composition.isEmpty) {
    return composition;
  }
  interface Card {
    imageLayer: ImageLayer;
    audioLayer: AudioLayer;
    title: string;
    captions: CaptionLayer;
  }

  const [
    nineSpades,
    kingClubs,
    joker,
    queenSpade,
    nineSpadesAudio,
    kingClubsAudio,
    jokerAudio,
    queenSpadesAudio,
    nineSpadesCaptions,
    kingClubsCaptions,
    jokerCaptions,
    queenSpadesCaptions,
  ] = await Promise.all([
    ImageLayer.createFromURL(`${location.origin}/cards/card-9-spades.png`, {
      title: "Nine of Spades Face",
      isComponent: true,
      widthMode: SizeMode.Fill,
      heightMode: SizeMode.Fill,
      timeMode: TimeMode.Fill,
    }),
    ImageLayer.createFromURL(`${location.origin}/cards/card-king-clubs.png`, {
      title: "King of Clubs Face",
      isComponent: true,
      widthMode: SizeMode.Fill,
      heightMode: SizeMode.Fill,
      timeMode: TimeMode.Fill,
    }),
    ImageLayer.createFromURL(`${location.origin}/cards/card-joker.png`, {
      title: "Joker Face",
      isComponent: true,
      widthMode: SizeMode.Fill,
      heightMode: SizeMode.Fill,
      timeMode: TimeMode.Fill,
    }),
    ImageLayer.createFromURL(`${location.origin}/cards/card-queen-spades.png`, {
      title: "Queen of Spades Face",
      isComponent: true,
      widthMode: SizeMode.Fill,
      heightMode: SizeMode.Fill,
      timeMode: TimeMode.Fill,
    }),
    AudioLayer.createFromURL(`${location.origin}/cards/card-9-spades.mp3`, {
      title: "Ode to Nine of Spades",
      widthMode: SizeMode.Fixed,
      fixedWidth: 400,
      heightMode: SizeMode.Fixed,
      fixedHeight: 400,
    }),
    AudioLayer.createFromURL(`${location.origin}/cards/card-king-clubs.mp3`, {
      title: "Ode to King of Clubs",
      widthMode: SizeMode.Fixed,
      fixedWidth: 400,
      heightMode: SizeMode.Fixed,
      fixedHeight: 400,
    }),
    AudioLayer.createFromURL(`${location.origin}/cards/card-joker.mp3`, {
      title: "Ode to the Joker",
      widthMode: SizeMode.Fixed,
      fixedWidth: 400,
      heightMode: SizeMode.Fixed,
      fixedHeight: 400,
    }),
    AudioLayer.createFromURL(`${location.origin}/cards/card-queen-spades.mp3`, {
      title: "Ode to Queen of Spades",
      widthMode: SizeMode.Fixed,
      fixedWidth: 400,
      heightMode: SizeMode.Fixed,
      fixedHeight: 400,
    }),
    CaptionLayer.createFromURL(`${location.origin}/cards/card-9-spades.json`, {
      title: "Nine of Spades Captions",
    }),
    CaptionLayer.createFromURL(
      `${location.origin}/cards/card-king-clubs.json`,
      {
        title: "King of Clubs Captions",
      },
    ),
    CaptionLayer.createFromURL(`${location.origin}/cards/card-joker.json`, {
      title: "Joker Captions",
    }),
    CaptionLayer.createFromURL(
      `${location.origin}/cards/card-queen-spades.json`,
      {
        title: "Queen of Spades Captions",
      },
    ),
  ]);

  const cards: Card[] = [
    {
      imageLayer: nineSpades,
      audioLayer: nineSpadesAudio,
      title: "Nine of Spades",
      captions: nineSpadesCaptions,
    },
    {
      imageLayer: kingClubs,
      audioLayer: kingClubsAudio,
      title: "King of Clubs",
      captions: kingClubsCaptions,
    },
    {
      imageLayer: joker,
      audioLayer: jokerAudio,
      title: "Joker",
      captions: jokerCaptions,
    },
    {
      imageLayer: queenSpade,
      audioLayer: queenSpadesAudio,
      title: "Queen of Spades",
      captions: queenSpadesCaptions,
    },
  ];

  const deckTimeGroup = new TimeGroup({
    widthMode: SizeMode.Fixed,
    heightMode: SizeMode.Fixed,
    containerTimeMode: ContainerTimeMode.Sequence,
    fixedWidth: 1080 / 2,
    fixedHeight: 1920 / 2,
    translateY: 1000,
  });
  composition.pushLayers(deckTimeGroup);

  for (const card of cards) {
    const cardTimeGroup = new TimeGroup({
      containerTimeMode: ContainerTimeMode.Fit,
      widthMode: SizeMode.Fill,
      heightMode: SizeMode.Fill,
    });
    deckTimeGroup.pushLayers(cardTimeGroup);
    cardTimeGroup.pushLayers(
      await VideoLayer.createFromURL("/video/CoolVideo.mp4", {
        widthMode: SizeMode.Fixed,
        heightMode: SizeMode.Fixed,
        fixedWidth: 1280 / 4,
        fixedHeight: 720 / 4,
      }),
      await VideoLayer.createFromURL("/video/improv.mp4", {
        widthMode: SizeMode.Fixed,
        heightMode: SizeMode.Fixed,
        fixedWidth: 1280 / 4,
        fixedHeight: 720 / 4,
        translateY: 1280 / 3,
      }),
      card.audioLayer,
      card.captions,
      new TextLayer({
        widthMode: SizeMode.Fill,
        heightMode: SizeMode.Fill,
        timeMode: TimeMode.Fill,
        text: card.title,
      }),
      card.imageLayer,
    );
  }

  return composition;
};

export default deckOfCards;
