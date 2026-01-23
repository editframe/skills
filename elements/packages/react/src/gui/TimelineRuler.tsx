import { EFTimelineRuler } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export interface TimelineRulerProps {
  durationMs?: number;
  zoomScale?: number;
  containerWidth?: number;
  fps?: number;
  scrollContainerSelector?: string;
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

const BaseTimelineRuler = createComponent<
  EFTimelineRuler,
  {
    durationMs?: number;
    zoomScale?: number;
    containerWidth?: number;
    fps?: number;
    scrollContainerSelector?: string;
    scrollContainerElement?: HTMLElement | null;
  }
>({
  tagName: "ef-timeline-ruler",
  elementClass: EFTimelineRuler,
  react: React,
  displayName: "TimelineRuler",
  props: {
    durationMs: "duration-ms",
    zoomScale: "zoom-scale",
    containerWidth: "container-width",
    fps: "fps",
    scrollContainerSelector: "scroll-container-selector",
  },
});

export const TimelineRuler = React.forwardRef<
  EFTimelineRuler,
  TimelineRulerProps
>((props, ref) => {
  const { scrollContainerRef, ...restProps } = props;
  const elementRef = React.useRef<EFTimelineRuler | null>(null);

  React.useLayoutEffect(() => {
    if (elementRef.current && scrollContainerRef?.current) {
      (elementRef.current as any).scrollContainerElement = scrollContainerRef.current;
    } else if (elementRef.current) {
      (elementRef.current as any).scrollContainerElement = null;
    }
  }, [scrollContainerRef?.current]);

  return (
    <BaseTimelineRuler
      {...(restProps as any)}
      ref={(node) => {
        elementRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
    />
  );
});

TimelineRuler.displayName = "TimelineRuler";
