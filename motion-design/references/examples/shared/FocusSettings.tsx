import type { CSSProperties, ReactNode } from "react";
import { Box, Label, motion, focus } from "./FocusStudy";

// Keep the same geometry in the contrast and blur studies for direct comparison.
export function settingLayout(h: number, tall: boolean) {
  return {
    x1: 30,
    y1: 79,
    x2: tall ? 30 : 375,
    y2: tall ? 334 : 79,
    w: tall ? 660 : 315,
    h: tall ? 216 : h - 114,
  };
}

type PanelPlacement = {
  x: number;
  y: number;
  w: number;
  h: number;
  active?: boolean;
  /** Percent of `duration`; at 100 or later the panel stays in its resting state. */
  changeAt: number;
  duration: number;
};
type PartStyle = (part: string, resting?: CSSProperties) => CSSProperties;

function SettingPanel({
  x,
  y,
  w,
  h,
  active = false,
  changeAt,
  duration,
  name,
  title,
  before,
  after,
  range: [min, max],
  sample,
  sampleKeyframes,
}: PanelPlacement & {
  name: string;
  title: string;
  before: string;
  after: string;
  range: [string, string];
  sample: (style: PartStyle) => ReactNode;
  sampleKeyframes: string;
}) {
  const style: PartStyle = (part, resting) =>
    changeAt >= 100 ? { opacity: 1, ...resting } : motion(`${name}-${part}`, duration);
  return (
    <g transform={`translate(${x} ${y})`}>
      <Box
        w={w}
        h={h}
        fill={active ? "#fff" : "#f8fafc"}
        stroke={active ? "#b2c0ec" : "#e2e6ed"}
        radius={8}
      />
      <Label x={20} y={29} size={12} color={focus.muted} weight={500}>
        {title}
      </Label>
      <g style={style("before")}>
        <Label x={20} y={60} size={22} weight={500}>
          {before}
        </Label>
      </g>
      <g style={style("after", { opacity: 0 })}>
        <Label x={20} y={60} size={22} weight={500}>
          {after}
        </Label>
      </g>
      <rect x="18" y="79" width={w - 36} height={h - 144} rx="5" fill="white" stroke="#edf0f5" />
      {sample(style)}
      <Label x={20} y={h - 44} size={10} color={focus.muted}>
        {min}
      </Label>
      <Label x={w - 62} y={h - 44} size={10} color={focus.muted}>
        {max}
      </Label>
      <path d={`M24 ${h - 26}H${w - 24}`} stroke="#d5dce7" strokeWidth="3" strokeLinecap="round" />
      <path
        d={`M24 ${h - 26}H${w - 24}`}
        stroke={focus.blue}
        strokeWidth="3"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
        style={style("track", { strokeDashoffset: 0.66 })}
      />
      <g style={style("thumb", { transform: `translateX(${24 + (w - 48) * 0.34}px)` })}>
        <circle cy={h - 26} r="6" fill="white" stroke={focus.blue} strokeWidth="1.5" />
      </g>
      <style>
        {`@keyframes ${name}-before{0%,${changeAt + 3 - 0.001}%{opacity:1}${changeAt + 3}%,100%{opacity:0}} @keyframes ${name}-after{0%,${changeAt + 3 - 0.001}%{opacity:0}${changeAt + 3}%,100%{opacity:1}} @keyframes ${name}-track{0%,${changeAt}%{stroke-dashoffset:.66;animation-timing-function:ease-in-out}${changeAt + 7}%,100%{stroke-dashoffset:.38}} @keyframes ${name}-thumb{0%,${changeAt}%{transform:translateX(${24 + (w - 48) * 0.34}px);animation-timing-function:ease-in-out}${changeAt + 7}%,100%{transform:translateX(${24 + (w - 48) * 0.62}px)}}` +
          sampleKeyframes}
      </style>
    </g>
  );
}

const spacingLines = ["Design for the details.", "Give every idea room.", "Make the work yours."];

export function SpacingPanel(placement: PanelPlacement) {
  const { changeAt } = placement,
    name = `setting-spacing-${changeAt}`;
  return (
    <SettingPanel
      {...placement}
      name={name}
      title="SPACING"
      before="Compact"
      after="Comfortable"
      range={["TIGHT", "LOOSE"]}
      sample={(style) => (
        <g>
          {spacingLines.map((text, i) => (
            <g key={text} style={style(`line-${i}`)}>
              <Label x={30} y={98 + i * 16} size={12} color="#778398">
                {text}
              </Label>
            </g>
          ))}
        </g>
      )}
      sampleKeyframes={spacingLines
        .map(
          (_, i) =>
            `@keyframes ${name}-line-${i}{0%,${changeAt}%{transform:translateY(0);animation-timing-function:ease-in-out}${changeAt + 7}%,100%{transform:translateY(${i * 5}px)}}`,
        )
        .join("")}
    />
  );
}

export function TypeSizePanel(placement: PanelPlacement) {
  const { changeAt } = placement,
    name = `setting-type-${changeAt}`;
  return (
    <SettingPanel
      {...placement}
      name={name}
      title="TYPE SIZE"
      before="Default"
      after="Large"
      range={["SMALL", "LARGE"]}
      sample={(style) => (
        <text x="30" y="109" fill="#526177" style={style("sample", { fontSize: 14 })}>
          Make room for ideas.
        </text>
      )}
      sampleKeyframes={`@keyframes ${name}-sample{0%,${changeAt}%{font-size:14px;animation-timing-function:ease-in-out}${changeAt + 7}%,100%{font-size:20px}}`}
    />
  );
}
