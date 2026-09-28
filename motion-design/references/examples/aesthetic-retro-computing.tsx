import { AestheticFilm, type AestheticLook, type ScenePainter } from "./shared/aesthetic-film";
import { ease, line, mix, mono, rect, stackedSlabs, text, type C } from "./shared/canvas-paint";
import { project } from "./shared/solid-studies";
import { pixelReplacement } from "./pixel-scene-replacement";
import type { Aspect } from "../src/primitives";

export const duration = 18;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
/** Runs `program` on the inset screen, clipped to it and lit by its phosphor glow. */
function workstation(header: string, command: string, program: ScenePainter): ScenePainter {
  return (c, h, t, palette) => {
    const [bg, ink, amber, dim] = palette;
    // A single amber phosphor, inset screen, and dense character cells establish a workstation.
    c.save();
    c.beginPath();
    c.roundRect(35, 67, 1130, h - 118, 24);
    c.fillStyle = bg;
    c.fill();
    c.strokeStyle = dim;
    c.lineWidth = 2;
    c.stroke();
    c.clip();
    const glow = c.createRadialGradient(600, h / 2, 100, 600, h / 2, h);
    glow.addColorStop(0, dim + "35");
    glow.addColorStop(1, bg);
    c.fillStyle = glow;
    c.fillRect(36, 68, 1128, h - 120);
    rect(c, 58, 86, 1084, 32, ink);
    text(c, header, 67, 109, 20, bg, mono, "700");
    c.shadowColor = ink;
    c.shadowBlur = 3;
    text(c, command.slice(0, Math.floor(t * 38)), 67, 154, 24, ink, mono);
    program(c, h, t, palette);
    c.shadowBlur = 0;
    line(
      c,
      [
        [65, h - 99],
        [1135, h - 99],
      ],
      dim,
    );
    text(c, "F1 HELP    F2 VIEW    F3 TRACE", 67, h - 74, 16, amber, mono);
    text(c, "ONLINE", 1135, h - 74, 16, ink, mono, "400", "right");
    c.globalAlpha = 0.1;
    for (let y = 68; y < h - 51; y += 5) rect(c, 36, y, 1128, 1, bg);
    c.restore();
  };
}
function bootSequence(c: C, h: number, t: number, palette: string[]) {
  const [, ink, amber, dim] = palette,
    tall = h > 900;
  const log = [
    "ROM CHECK ............. OK",
    "CLOCK SYNC ............ OK",
    "FRAME BUFFER .......... OK",
    "LOADING 64 CELLS .........",
    "LINKING COORDINATES ......",
    "DISPLAY READY.",
  ];
  log.forEach((v, i) => {
    if (t > i * 0.38)
      text(
        c,
        v.slice(0, Math.floor((t - i * 0.38) * 48)),
        68,
        214 + i * (h > 1600 ? 53 : 37),
        h > 1600 ? 31 : 21,
        i === 5 ? ink : amber,
        mono,
      );
  });
  const cx = tall ? 600 : 885,
    cy = tall ? h * 0.62 : 335,
    size = tall ? Math.min(600, h * 0.3) : 235,
    p = ease((t - 0.3) / 2.4);
  line(
    c,
    [
      [cx - size * 0.64, cy - size * 0.64],
      [cx + size * 0.64, cy - size * 0.64],
      [cx + size * 0.64, cy + size * 0.64],
      [cx - size * 0.64, cy + size * 0.64],
      [cx - size * 0.64, cy - size * 0.64],
    ],
    dim,
    1,
  );
  for (let i = 0; i < 64; i++) {
    const x0 = cx + Math.sin(i * 5) * size * 0.6,
      y0 = cy + Math.cos(i * 7) * size * 0.6,
      x1 = cx + ((i % 8) - 3.5) * size * 0.11,
      y1 = cy + (Math.floor(i / 8) - 3.5) * size * 0.11;
    rect(c, mix(x0, x1, p), mix(y0, y1, p), size * 0.083, size * 0.083, ink);
  }
  text(
    c,
    `${String(Math.min(64, Math.floor(p * 64))).padStart(2, "0")} / 64 CELLS`,
    cx,
    cy + size * 0.64 + 32,
    20,
    amber,
    mono,
    "400",
    "center",
  );
}
/** Outlines every visible face of the slab stack in the first color. */
function wireSlabs(
  c: C,
  x: number,
  y: number,
  size: number,
  t: number,
  colors: string[],
  explode: number,
) {
  const faces = stackedSlabs(t, colors, explode);
  c.save();
  c.translate(x - size / 2, y - size / 2);
  c.scale(size / 1000, size / 1000);
  for (const f of project({ faces, eye: [5, 4, 10], focal: 1450 })) {
    line(
      c,
      [
        ...f.points.split(" ").map((p) => p.split(",").map(Number)),
        f.points.split(" ")[0]!.split(",").map(Number),
      ],
      colors[0]!,
      2,
    );
  }
  c.restore();
}
function structureInspector(c: C, h: number, t: number, palette: string[]) {
  const [, ink, amber, dim] = palette,
    tall = h > 900;
  const cx = tall ? 600 : 390,
    cy = tall ? h * 0.42 : 340;
  line(
    c,
    [
      [65, 180],
      [tall ? 1135 : 725, 180],
    ],
    dim,
  );
  wireSlabs(
    c,
    cx,
    cy,
    h > 1600 ? 1300 : tall ? 850 : 580,
    Math.floor(t * 6) / 6,
    [ink],
    0.6 * ease(t / 2),
  );
  const xx = tall ? 95 : 770,
    yy = tall ? h * 0.65 : 225;
  [
    "OBJECT ......... VOL_003",
    "VERTICES ........... 024",
    "EDGES .............. 036",
    "LAYERS ............. 003",
    "PROJECTION ..... ACTIVE",
  ].forEach((v, i) =>
    text(
      c,
      v.slice(0, Math.max(0, Math.floor((t - i * 0.17) * 60))),
      xx,
      yy + i * (h > 1600 ? 53 : 39),
      h > 1600 ? 31 : 20,
      ink,
      mono,
    ),
  );
  for (let i = 0; i < 3; i++) {
    const y = yy + (h > 1600 ? 300 : 225) + i * 26;
    text(c, ["X", "Y", "Z"][i], xx, y, 16, amber, mono);
    for (let j = 0; j < 18; j++)
      rect(c, xx + 30 + j * 15, y - 12, 10, 12, j < 9 + Math.sin(t * 0.7 + i) * 6 ? ink : dim);
  }
}
function memoryReallocation(c: C, h: number, t: number, palette: string[]) {
  const [, ink, amber, dim] = palette,
    tall = h > 900;
  const yy = tall ? h * 0.3 : 235,
    unit = tall ? 38 : 23,
    gap = unit * 1.3,
    p = ease((t - 0.3) / 2.1);
  for (let g = 0; g < 3; g++) {
    const x = 90 + g * 365;
    text(c, `BANK 0${g + 1}`, x, yy - 30, 20, amber, mono);
    line(
      c,
      [
        [x, yy - 15],
        [x + 290, yy - 15],
      ],
      dim,
    );
  }
  for (let i = 0; i < 60; i++) {
    const g = i < 20 ? 0 : i < 45 ? 1 : 2,
      n = i - [0, 20, 45][g];
    rect(
      c,
      mix(390 + (i % 10) * gap, 90 + g * 365 + (n % 5) * gap, p),
      mix(yy + Math.floor(i / 10) * gap, yy + Math.floor(n / 5) * gap, p),
      unit,
      unit,
      ink,
    );
  }
  if (t > 2.5) {
    const y = tall ? h * 0.66 : 463;
    text(c, "60 IN / 60 OUT / 0 LOST", 68, y, h > 1600 ? 48 : 31, ink, mono, "700");
    text(
      c,
      "CHECKSUM .... VERIFIED",
      68,
      y + (h > 1600 ? 68 : 43),
      h > 1600 ? 32 : 22,
      amber,
      mono,
    );
    text(
      c,
      "> all parts accounted for_",
      68,
      y + (h > 1600 ? 125 : 80),
      h > 1600 ? 32 : 22,
      ink,
      mono,
    );
  }
}
function sessionTitle(c: C, _h: number, scene: number, p: string[]) {
  text(c, "FORM.OS  /  EXPERIMENTAL WORKSTATION", 65, 43, 15, p[1], mono);
  text(c, `SESSION 00${scene + 1}`, 1135, 43, 15, p[1], mono, "400", "right");
}
export const look: AestheticLook = {
  palette: ["#160f08", "#ffba51", "#d8943b", "#765329"],
  scenes: [
    workstation(" FORM.OS  /  BOOT SEQUENCE", "> boot --assemble", bootSequence),
    workstation(" FORM.OS  /  STRUCTURE INSPECTOR", "> inspect --structure", structureInspector),
    workstation(
      " FORM.OS  /  MEMORY REALLOCATION",
      "> redistribute --keep-total",
      memoryReallocation,
    ),
  ],
  labels: sessionTitle,
  handoff: {
    effect: pixelReplacement,
    duration: 0.8,
    label: "Pixel replacement",
    reason:
      "Discrete screen cells are replaced in a fixed order, extending the memory and assembly motifs.",
    study: "pixel-scene-replacement",
  },
};
/** Three composed scenes; source mechanisms and research: data/aesthetics.json. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <AestheticFilm
      id={id}
      aspect={frame}
      look={look}
      label="Retro Computing: A system coming to life. Three scenes combine type, form, and layout with connecting transitions."
    />
  );
}
