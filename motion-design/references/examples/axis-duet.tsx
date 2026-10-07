import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { Solo, type Aspect } from "../src/primitives";
import { TypeField } from "./shared/type-studies";

export const duration = 5.8;
export const posterTime = 2.65;
export const aspect = "landscape" as const;

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {
  const p = clamp(n);
  return p * p * (3 - 2 * p);
};
function exchange(t: number) {
  if (t < 0.55) return 0;
  if (t < 0.85) return -0.035 * smooth((t - 0.55) / 0.3);
  if (t < 2.05) return -0.035 + 1.06 * smooth((t - 0.85) / 1.2);
  if (t < 2.3) return 1.025 - 0.025 * smooth((t - 2.05) / 0.25);
  if (t < 3.05) return 1;
  if (t < 3.35) return 1 + 0.035 * smooth((t - 3.05) / 0.3);
  if (t < 4.55) return 1.035 - 1.06 * smooth((t - 3.35) / 1.2);
  if (t < 4.8) return -0.025 + 0.025 * smooth((t - 4.55) / 0.25);
  return 0;
}

// Drawn centerlines, in a unit em. Width changes move these actual contours;
// stroke weight is independent, so this is not a scaled font or tracking study.
function letter(letter: string, x: number, y: number, w: number, h: number) {
  const p = (a: number, b: number) => `${(x + a * w).toFixed(3)},${(y + b * h).toFixed(3)}`;
  switch (letter) {
    case "P":
      return `M${p(0, 1)} L${p(0, 0)} L${p(0.52, 0)} C${p(1.16, 0)} ${p(1.16, 0.51)} ${p(0.52, 0.51)} L${p(0, 0.51)}`;
    case "U":
      return `M${p(0, 0)} L${p(0, 0.7)} C${p(0, 1.1)} ${p(1, 1.1)} ${p(1, 0.7)} L${p(1, 0)}`;
    case "S":
      return `M${p(0.98, 0.08)} C${p(0.18, -0.21)} ${p(-0.32, 0.38)} ${p(0.5, 0.5)} C${p(1.34, 0.62)} ${p(0.88, 1.21)} ${p(0.02, 0.91)}`;
    case "H":
      return `M${p(0, 0)} L${p(0, 1)} M${p(1, 0)} L${p(1, 1)} M${p(0, 0.5)} L${p(1, 0.5)}`;
    default:
      return `M${p(0, 0)} L${p(0, 1)} L${p(1, 1)}`;
  }
}

function layout(t: number, stacked: boolean) {
  const amount = exchange(t);
  const available = stacked ? 1320 : 936;
  const a = (stacked ? 410 : 240) + amount * (stacked ? 500 : 456);
  const widths = [a, available - a];
  const weights = [14 + 29 * amount, 43 - 29 * amount];
  return widths.map((width, row) => {
    const weight = weights[row];
    const gap = weight + (stacked ? 22 : 16);
    const glyphWidth = (width - weight - gap * 3) / 4;
    const x = stacked ? (1080 - width) / 2 + weight / 2 : (row ? 100 + a + 64 : 100) + weight / 2;
    const y = stacked ? (row ? 560 : 170) : 190;
    const h = stacked ? 250 : 210;
    return {
      weight,
      paths: [...(row ? "PULL" : "PUSH")].map((char, i) =>
        letter(char, x + i * (glyphWidth + gap), y, glyphWidth, h),
      ),
    };
  });
}

function initialize(root: EFTimegroupElement) {
  const paths = Array.from(root.querySelectorAll<SVGPathElement>("[data-duet-glyph]"));
  const stacked = root.querySelector("svg")?.getAttribute("data-stacked") === "true";
  const draw = (time: number) => {
    layout(time, stacked).forEach((row, r) =>
      row.paths.forEach((d, i) => {
        const path = paths[r * 4 + i];
        path?.setAttribute("d", d);
        path?.setAttribute("stroke-width", row.weight.toFixed(3));
      }),
    );
  };
  draw(0);
  root.addFrameTask(({ ownCurrentTime }) => draw(ownCurrentTime));
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const stacked = frame !== "landscape";
  const initial = layout(0, stacked);

  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#20231e" color="#d9ed87">
        <Timegroup
          mode="fixed"
          duration={`${duration}s`}
          initializer={initialize}
          className="absolute inset-0"
        >
          <svg
            data-stacked={String(stacked)}
            viewBox={stacked ? "0 0 1080 980" : "0 0 1200 600"}
            width="100%"
            height="100%"
            role="img"
            aria-label="PUSH and PULL trade letter width and stroke weight"
          >
            {initial.map((row, r) => (
              <g
                key={r}
                fill="none"
                stroke={r ? "#ede9de" : "#d9ed87"}
                strokeLinecap="square"
                strokeLinejoin="round"
              >
                {row.paths.map((d, i) => (
                  <path key={i} data-duet-glyph="" d={d} strokeWidth={row.weight} />
                ))}
              </g>
            ))}
          </svg>
        </Timegroup>
      </TypeField>
    </Solo>
  );
}
