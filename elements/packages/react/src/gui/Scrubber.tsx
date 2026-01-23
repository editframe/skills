import { EFScrubber } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export interface ScrubberProps {
  orientation?: "horizontal" | "vertical";
  currentTimeMs?: number;
  durationMs?: number;
  zoomScale?: number;
  containerWidth?: number;
  fps?: number;
  rawScrubTimeMs?: number | null;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  isScrubbingRef?: React.MutableRefObject<boolean>;
  onSeek?: (time: number) => void;
}

const BaseScrubber = createComponent<
  EFScrubber,
  { onSeek: "seek" }
>({
  tagName: "ef-scrubber",
  elementClass: EFScrubber,
  react: React,
  displayName: "Scrubber",
  events: {
    onSeek: "seek",
  },
}) as React.ForwardRefExoticComponent<ScrubberProps & React.RefAttributes<EFScrubber>>;

export const Scrubber = React.forwardRef<EFScrubber, ScrubberProps>(
  (props, ref) => {
    const { scrollContainerRef, isScrubbingRef, ...restProps } = props;
    const elementRef = React.useRef<EFScrubber | null>(null);

    React.useLayoutEffect(() => {
      if (elementRef.current) {
        if (scrollContainerRef?.current) {
          elementRef.current.scrollContainerRef = scrollContainerRef;
        } else {
          elementRef.current.scrollContainerRef = undefined;
        }
        if (isScrubbingRef) {
          elementRef.current.isScrubbingRef = isScrubbingRef;
        } else {
          elementRef.current.isScrubbingRef = undefined;
        }
      }
    }, [scrollContainerRef?.current, isScrubbingRef]);

    return (
      <BaseScrubber
        {...restProps}
        ref={(node) => {
          elementRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
      />
    );
  },
);

Scrubber.displayName = "Scrubber";
