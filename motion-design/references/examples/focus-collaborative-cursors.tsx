import type { Aspect } from "../src/primitives";
import {
  FocusStudy,
  AppHeader,
  Avatar,
  Box,
  Label,
  Pointer,
  motion,
  focus,
} from "./shared/FocusStudy";
export const duration = 9;
export const posterTime = 4.9;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <FocusStudy
      id={id}
      aspect={frame}
      duration={duration}
      title="Multiple cursors → shared authorship"
      note="Two people. Separate decisions. One shared result."
    >
      {(h, tall) => {
        const ay = 90,
          bx = tall ? 40 : 380,
          by = tall ? 340 : 90,
          cw = tall ? 640 : 300,
          ch = tall ? 205 : 180;
        const ax = 40 + cw - 63,
          nx = bx + cw - 63,
          aY = ay + 129,
          nY = by + 129;
        return (
          <>
            <Box h={h} />
            <AppHeader section="Launch review" />
            <Avatar x={578} y={70} initials="M" />
            <Avatar x={601} y={70} initials="N" color="#9b547c" />
            <Label x={620} y={74} size={11} color={focus.muted}>
              2 online
            </Label>
            {[
              [40, ay, "Layout", "a", focus.blue],
              [bx, by, "Copy", "b", "#9b547c"],
            ].map(([x, y, title, suffix, color]) => (
              <g key={String(suffix)} transform={`translate(${x} ${y})`}>
                <Box w={cw} h={ch} />
                <Label x={20} y={37} size={18} weight={500}>
                  {title}
                </Label>
                <Label x={20} y={66} size={13} color={focus.muted}>
                  {suffix === "a" ? "Homepage · desktop" : "Homepage · headline"}
                </Label>
                <Label x={20} y={88} size={15}>
                  {suffix === "a" ? "Hero + feature grid" : "Make room for great work."}
                </Label>
                <g style={motion(`fmc-pending-${suffix}`, duration)}>
                  <Label x={20} y={132} size={14} color={focus.muted}>
                    Awaiting review
                  </Label>
                </g>
                <g style={motion(`fmc-reviewed-${suffix}`, duration)}>
                  <Label x={20} y={132} size={14} color={focus.green}>
                    ✓ Reviewed
                  </Label>
                </g>
                <Box x={cw - 110} y={107} w={91} h={35} fill="#f5f7fb" />
                <g style={motion(`fmc-pending-${suffix}`, duration)}>
                  <Label x={cw - 95} y={130} size={14}>
                    Review
                  </Label>
                </g>
                <g style={motion(`fmc-reviewed-${suffix}`, duration)}>
                  <Label x={cw - 96} y={130} size={13} color={focus.green}>
                    ✓ Done
                  </Label>
                </g>
                <rect
                  width={cw}
                  height={ch}
                  rx="12"
                  fill="none"
                  stroke={String(color)}
                  strokeWidth="1.5"
                  style={motion(`fmc-reviewed-${suffix}`, duration)}
                />
              </g>
            ))}
            <g style={motion("fmc-a", duration)}>
              <Pointer color={focus.blue} label="Mira" />
            </g>
            <g style={motion("fmc-b", duration)}>
              <Pointer color="#9b547c" label="Noah" />
            </g>
            <g style={motion("fmc-done", duration)}>
              <Label x={40} y={h - 33} size={17} color={focus.green} weight={500}>
                ✓ Both sections reviewed
              </Label>
            </g>
            <style>{`@keyframes fmc-a {0%,12%{transform:translate(91px,${ay + ch + 10}px);animation-timing-function:cubic-bezier(.16,.6,.3,1)}22%{transform:translate(${ax - 3}px,${aY + 2}px)}25%,39%{transform:translate(${ax}px,${aY}px);animation-timing-function:cubic-bezier(.3,0,.25,1)}48%,100%{transform:translate(${ax - 30}px,${ay + ch - 32}px)}} @keyframes fmc-b {0%,29%{transform:translate(${bx + 115}px,${by + ch + 10}px);animation-timing-function:cubic-bezier(.2,.6,.3,1)}40%{transform:translate(${nx - 2}px,${nY + 1}px)}43%,61%{transform:translate(${nx}px,${nY}px);animation-timing-function:cubic-bezier(.3,0,.25,1)}70%,100%{transform:translate(${nx - 24}px,${by + ch - 32}px)}} @keyframes fmc-pending-a {0%,32.9%{opacity:1}33%,100%{opacity:0}} @keyframes fmc-reviewed-a {0%,32.9%{opacity:0}33%,100%{opacity:1}} @keyframes fmc-pending-b {0%,50.9%{opacity:1}51%,100%{opacity:0}} @keyframes fmc-reviewed-b {0%,50.9%{opacity:0}51%,100%{opacity:1}} @keyframes fmc-done {0%,57%{opacity:0;transform:translateY(3px)}62%,100%{opacity:1;transform:translateY(0)}}`}</style>
          </>
        );
      }}
    </FocusStudy>
  );
}
