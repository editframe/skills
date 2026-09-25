import { useCallback } from "react";
import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, type Aspect } from "../../src/primitives";
import { compositeTransition, smooth, type TransitionKind } from "./transition-compositor";

type C = CanvasRenderingContext2D;
export type TransitionStudyKind =
  | Exclude<TransitionKind, "cut" | "rings" | "push" | "rise" | "iris" | "blinds" | "zoom" | "blur">
  | "action"
  | "morph";
export const TRANSITION_DURATION = 8;
const TAU = Math.PI * 2;
function circle(c: C, x: number, y: number, r: number, color: string) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = color;
  c.fill();
}
function line(c: C, points: number[][], color: string, width = 2) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function text(
  c: C,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  font = "Arial",
  weight = "700",
) {
  c.fillStyle = color;
  c.font = `${weight} ${size}px ${font}`;
  c.textAlign = "left";
  c.fillText(value, x, y);
}
function bg(c: C, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(0, 0, 1200, h);
}
const themes: Record<TransitionStudyKind, [string, string, string, string]> = {
  action: ["#f1e7d3", "#203c43", "#df7847", "#afd0c3"],
  dissolve: ["#efd7b7", "#172d4a", "#e9a653", "#c9d9d8"],
  morph: ["#f1debd", "#224e49", "#c85238", "#739c80"],
  foreground: ["#edd9b0", "#1a4b59", "#d65635", "#f2e9d5"],
  luma: ["#dbe3ca", "#183f3b", "#d88b46", "#b2c1aa"],
  liquid: ["#301b43", "#f2d18d", "#c9636e", "#74325b"],
  paper: ["#ece2ca", "#36523f", "#ad673c", "#d6c9a7"],
  blocks: ["#151e27", "#a8d09c", "#64a4a2", "#e8ba79"],
  cards: ["#2542c7", "#fee568", "#f486ac", "#1b2534"],
  smear: ["#28204b", "#f3cce0", "#f19456", "#6a87c7"],
  warp: ["#d9e5e2", "#183e59", "#6e9b9e", "#b4c8d4"],
};
function landscape(c: C, h: number, night: boolean, p: string[], harbor = false) {
  const sky = night ? p[1] : p[0],
    ink = night ? p[0] : p[1],
    horizon = h * 0.59,
    r = Math.min(90, h * 0.1);
  bg(c, h, sky);
  circle(c, 880, h * 0.28, r, night ? p[0] : p[2]);
  if (night)
    for (let i = 0; i < 22; i++)
      circle(
        c,
        85 + ((i * 173) % 1020),
        130 + ((i * 71) % Math.max(100, horizon - 190)),
        1.5,
        p[0],
      );
  c.fillStyle = night ? "#112e42" : p[3];
  c.fillRect(0, horizon, 1200, h - horizon);
  for (let i = 0; i < 9; i++)
    line(
      c,
      [
        [0, horizon + 20 + i * 37],
        [1200, horizon + 20 + i * 37],
      ],
      ink,
      0.7,
    );
  if (harbor) {
    for (let i = 0; i < (night ? 2 : 4); i++) {
      const x = 145 + i * 260,
        y = horizon + 40 + (i % 2) * 85;
      c.fillStyle = p[2];
      c.beginPath();
      c.moveTo(x - 60, y);
      c.lineTo(x + 65, y);
      c.lineTo(x + 35, y + 22);
      c.lineTo(x - 40, y + 22);
      c.closePath();
      c.fill();
      line(
        c,
        [
          [x, y],
          [x, y - 140],
        ],
        ink,
        3,
      );
      c.fillStyle = night ? p[0] : p[1];
      c.beginPath();
      c.moveTo(x - 5, y - 133);
      c.lineTo(x - 65, y - 10);
      c.lineTo(x - 5, y - 10);
      c.fill();
    }
  } else {
    c.beginPath();
    c.moveTo(0, horizon);
    c.bezierCurveTo(220, horizon - 85, 320, horizon + 80, 510, horizon);
    c.bezierCurveTo(670, horizon - 140, 890, horizon - 40, 1200, horizon + 15);
    c.lineTo(1200, h);
    c.lineTo(0, h);
    c.fillStyle = night ? "#274d59" : "#6e8a78";
    c.fill();
  }
  text(
    c,
    harbor ? (night ? "OPEN WATER" : "IN THE HARBOR") : night ? "AFTER DARK" : "BEFORE DUSK",
    60,
    100,
    45,
    ink,
  );
  text(
    c,
    harbor ? "Wind carries us onward." : "The same place. Another hour.",
    60,
    h - 60,
    23,
    ink,
    "Georgia",
    "400",
  );
}
function poster(c: C, h: number, kind: TransitionStudyKind, second: boolean) {
  const p = themes[kind],
    [ground, ink, accent, support] = p,
    back = second ? ink : ground,
    fore = second ? ground : ink;
  if (kind === "dissolve" || kind === "foreground") {
    landscape(c, h, second, p, kind === "foreground");
    return;
  }
  bg(c, h, back);
  const s = Math.min(700, h * 0.6),
    cx = 600,
    cy = h * 0.52;
  if (kind === "paper") {
    text(c, second ? "FIELD NOTES" : "THE GARDEN", 65, 135, 72, fore, "Georgia", "400");
    text(
      c,
      second ? "No. 02 / Collected forms" : "No. 01 / Growing things",
      70,
      185,
      23,
      fore,
      "Georgia",
      "400",
    );
    for (let i = 0; i < 5; i++) {
      const x = 290 + i * 145,
        y = cy + s * 0.28;
      line(
        c,
        [
          [x, y],
          [x + Math.sin(i) * 45, y - s * 0.7],
        ],
        fore,
        3,
      );
      for (let j = 0; j < 5; j++) {
        c.save();
        c.translate(x + Math.sin(i) * j * 7, y - j * s * 0.13);
        c.rotate((j % 2 ? 1 : -1) * 0.65);
        c.beginPath();
        c.ellipse(0, -30, 18, 50, 0, 0, TAU);
        c.fillStyle = j % 2 ? accent : support;
        c.fill();
        c.restore();
      }
    }
    line(
      c,
      [
        [65, h - 135],
        [1135, h - 135],
      ],
      fore,
      1,
    );
    text(
      c,
      second ? "A study of what remains." : "Every leaf leaves a trace.",
      65,
      h - 80,
      29,
      fore,
      "Georgia",
      "400",
    );
    return;
  }
  if (kind === "smear") {
    const size = 132;
    for (let i = 0; i < 3; i++) {
      text(
        c,
        second ? "RELEASE" : "STRETCH",
        80,
        cy + (i - 1) * 155,
        size,
        i === 1 ? accent : fore,
        "Arial",
        "900",
      );
    }
    text(
      c,
      second ? "Room to become something else." : "Carry the energy forward.",
      80,
      h - 70,
      24,
      fore,
      "Georgia",
      "400",
    );
    return;
  }
  if (kind === "luma") {
    text(c, second ? "UNDER THE SURFACE" : "READ THE LAND", 60, 100, 48, fore);
    c.save();
    c.beginPath();
    c.rect(65, 150, 1070, h - 310);
    c.clip();
    for (let j = 0; j < 26; j++) {
      const yy = cy + ((j - 13) * s) / 20;
      const pts = Array.from({ length: 81 }, (_, i) => [
        50 + i * 14,
        yy +
          Math.sin(i * 0.075 + (second ? 0.8 : 0)) * s * 0.15 +
          Math.cos(i * 0.15 + j * 0.16) * s * 0.085,
      ]);
      line(c, pts, j % 4 === 0 ? accent : fore, j % 4 === 0 ? 4 : 1.4);
    }
    c.restore();
    text(c, second ? "02 / DEPTH" : "01 / ELEVATION", 65, h - 75, 25, fore, "Courier New");
    return;
  }
  if (kind === "blocks") {
    text(c, second ? "NIGHT SHIFT" : "DAY SHIFT", 65, 115, 66, fore, "Courier New");
    const unit = s / 12;
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 12; x++) {
        c.fillStyle = (x * 7 + y * 3 + (second ? 11 : 0)) % 13 < 6 ? accent : support;
        c.fillRect(cx - s / 2 + x * unit, cy - s * 0.35 + y * unit, unit * 0.72, unit * 0.72);
      }
    text(
      c,
      second ? "SYSTEM 02 / ONLINE" : "SYSTEM 01 / ONLINE",
      65,
      h - 80,
      29,
      fore,
      "Courier New",
    );
    return;
  }
  if (kind === "liquid") {
    circle(c, cx, cy, s * 0.44, accent);
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.ellipse(cx, cy + (i - 2.5) * s * 0.09, s * 0.44, s * 0.12, second ? -0.3 : 0.2, 0, TAU);
      c.strokeStyle = fore;
      c.lineWidth = 2;
      c.stroke();
    }
    text(c, second ? "INTO THE FLOW" : "TAKE A BREATH", 60, 120, 66, fore, "Georgia", "400");
    text(
      c,
      second ? "A new shape of things." : "Let the moment expand.",
      60,
      h - 75,
      30,
      fore,
      "Georgia",
      "400",
    );
    return;
  }
  if (kind === "warp") {
    for (let x = 0; x < 1200; x += 38)
      line(
        c,
        [
          [x, 160],
          [x, h - 140],
        ],
        support,
        1.5,
      );
    circle(c, cx, cy, s * 0.38, accent);
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.ellipse(cx, cy, s * (0.08 + i * 0.044), s * 0.38, second ? 0.6 : -0.6, 0, TAU);
      c.strokeStyle = fore;
      c.lineWidth = 3;
      c.stroke();
    }
    text(c, second ? "ANOTHER VIEW" : "SHIFT THE LIGHT", 60, 110, 64, fore, "Georgia", "400");
    text(
      c,
      second ? "Perspective changes everything." : "Look through the surface.",
      60,
      h - 70,
      27,
      fore,
      "Georgia",
      "400",
    );
    return;
  }
  // Card fronts and backs are complete, differently composed posters.
  text(c, second ? "AGAIN." : "PLAY.", 60, 160, 150, fore, "Arial", "900");
  if (second) {
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i === 1 ? accent : support;
      c.fillRect(cx - s * 0.44 + i * s * 0.3, cy - s * 0.3, s * 0.24, s * 0.65);
      circle(c, cx - s * 0.32 + i * s * 0.3, cy - s * 0.3, s * 0.12, i === 1 ? accent : support);
    }
  } else {
    circle(c, cx, cy, s * 0.43, accent);
    c.save();
    c.translate(cx, cy);
    c.rotate(-0.4);
    c.fillStyle = support;
    c.fillRect(-s * 0.53, -s * 0.07, s * 1.06, s * 0.14);
    c.restore();
  }
  text(
    c,
    second ? "A different side of the same story." : "Every surface has another side.",
    60,
    h - 70,
    27,
    fore,
    "Georgia",
    "400",
  );
}
function action(c: C, h: number, t: number) {
  const side = t >= 2.4 && t < 6.4,
    p = themes.action,
    length = Math.min(500, h * 0.36),
    cy = Math.max(210, h * 0.26) + length,
    angle = 0.65 * Math.sin(((t - 2.4) * Math.PI) / 2);
  bg(c, h, side ? p[1] : p[0]);
  const ink = side ? p[0] : p[1],
    projection = side ? 0.46 : 1,
    x = 600 + Math.sin(angle) * length * projection,
    y = cy - length + Math.cos(angle) * length;
  text(c, side ? "A CHANGE OF VIEW" : "FOLLOW THE SWING", 60, 105, 54, ink);
  for (let i = -3; i <= 3; i++)
    line(
      c,
      [
        [600 + i * 120 * projection, cy - length - 30],
        [600 + i * 120 * projection, cy + 130],
      ],
      side ? "#43666a" : "#d7c9b3",
      1,
    );
  line(
    c,
    [
      [360, cy - length],
      [840, cy - length],
    ],
    ink,
    10,
  );
  line(
    c,
    [
      [600, cy - length],
      [x, y],
    ],
    ink,
    5,
  );
  circle(c, x, y, 55, p[2]);
  circle(c, 600, cy - length, 9, p[3]);
  text(c, side ? "02 / OBLIQUE" : "01 / FRONT", 60, h - 75, 24, ink, "Courier New");
}
function morph(c: C, h: number, p: number) {
  const mix = (a: number, b: number) => a + (b - a) * p,
    s = Math.min(690, h * 0.61),
    cy = h * 0.52;
  bg(c, h, "#f1debd");
  c.save();
  c.globalAlpha = p;
  for (let i = 0; i < 5; i++)
    line(
      c,
      [
        [0, cy + s * 0.05 + i * 45],
        [1200, cy + s * 0.05 + i * 45],
      ],
      "#b9bba0",
      2,
    );
  circle(c, 950, 190, 55, "#d88b46");
  c.restore();
  // One persistent closed contour, with corresponding vertices at both endpoints.
  const center = (x: number) =>
    mix(Math.sin((x / 1200) * TAU) * s * 0.05, Math.sin((x / 1200) * 5 - 1) * s * 0.2);
  c.beginPath();
  for (let i = 0; i <= 100; i++) {
    const x = mix(270, 0) + (i / 100) * mix(660, 1200),
      yy = cy + center(x) - mix(55, 38 + Math.sin((i / 100) * Math.PI) * 50);
    i ? c.lineTo(x, yy) : c.moveTo(x, yy);
  }
  for (let i = 100; i >= 0; i--) {
    const x = mix(270, 0) + (i / 100) * mix(660, 1200);
    c.lineTo(x, cy + center(x) + mix(55, 38 + Math.sin((i / 100) * Math.PI) * 50));
  }
  c.closePath();
  c.fillStyle = `rgb(${Math.round(mix(200, 34))},${Math.round(mix(82, 78))},${Math.round(mix(56, 73))})`;
  c.fill();
  c.save();
  c.globalAlpha = 1 - smooth(p * 2.5);
  text(c, "A RIBBON", 60, 120, 90, "#224e49", "Georgia", "400");
  text(c, "One line, waiting to travel.", 60, h - 75, 29, "#224e49", "Georgia", "400");
  c.restore();
  c.save();
  c.globalAlpha = smooth((p - 0.6) * 2.5);
  text(c, "A RIVER", 60, 120, 90, "#224e49", "Georgia", "400");
  text(c, "The same line, finding its way.", 60, h - 75, 29, "#224e49", "Georgia", "400");
  c.restore();
}
export function paintTransitionStudy(
  c: C,
  w: number,
  h: number,
  kind: TransitionStudyKind,
  time: number,
  a: HTMLCanvasElement,
  b: HTMLCanvasElement,
) {
  const t = ((time % 8) + 8) % 8,
    returning = t >= 4,
    q = Math.max(0, Math.min(1, ((t % 4) - 1.8) / 1.4));
  c.save();
  try {
    if (kind === "action" || kind === "morph") {
      c.scale(w / 1200, w / 1200);
      if (kind === "action") action(c, (h / w) * 1200, t);
      else morph(c, (h / w) * 1200, returning ? 1 - smooth(q) : smooth(q));
      return;
    }
    for (const [canvas, second] of [
      [a, false],
      [b, true],
    ] as const) {
      const ctx = canvas.getContext("2d")!;
      ctx.save();
      ctx.scale(w / 1200, w / 1200);
      poster(ctx, (h / w) * 1200, kind, second);
      ctx.restore();
    }
    compositeTransition(c, returning ? b : a, returning ? a : b, w, h, q, kind, themes[kind][3]);
  } finally {
    c.restore();
  }
}
const tasks = new WeakMap<EFTimegroupElement, () => void>();
export function TransitionStudy({
  id,
  aspect = "landscape",
  kind,
}: {
  id: string;
  aspect?: Aspect;
  kind: TransitionStudyKind;
}) {
  const [width, height] = ASPECT[aspect];
  const initialize = useCallback(
    (root: EFTimegroupElement) => {
      tasks.get(root)?.();
      const canvas = root.querySelector("canvas")!,
        c = canvas.getContext("2d")!;
      const a = document.createElement("canvas"),
        b = document.createElement("canvas");
      a.width = b.width = width;
      a.height = b.height = height;
      const draw = (time: number) => {
        paintTransitionStudy(c, width, height, kind, time, a, b);
        canvas.dataset.motionTime = String(time);
      };
      draw(root.currentTime);
      tasks.set(
        root,
        root.addFrameTask(({ ownCurrentTime }) => draw(ownCurrentTime)),
      );
    },
    [width, height, kind],
  );
  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration="8s"
      loop
      initializer={initialize}
      style={{ width, height, overflow: "hidden", background: themes[kind][0] }}
    >
      <canvas
        data-transition-study={kind}
        width={width}
        height={height}
        role="img"
        aria-label={`${kind} transition between two original compositions`}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </Timegroup>
  );
}
