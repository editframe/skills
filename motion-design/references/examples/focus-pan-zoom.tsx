import type { Aspect } from "../src/primitives";
import { FocusStudy, AppHeader, Box, Label, Pointer, motion, focus } from "./shared/FocusStudy";
export const duration = 9;
export const posterTime = 6.2;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <FocusStudy
      id={id}
      aspect={frame}
      duration={duration}
      title="Pan + zoom → detail, then context"
      note="Follow the access setting. Read the change. Return to the page."
    >
      {(h, tall) => {
        const x = tall ? 180 : 374,
          y = tall ? 357 : 128,
          w = tall ? 420 : 310,
          cx = x + w / 2,
          cy = y + 78,
          z = tall ? 1.38 : 1.65;
        const cameraX = Math.max(720 - 720 * z, Math.min(0, 360 - z * cx));
        const cameraY = Math.max(h - h * z, Math.min(0, h / 2 - z * cy));
        return (
          <>
            <defs>
              <clipPath id={`${id}-viewport`}>
                <rect width="720" height={h} rx="12" />
              </clipPath>
            </defs>
            <g clipPath={`url(#${id}-viewport)`}>
              <g style={motion("fpz-camera", duration)}>
                <Box h={h} />
                <AppHeader section="Page settings" />
                <Label x={30} y={91} size={22} weight={600}>
                  Website launch
                </Label>
                <Box
                  x={30}
                  y={128}
                  w={tall ? 660 : 310}
                  h={tall ? 190 : 156}
                  fill="#f8fafc"
                  radius={8}
                />
                <Label x={50} y={154} size={11} color={focus.muted}>
                  PAGE DETAILS
                </Label>
                {[
                  ["Status", "In progress"],
                  ["Owner", "Jules Lee"],
                  ["Target", "Oct 8, 2026"],
                ].map(([k, v], i) => (
                  <g key={k}>
                    <Label x={50} y={185 + i * 32} size={13} color={focus.muted}>
                      {k}
                    </Label>
                    <Label x={157} y={185 + i * 32} size={13}>
                      {v}
                    </Label>
                  </g>
                ))}
                <Box x={x} y={y} w={w} h={156} fill="white" radius={8} />
                <Label x={x + 20} y={y + 26} size={11} color={focus.muted}>
                  GENERAL ACCESS
                </Label>
                <g style={motion("fpz-before", duration)}>
                  <Label x={x + 20} y={y + 65} size={18} weight={500}>
                    Anyone with the link
                  </Label>
                </g>
                <g style={motion("fpz-after", duration)}>
                  <Label x={x + 20} y={y + 65} size={18} weight={500}>
                    Only invited people
                  </Label>
                </g>
                <path
                  d={`m${x + w - 33} ${y + 56} 5 5 5-5`}
                  fill="none"
                  stroke={focus.muted}
                  strokeWidth="1.3"
                />
                <Label x={x + 20} y={y + 96} size={12} color={focus.muted}>
                  Control who can open this page.
                </Label>
                <g style={motion("fpz-after", duration)}>
                  <circle cx={x + 24} cy={y + 125} r="3" fill={focus.green} />
                  <Label x={x + 34} y={y + 129} size={11} color={focus.green}>
                    Access updated
                  </Label>
                </g>
                <g style={motion("fpz-menu", duration)}>
                  <Box x={x + 12} y={y + 73} w={w - 24} h={72} radius={6} />
                  <Label x={x + 24} y={y + 97} size={12} color={focus.muted}>
                    Anyone with the link
                  </Label>
                  <rect
                    x={x + 17}
                    y={y + 106}
                    width={w - 34}
                    height="30"
                    rx="4"
                    fill={focus.lilac}
                  />
                  <Label x={x + 24} y={y + 125} size={12}>
                    Only invited people
                  </Label>
                </g>
                <g style={motion("fpz-cursor", duration)}>
                  <Pointer />
                </g>
              </g>
            </g>
            <style>{`@keyframes fpz-camera{0%,23%{transform:translate(0,0) scale(1);animation-timing-function:cubic-bezier(.65,0,.2,1)}35%,73%{transform:translate(${cameraX}px,${cameraY}px) scale(${z});animation-timing-function:cubic-bezier(.65,0,.2,1)}85%,100%{transform:translate(0,0) scale(1)}} @keyframes fpz-cursor{0%,11%{transform:translate(${x + 50}px,${y + 140}px);animation-timing-function:cubic-bezier(.18,.65,.3,1)}20%,42%{transform:translate(${x + w - 32}px,${y + 59}px);animation-timing-function:cubic-bezier(.2,.7,.3,1)}49%,57%{transform:translate(${x + w - 58}px,${y + 119}px);animation-timing-function:ease-out}64%,100%{transform:translate(${x + w - 25}px,${y + 146}px)}} @keyframes fpz-menu{0%,40%{opacity:0}42%,55%{opacity:1}56%,100%{opacity:0}} @keyframes fpz-before{0%,55.99%{opacity:1}56%,100%{opacity:0}} @keyframes fpz-after{0%,55.99%{opacity:0}56%,100%{opacity:1}}`}</style>
          </>
        );
      }}
    </FocusStudy>
  );
}
