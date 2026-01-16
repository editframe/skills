import React from "react";
import { Timegroup, Audio, Image, useTimingInfo } from "@editframe/react";

interface CardInfo {
  title: string;
  id: string;
}

const cards: CardInfo[] = [
  {
    title: "9 Of Spades",
    id: "card-9-spades",
  },
  {
    title: "King of Clubs",
    id: "card-king-clubs",
  },
  {
    title: "Queen of Spades",
    id: "card-queen-spades",
  },
  {
    title: "The Joker",
    id: "card-joker",
  },
];

const CardSegment = ({ title, id }: CardInfo) => {
  const { ownCurrentTimeMs, durationMs, percentComplete, ref } =
    useTimingInfo();

  return (
    <Timegroup mode="contain" ref={ref}>
      <div className="absolute flex flex-col items-center justify-center z-10">
        <h1 className="text-4xl p-4">{title}</h1>
        <Audio id={id} src={`/assets/cards/${id}.mp3`} />
        <Image src={`/assets/cards/${id}.png`} className="w-1/4" />
        <code>
          {(ownCurrentTimeMs / 1000).toFixed(2)}s /{" "}
          {(durationMs / 1000).toFixed(2)}s
        </code>
        <progress max="1" value={percentComplete} className="h-[10px]" />
      </div>
      <Image
        src={`/assets/cards/${id}.png`}
        className="absolute z-0 blur-lg opacity-20 "
      />
    </Timegroup>
  );
};

export const Video = () => {
  return (
    <Timegroup
      workbench
      className="w-[500px] h-[500px] bg-slate-200 flex items-center justify-center relative overflow-hidden"
      mode="sequence"
    >
      {cards.map((card) => (
        <CardSegment key={card.id} {...card} />
      ))}
    </Timegroup>
  );
};
