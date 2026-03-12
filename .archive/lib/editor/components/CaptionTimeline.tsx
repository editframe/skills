import style from "./CaptionTimeline.module.css";
import { observer } from "mobx-react-lite";
import { FC } from "react";
import { CaptionLayer } from "../model/CaptionLayer/CaptionLayer";
import { useEditor } from "./EditorContext";
import classNames from "classnames";

export const CaptionTimeline: FC<{ layer: CaptionLayer }> = observer(
  ({ layer }) => {
    const editor = useEditor();
    return (
      <div
        style={{ position: "relative", whiteSpace: "nowrap", height: "1rem" }}
      >
        {layer.captionData?.segments.map((segment, index) => {
          return segment.words.toReversed().map((word, index) => {
            const center = (word.start + word.end) / 2;
            const distance =
              1 - Math.min(Math.abs(center - layer.currentTimeMs / 1000), 1);

            const current = layer.isCurrentWord(word);
            return (
              <div
                key={index}
                className={classNames(style.captionTimelineWord, {
                  [style.captionTimelineWordCurrent]: current,
                })}
                style={{
                  left: editor.msToPixels(word.start * 1000),
                  "--scale": distance,
                }}
              >
                {word.text}
              </div>
            );
          });
        })}
      </div>
    );
  },
);
