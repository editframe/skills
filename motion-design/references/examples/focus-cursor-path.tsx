import type { Aspect } from "../src/primitives";
import { FocusStudy, AppHeader, Box, Label, Pointer, motion, focus } from "./shared/FocusStudy";
export const duration = 7;
export const posterTime = 1.65;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <FocusStudy
      id={id}
      aspect={frame}
      duration={duration}
      title="Cursor motion → a destination"
      note="Quick approach. Small correction. A quiet hover."
    >
      {(h) => {
        const sy = h - 64,
          ey = 114;
        const path = `M 115 ${sy} C 270 ${sy - 24}, 410 ${ey + 8}, 634 ${ey}`;
        return (
          <>
            <Box h={h} />
            <AppHeader section="Overview" />
            <Label x={30} y={101} size={24} weight={600}>
              Website launch
            </Label>
            <Label x={30} y={130} size={15} color={focus.muted}>
              Everything the team needs for launch.
            </Label>
            <Box x={472} y={86} w={215} h={44} fill="#f7f9fc" />
            <g style={motion("fcp-hover", duration)}>
              <Box x={472} y={86} w={215} h={44} fill={focus.lilac} stroke="#9caeee" />
            </g>
            <Label x={491} y={119} size={16} weight={500}>
              View settings
            </Label>
            <path d="m658 108 5 5-5 5" fill="none" stroke={focus.muted} strokeWidth="1.5" />
            <path d="M30 154H690" stroke={focus.line} />
            <Label x={30} y={183} size={12} color={focus.muted}>
              MILESTONE
            </Label>
            <Label x={427} y={183} size={12} color={focus.muted}>
              OWNER
            </Label>
            <Label x={572} y={183} size={12} color={focus.muted}>
              STATUS
            </Label>
            {[
              ["Design review", "Mira", "Complete"],
              ["Content handoff", "Noah", "In progress"],
              ["Launch checklist", "Jules", "Planned"],
            ].map(([name, owner, status], i) => (
              <g key={name} transform={`translate(0 ${204 + i * (h > 400 ? 86 : 40)})`}>
                <circle
                  cx="38"
                  cy="0"
                  r="5"
                  fill={i === 0 ? "#7ca991" : i === 1 ? "#d7aa56" : "#d4dbe6"}
                />
                <Label x={55} y={5} size={15}>
                  {name}
                </Label>
                <Label x={427} y={5} size={13} color={focus.muted}>
                  {owner}
                </Label>
                <Label x={572} y={5} size={12} color={focus.muted}>
                  {status}
                </Label>
                <path d="M30 21H690" stroke="#edf0f5" />
              </g>
            ))}
            <path
              d={path}
              fill="none"
              stroke="#aab9eb"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength="1"
              strokeDasharray=".11 1"
              style={motion("fcp-trail", duration)}
            />
            <g
              style={{
                ...motion("fcp-pointer", duration),
                offsetPath: `path('${path}')`,
                offsetAnchor: "0px 0px",
                offsetRotate: "0deg",
              }}
            >
              <circle r="16" fill={focus.blue} style={motion("fcp-halo", duration)} />
              <Pointer />
            </g>
            <g style={motion("fcp-hover", duration)}>
              <Box x={487} y={138} w={186} h={29} fill="#253044" stroke="#253044" radius={7} />
              <Label x={501} y={158} size={14} color="white">
                Customize this view
              </Label>
            </g>
            <style>{`@keyframes fcp-pointer {0%,16%{offset-distance:0%;animation-timing-function:cubic-bezier(.14,.55,.28,1)}28%{offset-distance:98.4%;animation-timing-function:ease-out}31%,75%{offset-distance:100%}100%{offset-distance:100%}} @keyframes fcp-trail {0%,16%{stroke-dashoffset:.11;opacity:0;animation-timing-function:cubic-bezier(.14,.55,.28,1)}17%{opacity:.8}28%{stroke-dashoffset:-.874;opacity:.5}33%,100%{stroke-dashoffset:-1;opacity:0}} @keyframes fcp-halo {0%,15%{opacity:0}18%,26%{opacity:.08}32%,100%{opacity:0}} @keyframes fcp-hover {0%,33%{opacity:0}36%,100%{opacity:1}}`}</style>
          </>
        );
      }}
    </FocusStudy>
  );
}
