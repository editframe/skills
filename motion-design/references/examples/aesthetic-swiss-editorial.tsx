import { AestheticFilm, type AestheticLook, type CoverPainter } from "./shared/aesthetic-film";
import {
  ease,
  labelsOn,
  line,
  mix,
  mono,
  rect,
  sans,
  solid,
  stackedSlabs,
  text,
  type C,
} from "./shared/canvas-paint";
import type { Aspect } from "../src/primitives";

export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
function detail(...args: Parameters<typeof text>) {
  if (labelsOn(args[0])) text(...args);
}
function reveal(
  c: C,
  words: string[],
  x: number,
  y: number,
  size: number,
  color: string,
  t: number,
  font = sans,
  weight = "700",
) {
  words.forEach((word, i) => {
    const p = ease((t - 0.15 - i * 0.16) / 0.85);
    c.save();
    c.beginPath();
    c.rect(x - 5, y + (i - 1) * size * 1.03 + size * 0.08, 1100, size * 1.05);
    c.clip();
    text(c, word, x, y + i * size * 1.03 + (1 - p) * size * 1.15, size, color, font, weight);
    c.restore();
  });
}
function explodedVolume(c: C, h: number, t: number, palette: string[]) {
  const [, ink, paper, pink] = palette,
    tall = h > 900;
  const top = 70,
    bottom = tall ? h * 0.66 : h * 0.55;
  // The diagonal grid is also the plan of the exploded object: flat bars acquire depth.
  c.save();
  c.beginPath();
  c.rect(0, top, 1200, bottom - top);
  c.clip();
  c.translate(590, (top + bottom) / 2);
  c.rotate(-Math.PI / 5);
  for (let i = 0; i < 5; i++) {
    const delay = i * 0.09,
      p = ease((t - delay) / 0.65);
    rect(c, -850 + (1 - p) * 160, (i - 2) * 95, 1700, 58, i === 2 ? paper : ink);
  }
  c.restore();
  const depth = 0.08 + 0.56 * ease((t - 1) / 2);
  solid(
    c,
    stackedSlabs(t * 0.22, [paper, pink, paper], depth),
    tall ? 800 : 900,
    tall ? h * 0.38 : 250,
    h > 1600 ? 1080 : tall ? 760 : 510,
  );
  const y = bottom + (h > 1600 ? 190 : 125);
  reveal(
    c,
    ["form follows", "order."],
    48,
    y,
    h > 1600 ? 183 : tall ? 123 : 119,
    ink,
    t,
    sans,
    "900",
  );
  detail(c, "01 / VOLUME", tall ? 55 : 790, h - 66, 17, ink, mono);
  detail(c, "Three parts. One system.", tall ? 55 : 790, h - 39, 18, ink, sans);
}
function splitSpecimen(c: C, h: number, t: number, palette: string[]) {
  const [red, ink, paper, pink] = palette,
    tall = h > 900;
  const cut = mix(600, 760, ease((t - 0.4) / 2)),
    top = 80,
    foot = h - 80;
  rect(c, 0, top, cut, foot - top, ink);
  rect(c, cut + 12, top, 1200 - cut - 12, foot - top, paper);
  c.save();
  c.beginPath();
  c.rect(0, top, cut, foot - top);
  c.clip();
  text(
    c,
    "Aa",
    35,
    top + Math.min(foot - top, h > 1600 ? 610 : tall ? 410 : 270),
    h > 1600 ? 530 : tall ? 420 : 330,
    red,
    sans,
    "900",
  );
  solid(
    c,
    stackedSlabs(t * 0.22, [paper, paper, pink], 0.48),
    cut * 0.5,
    top + (foot - top) * (h > 1600 ? 0.61 : 0.72),
    h > 1600 ? 1080 : tall ? 720 : 450,
  );
  c.restore();
  const x = cut + 36,
    step = (foot - top) / 3;
  ["ALIGN", "SPACE", "REPEAT"].forEach((v, i) => {
    const yy = top + i * step;
    line(
      c,
      [
        [x, yy + 18],
        [1170, yy + 18],
      ],
      ink,
      2,
    );
    text(c, `0${i + 1}`, x, yy + 56, 23, ink, mono);
    text(
      c,
      v,
      x,
      yy + Math.min(step - 20, 140),
      Math.min(61, (1200 - x - 25) / (v.length * 0.64)),
      ink,
      sans,
      "900",
    );
  });
  text(c, "A PLACE FOR EVERYTHING.", 48, h - 31, 27, ink, sans, "700");
}
function countedGroups(c: C, h: number, t: number, palette: string[]) {
  const [, ink, paper] = palette,
    tall = h > 900;
  reveal(c, ["every part", "counts."], 48, tall ? 220 : 177, tall ? 157 : 150, ink, t, sans, "900");
  if (h > 1600) {
    const top = 560,
      row = (h - 700) / 3,
      p = ease((t - 0.2) / 1.5);
    for (let g = 0; g < 3; g++) {
      const yy = top + g * row;
      line(
        c,
        [
          [48, yy],
          [1152, yy],
        ],
        ink,
        2,
      );
      text(c, ["20", "25", "15"][g], 48, yy + 175, 168, ink, sans, "900");
      text(c, ["FORM", "SPACE", "RHYTHM"][g], 52, yy + 235, 26, ink, mono);
      for (let i = 0; i < [20, 25, 15][g]; i++) {
        const n = i + [0, 20, 45][g];
        rect(
          c,
          mix(250 + (n % 10) * 55, 580 + (i % 5) * 66, p),
          mix(850 + Math.floor(n / 10) * 55, yy + 65 + Math.floor(i / 5) * 66, p),
          51,
          51,
          g === 1 ? paper : ink,
        );
      }
    }
    return;
  }
  const top = tall ? h * 0.39 : 360,
    bottom = h - 95,
    gw = 344,
    gap = tall ? 42 : 31,
    unit = tall ? 32 : 23,
    p = ease((t - 0.2) / 1.5);
  for (let g = 0; g < 3; g++) {
    const x = 48 + g * 374;
    line(
      c,
      [
        [x, top],
        [x + gw, top],
      ],
      ink,
      2,
    );
    const yy = tall ? top + 130 : top + 40;
    text(c, ["20", "25", "15"][g], x, yy, tall ? 110 : 37, ink, sans, "900");
    const gridY = tall ? yy + 65 : yy + 30;
    for (let i = 0; i < [20, 25, 15][g]; i++) {
      const global = i + [0, 20, 45][g],
        dx = x + (i % 5) * gap,
        dy = gridY + Math.floor(i / 5) * gap;
      rect(
        c,
        mix(420 + (global % 10) * 34, dx, p),
        mix(gridY + Math.floor(global / 10) * 34, dy, p),
        unit,
        unit,
        g === 1 ? paper : ink,
      );
    }
    text(c, ["FORM", "SPACE", "RHYTHM"][g], x, bottom + 45, 18, ink, mono);
  }
}
function runningHead(c: C, _h: number, scene: number, p: string[]) {
  const n = String(scene + 1).padStart(2, "0");
  text(c, "FORM / STUDIES IN ORDER", 48, 38, 15, p[1], sans, "700");
  text(c, `${n} — 03`, 1152, 38, 15, p[1], sans, "700", "right");
}
/** A red plane grows from the left edge, then clears toward the right. */
const redSweep: CoverPainter = (c, h, q, coverage, p) => {
  const w = 1200 * coverage;
  rect(c, q < 0.5 ? 0 : 1200 - w, 0, w, h, p[0]!);
};
export const look: AestheticLook = {
  palette: ["#ed321f", "#161616", "#fff9ec", "#f8ad9f"],
  scenes: [explodedVolume, splitSpecimen, countedGroups],
  labels: runningHead,
  handoff: {
    cover: redSweep,
    label: "Signal-red sweep",
    reason: "A firm red plane carries the poster grid across the edit.",
    study: "color-block-wipe",
  },
};
/** Three composed scenes; source mechanisms and research: data/aesthetics.json. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      look={look}
      label="Swiss Editorial: Order, with conviction. Three scenes combine type, form, and layout with connecting transitions."
    />
  );
}
