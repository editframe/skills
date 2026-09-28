import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, type Aspect } from "../src/primitives";

export const duration = 7.8;
export const posterTime = 2.1;
export const aspect = "landscape" as const;
const colors = ["#ef8669", "#f1bd85", "#f5d99c", "#c1ccbb", "#7aada8"];
const smooth = (n: number) => {
  const x = Math.max(0, Math.min(1, n));
  return x * x * (3 - 2 * x);
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const contactTime = (index: number) => (index === 0 ? 1.55 : 1.55 + index * 0.46);

export function relayFrame(t: number) {
  const units = colors.map((color, i) => {
    const origin = 150 + i * 190;
    const contact = i === 4 ? 3.53 : contactTime(i);
    let x = origin;
    if (i === 0) {
      x -= 20 * smooth((t - 0.4) / 0.4);
      x += 138 * Math.pow(clamp((t - 0.8) / 0.75), 1.4);
    } else {
      const start = contactTime(i - 1),
        travel = i === 4 ? 154 : 118;
      x += travel * clamp((t - start) / (i === 4 ? 0.6 : 0.46));
    }
    const reset = smooth((t - 5.35 - i * 0.065) / 1.25);
    x += (origin - x) * reset;
    const since = t - contact;
    const squeeze = since >= 0 && since < 0.3 ? Math.sin((since / 0.3) * Math.PI) * 0.09 : 0;
    const received = i === 0 ? -10 : t - contactTime(i - 1);
    const pulse = received >= 0 && received < 0.4 ? 1 - received / 0.4 : 0;
    return { x, color, scaleX: 1 - squeeze, scaleY: 1 + squeeze, pulse };
  });
  const hit = t - 3.53;
  const bend = hit >= 0 && hit < 1 ? Math.sin(hit * 13) * Math.exp(-hit * 5) * 21 : 0;
  return { units, bend };
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const [width, height] = ASPECT[frame],
    portrait = frame === "portrait";
  const initial = relayFrame(0);
  const initialize = (root: EFTimegroupElement) => {
    const units = Array.from(root.querySelectorAll<SVGGElement>("[data-relay-unit]"));
    const pulses = Array.from(root.querySelectorAll<SVGCircleElement>("[data-relay-pulse]"));
    const bumper = root.querySelector<SVGPathElement>("[data-relay-bumper]");
    const draw = (t: number) => {
      const state = relayFrame(t);
      state.units.forEach((unit, i) => {
        units[i]?.setAttribute(
          "transform",
          `translate(${unit.x} 360) scale(${unit.scaleX} ${unit.scaleY})`,
        );
        pulses[i]?.setAttribute("r", String(42 + (1 - unit.pulse) * 20));
        pulses[i]?.setAttribute("opacity", String(unit.pulse * 0.5));
      });
      bumper?.setAttribute("d", `M1100 310 Q${1100 + state.bend} 360 1100 398`);
    };
    draw(0);
    root.addFrameTask(({ ownCurrentTime }) => draw(ownCurrentTime));
  };
  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration={`${duration}s`}
      loop
      initializer={initialize}
      style={{ position: "relative", width, height, background: "#202f34", overflow: "hidden" }}
    >
      <svg
        viewBox={portrait ? "0 0 720 1200" : "0 0 1200 720"}
        role="img"
        aria-label="Five bodies transfer motion only at contact, followed by a resilient stop and an orderly reset"
        style={{ width: "100%", height: "100%" }}
      >
        <g transform={portrait ? "translate(720 0) rotate(90)" : undefined}>
          <path
            d="M90 400 H1120"
            fill="none"
            stroke="#456066"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            data-relay-bumper=""
            d="M1100 310 Q1100 360 1100 398"
            fill="none"
            stroke="#ef8669"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {initial.units.map((unit, i) => (
            <g key={i} data-relay-unit="" transform={`translate(${unit.x} 360)`}>
              <circle
                data-relay-pulse=""
                r="42"
                fill="none"
                stroke={unit.color}
                strokeWidth="2"
                opacity="0"
              />
              <circle r="36" fill={unit.color} />
              <circle cx="-10" cy="-11" r="7" fill="#fff4dc" opacity=".28" />
            </g>
          ))}
        </g>
      </svg>
    </Timegroup>
  );
}
