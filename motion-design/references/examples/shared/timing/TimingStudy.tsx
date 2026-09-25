import { attachMotionTrack } from "../../../src/primitives/motion-track";
import { memo, useCallback, useId, useMemo, type ReactNode } from "react";
import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, FONT, type Aspect } from "../../../src/primitives";
import { SOURCE_CLONES } from "./SourceClones";
import { timingMotionTracks } from "./motion-tracks";
import {
  clamp,
  gestureProgress,
  TIMING_DURATION,
  ALL_TIMING_PROFILES,
  TIMING_SOURCES,
  isEaseFamily,
  timingCurve,
  timingHalf,
  timingDuration,
  type PreviewMode,
  type TimingSettings,
  type TimingId,
} from "./profiles";

const renderers = new WeakMap<EFTimegroupElement, () => void>();
const paper = "#f5f2e9",
  ink = "#26312b",
  muted = "#62695e";
// Shared drawing coordinates leave room above/below progress 0–1 for recoil.
const graphBase = { x: 65, y: 265, w: 430, h: 175 };

export const TimingStudy = memo(function TimingStudy({
  id,
  aspect = "landscape",
  timing,
  settings,
  focus,
  mode = "round-trip",
}: {
  id: string;
  aspect?: Aspect;
  timing: TimingId;
  settings?: TimingSettings;
  focus?: number;
  mode?: PreviewMode;
}) {
  const profile = ALL_TIMING_PROFILES.find((p) => p.id === timing)!;
  const displayName =
    settings && timing === "undershoot"
      ? "Hesitate and finish"
      : profile.name +
        (settings && isEaseFamily(timing) ? ` ${["In", "Out", "In-Out"][settings.direction]}` : "");
  const gesture = settings?.gesture ?? profile.gesture;
  const duration = settings ? timingDuration(settings, mode) : TIMING_DURATION;
  const motionTracks = useMemo(
    () => timingMotionTracks(profile, duration, settings, mode),
    [profile, duration, settings, mode],
  );
  const graph = useMemo(() => {
    const samples = Array.from({ length: 201 }, (_, i) => timingCurve(timing, i / 200, settings));
    const min = Math.min(0, ...samples),
      max = Math.max(1, ...samples);
    const h = settings ? 175 / (max - min) : 175;
    return { ...graphBase, h, y: settings ? 265 + min * h : 265, min, max };
  }, [timing, settings]);
  const labelId = useId();
  const [width, height] = ASPECT[aspect];
  const columns =
    focus === undefined ? (aspect === "landscape" ? 3 : 2) : aspect === "landscape" ? 2 : 1;
  const margin = aspect === "square" ? 32 : 56;
  const gap = 22;
  const top = aspect === "square" ? 150 : 200;
  const rows = (focus === undefined ? 6 : 2) / columns;
  const cardW = (width - 2 * margin - (columns - 1) * gap) / columns;
  const cardH = (height - top - margin - (rows - 1) * gap) / rows;
  const labelH = aspect === "square" ? 66 : 80;
  const visualH = cardH - labelH;

  const initialize = useCallback(
    (root: EFTimegroupElement) => {
      renderers.get(root)?.();
      const disposers = motionTracks.map((track) =>
        attachMotionTrack(
          root,
          root.querySelectorAll(track.selector)[track.index],
          track.keyframes,
          duration,
        ),
      );
      const ray = root.querySelector<SVGGElement>("[data-timing-ray]")!;
      const line = root.querySelector<SVGPathElement>("[data-timing-line]")!;
      const dot = root.querySelector<SVGCircleElement>("[data-timing-dot]")!;
      const playhead = root.querySelector<SVGPathElement>("[data-timing-playhead]")!;
      const meter = root.querySelector<SVGTextElement>("[data-timing-meter]")!;
      const phase = root.querySelector<SVGTextElement>("[data-timing-phase]")!;
      const travel = root.querySelector<SVGCircleElement>("[data-timing-travel]")!;
      const draw = (clock: number) => {
        const time = mode === "exit" && settings ? clock + timingHalf(settings) : clock;
        const p = gestureProgress(profile, time, 0, settings);
        ray.style.opacity = String(clamp(1 - Math.abs(1 - p.position) * 5));
        // SVG dash length has a hard endpoint. Keep it valid and express excess
        // progress in the existing endpoint label rather than wrapping the dash.
        line.style.strokeDashoffset = String(1 - clamp(p.position));
        const x = graph.x + graph.w * p.raw;
        const y = graph.y - graph.h * p.value;
        dot.setAttribute("cx", String(x));
        dot.setAttribute("cy", String(y));
        playhead.setAttribute("d", `M${x} 55V${graph.y}`);
        travel.setAttribute(
          "cx",
          String(65 + (430 * (p.position - graph.min)) / (graph.max - graph.min)),
        );
        meter.textContent = `${Math.round(p.value * 100)}%`;
        phase.textContent = `${p.returning ? "RETURN" : "FORWARD"}${p.raw === 0 ? " · READY" : p.raw === 1 ? " · HOLD" : ""}`;
      };
      draw(root.currentTime);
      const unregister = root.addFrameTask(({ ownCurrentTime }) => draw(ownCurrentTime));
      renderers.set(root, () => {
        unregister();
        disposers.forEach((dispose) => dispose());
      });
    },
    [profile, settings, graph, mode, duration, motionTracks],
  );

  const curve = Array.from({ length: 401 }, (_, i) => {
    const x = i / 400;
    return `${i ? "L" : "M"}${graph.x + graph.w * x},${graph.y - graph.h * timingCurve(timing, x, settings)}`;
  }).join(" ");
  const card = (
    index: number,
    title: string,
    subtitle: string,
    background: string,
    children: ReactNode,
  ) => (
    <section
      key={index}
      data-timing-panel={index}
      aria-label={title}
      aria-hidden={(focus !== undefined && index !== focus && index !== 5) || undefined}
      style={{
        display: focus !== undefined && index !== focus && index !== 5 ? "none" : undefined,
        position: "absolute",
        left:
          margin + ((focus === undefined ? index : index === 5 ? 1 : 0) % columns) * (cardW + gap),
        top:
          top +
          Math.floor((focus === undefined ? index : index === 5 ? 1 : 0) / columns) * (cardH + gap),
        width: cardW,
        height: cardH,
        border: "1px solid #d6d8cb",
        overflow: "hidden",
        borderRadius: 8,
      }}
    >
      <div style={{ height: visualH, position: "relative", overflow: "hidden", background }}>
        {children}
      </div>
      <div
        style={{
          height: labelH,
          padding: aspect === "square" ? "10px 15px" : "15px 20px",
          boxSizing: "border-box",
          background: "#fffdf7",
        }}
      >
        <div style={{ fontSize: aspect === "square" ? 20 : 24, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: aspect === "square" ? 16 : 19, color: muted, marginTop: 4 }}>
          {subtitle}
        </div>
      </div>
    </section>
  );

  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration={`${duration}s`}
      loop
      initializer={initialize}
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        background: paper,
        color: ink,
        fontFamily: FONT.sans,
        lineHeight: 1.2,
      }}
    >
      <header style={{ position: "absolute", left: margin, right: margin, top: margin - 10 }}>
        <div style={{ fontSize: 18, letterSpacing: ".13em", color: muted, marginBottom: 10 }}>
          EASING / SPEED · {profile.group.toUpperCase()}
        </div>
        <h1
          id={labelId}
          style={{
            fontSize: aspect === "square" ? 42 : 56,
            lineHeight: 1,
            letterSpacing: "-.04em",
            margin: 0,
          }}
        >
          {displayName}
        </h1>
        <p style={{ fontSize: aspect === "square" ? 18 : 22, margin: "12px 0 0", color: muted }}>
          {focus === undefined ? "Same five studies." : TIMING_SOURCES[focus].name + "."}{" "}
          {gesture.toFixed(2)}s per gesture.
        </p>
      </header>
      {TIMING_SOURCES.map((source, i) => {
        const Clone = SOURCE_CLONES[i];
        const [w, h] = ASPECT[source.aspect];
        const zoom = Math.min(cardW / w, visualH / h);
        return card(
          i,
          source.name,
          source.application,
          source.background,
          <div
            style={{
              position: "absolute",
              left: (cardW - w * zoom) / 2,
              top: (visualH - h * zoom) / 2,
              width: w * zoom,
              height: h * zoom,
            }}
          >
            <div
              data-timing-source={source.id}
              style={{
                position: "relative",
                width: w,
                height: h,
                zoom,
                overflow: "hidden",
                background: source.background,
              }}
            >
              <Clone />
            </div>
          </div>,
        );
      })}
      {card(
        5,
        "Timing curve",
        "Time → progress · applied to each gesture",
        "#edf0e5",
        <svg
          viewBox="0 0 560 350"
          role="img"
          aria-label={`${displayName} gesture progress`}
          style={{ width: "100%", height: "100%" }}
        >
          <path d={`M${graph.x} 55V${graph.y}H${graph.x + graph.w}`} stroke="#a7b09e" fill="none" />
          <path
            d={`M${graph.x} ${graph.y - graph.h}H${graph.x + graph.w}`}
            stroke="#c4cdbb"
            strokeDasharray="4 6"
          />
          <path
            d={`M${graph.x} ${graph.y}L${graph.x + graph.w} ${graph.y - graph.h}`}
            stroke="#bdc5b4"
            fill="none"
          />
          <path d={curve} stroke="#385b3c" strokeWidth="4" fill="none" />
          <path data-timing-playhead="" stroke="#75896b" strokeDasharray="3 6" fill="none" />
          <circle data-timing-dot="" r="8" fill="#d95736" />
          <g fill={muted} fontSize="17" fontFamily={FONT.mono}>
            <text x="21" y={graph.y - graph.h + 6}>
              1
            </text>
            <text x="21" y={graph.y + 5}>
              0
            </text>
            <text x="65" y="294">
              0s
            </text>
            <text x="495" y="294" textAnchor="end">
              {gesture.toFixed(2)}s
            </text>
          </g>
          <path d="M65 328H495" stroke="#bac4b2" />
          <path
            d={`M${65 - (430 * graph.min) / (graph.max - graph.min)} 321V335M${65 + (430 * (1 - graph.min)) / (graph.max - graph.min)} 321V335`}
            stroke="#75896b"
          />
          <circle data-timing-travel="" cy="328" r="7" fill="#d95736" />
          <text
            data-timing-phase=""
            x="65"
            y="36"
            fontSize="17"
            fill={muted}
            fontFamily={FONT.mono}
          />
          <text
            data-timing-meter=""
            x="495"
            y="36"
            textAnchor="end"
            fontSize="24"
            fill={ink}
            fontFamily={FONT.mono}
          />
        </svg>,
      )}
    </Timegroup>
  );
});
