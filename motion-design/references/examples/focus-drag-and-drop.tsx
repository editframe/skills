import type { Aspect } from "../src/primitives";
import { FocusStudy, AppHeader, Box, Label, Pointer, motion, focus } from "./shared/FocusStudy";
export const duration = 8;
export const posterTime = 3.6;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <FocusStudy
      id={id}
      aspect={frame}
      duration={duration}
      title="Drag & drop → a new order"
      note="Grab the handle. Neighbors make room as you pass."
    >
      {(h) => {
        const y = 115,
          step = (h - 151) / 3,
          cardH = step - 16,
          delta = step * 2;
        const card = (name: string, sub: string) => (
          <>
            <Box w={620} h={cardH} />
            {[0, 1].flatMap((c) =>
              [0, 1, 2].map((r) => (
                <circle
                  key={`${c}-${r}`}
                  cx={22 + c * 5}
                  cy={cardH / 2 - 5 + r * 5}
                  r="1.2"
                  fill={focus.muted}
                />
              )),
            )}
            <Label x={54} y={cardH / 2 + 6} size={16} weight={500}>
              {name}
            </Label>
            <Label x={526} y={cardH / 2 + 5} size={13} color={focus.muted}>
              {sub}
            </Label>
          </>
        );
        return (
          <>
            <Box h={h} />
            <AppHeader section="Page structure" />
            <Label x={50} y={85} size={20} weight={600}>
              Website launch
            </Label>
            <Label x={550} y={85} size={13} color={focus.muted}>
              3 sections
            </Label>
            <rect
              x="50"
              y={y + delta}
              width="620"
              height={cardH}
              rx="12"
              fill={focus.lilac}
              stroke="#aab9eb"
              strokeDasharray="4 5"
              style={motion("fdd-slot", duration)}
            />
            {["Release details", "Team checklist"].map((name, i) => (
              <g key={name} transform={`translate(50 ${y + step * (i + 1)})`}>
                <g style={motion(`fdd-row-${i}`, duration)}>
                  {card(name, i === 0 ? "2 blocks" : "1 block")}
                </g>
              </g>
            ))}
            <g transform={`translate(50 ${y})`}>
              <g style={motion("fdd-drag", duration)}>
                {card("Launch overview", "4 blocks")}
                <rect
                  width="620"
                  height={cardH}
                  rx="12"
                  fill="none"
                  stroke="#93a7ea"
                  strokeWidth="1.5"
                  style={motion("fdd-selected", duration)}
                />
                <g style={motion("fdd-pointer", duration)}>
                  <g style={motion("fdd-arrow", duration)}>
                    <Pointer />
                  </g>
                  <g style={motion("fdd-hand", duration)}>
                    <Pointer kind="grab" />
                  </g>
                </g>
              </g>
            </g>
            <g style={motion("fdd-saved", duration)}>
              <circle cx="57" cy={h - 17} r="3" fill={focus.green} />
              <Label x={68} y={h - 13} size={11} color={focus.muted}>
                Page order saved
              </Label>
            </g>
            <style>{`@keyframes fdd-saved {0%,70%{opacity:0}75%,100%{opacity:1}} @keyframes fdd-drag {0%,21%{transform:translate(0,0);filter:drop-shadow(0 0 0 #172a4500)}25%{transform:translate(7px,-4px);filter:drop-shadow(0 7px 7px #172a4522);animation-timing-function:cubic-bezier(.35,0,.25,1)}58%,64%{transform:translate(7px,${delta - 4}px);filter:drop-shadow(0 7px 7px #172a4522);animation-timing-function:ease-out}69%,100%{transform:translate(0,${delta}px);filter:drop-shadow(0 0 0 #172a4500)}} @keyframes fdd-row-0 {0%,34%{transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.3,1)}42%,100%{transform:translateY(${-step}px)}} @keyframes fdd-row-1 {0%,45%{transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.3,1)}53%,100%{transform:translateY(${-step}px)}} @keyframes fdd-pointer {0%,9%{transform:translate(173px,${cardH / 2 + 24}px);animation-timing-function:cubic-bezier(.16,.6,.3,1)}16%{transform:translate(27px,${cardH / 2 + 1}px)}19%,72%{transform:translate(24px,${cardH / 2}px);animation-timing-function:cubic-bezier(.3,0,.25,1)}82%,100%{transform:translate(159px,${cardH / 2 + 22}px)}} @keyframes fdd-arrow {0%,20.9%{opacity:1}21%,66.9%{opacity:0}67%,100%{opacity:1}} @keyframes fdd-hand {0%,20.9%{opacity:0}21%,66.9%{opacity:1}67%,100%{opacity:0}} @keyframes fdd-slot {0%,44%{opacity:0}50%,66%{opacity:1}72%,100%{opacity:0}} @keyframes fdd-selected {0%,20%{opacity:0}24%,66%{opacity:1}75%,100%{opacity:0}}`}</style>
          </>
        );
      }}
    </FocusStudy>
  );
}
