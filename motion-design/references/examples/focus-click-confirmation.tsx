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
export const duration = 6;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <FocusStudy
      id={id}
      aspect={frame}
      duration={duration}
      title="Click → confirmation"
      note="Arrive. Pause. Press. Leave the result in view."
    >
      {(h) => {
        const y = h * 0.57,
          tx = 612,
          ty = y + 30;
        return (
          <>
            <Box h={h} />
            <AppHeader section="Share page" />
            <Label x={32} y={88} size={25} weight={600}>
              Website launch
            </Label>
            <Label x={32} y={115} size={15} color={focus.muted}>
              Share the plan with your team.
            </Label>
            <Avatar x={44} y={151} initials="JL" />
            <Label x={65} y={148} size={14} weight={500}>
              Jules Lee
            </Label>
            <Label x={65} y={165} size={12} color={focus.muted}>
              jules@northstar.example
            </Label>
            <Label x={621} y={154} size={13} color={focus.muted}>
              Owner
            </Label>
            <Box x={32} y={y} w={448} h={58} fill="#f8fafc" radius={8} />
            <path
              d={`M50 ${y + 28}v-5a5 5 0 0110 0v5m-12 0h14v12h-14Z`}
              fill="none"
              stroke={focus.muted}
              strokeWidth="1.2"
            />
            <Label x={77} y={y + 34} size={14} color={focus.muted}>
              northstar.app / website-launch
            </Label>
            <g transform={`translate(494 ${y})`}>
              <g style={motion("fcc-press", duration)}>
                <Box w={194} h={58} fill={focus.blue} stroke={focus.blue} />
                <g style={motion("fcc-before", duration)}>
                  <path
                    d="M 27 20 h12 v17 H27Z M32 16h12v17"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.6"
                  />
                  <Label x={58} y={37} color="white" size={16} weight={500}>
                    Copy link
                  </Label>
                </g>
                <g style={motion("fcc-after", duration)}>
                  <path d="m28 29 5 5 10-12" fill="none" stroke="white" strokeWidth="2" />
                  <Label x={58} y={37} color="white" size={16} weight={500}>
                    Link copied
                  </Label>
                </g>
              </g>
            </g>
            <g transform={`translate(${tx} ${ty})`}>
              <circle
                r="9"
                fill="none"
                stroke="#b7c7ff"
                strokeWidth="2"
                style={motion("fcc-ring", duration)}
              />
            </g>
            <g style={motion("fcc-cursor", duration)}>
              <Pointer />
            </g>
            <g style={motion("fcc-receipt", duration)}>
              <Label x={32} y={y + 90} size={16} color={focus.green}>
                ✓ Link copied · Only invited people can open it
              </Label>
            </g>
            <style>{`@keyframes fcc-cursor {0%,10%{transform:translate(650px,${ty + 66}px);animation-timing-function:cubic-bezier(.16,.6,.3,1)}20%{transform:translate(${tx + 3}px,${ty + 1}px);animation-timing-function:ease-out}24%,59%{transform:translate(${tx}px,${ty}px);animation-timing-function:cubic-bezier(.3,0,.2,1)}70%,100%{transform:translate(668px,${ty + 62}px)}} @keyframes fcc-press {0%,30%{transform:translateY(0)}32%,34%{transform:translateY(1.5px)}37%,100%{transform:translateY(0)}} @keyframes fcc-ring {0%,32%{opacity:0;transform:scale(.6)}33%{opacity:1;transform:scale(.7)}41%,100%{opacity:0;transform:scale(2.8)}} @keyframes fcc-before {0%,35.9%{opacity:1}36%,100%{opacity:0}} @keyframes fcc-after {0%,35.9%{opacity:0}36%,100%{opacity:1}} @keyframes fcc-receipt {0%,37%{opacity:0;transform:translateY(3px)}43%,100%{opacity:1;transform:translateY(0)}}`}</style>
          </>
        );
      }}
    </FocusStudy>
  );
}
