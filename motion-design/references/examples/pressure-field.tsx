import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, type Aspect } from "../src/primitives";

export const duration = 9;
export const posterTime = 3.95;
export const aspect = "square" as const;
const smooth = (n: number) => {
  const x = Math.max(0, Math.min(1, n));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const tiles = Array.from({ length: 169 }, (_, i) => ({
  x: 164 + (i % 13) * 56,
  y: 166 + Math.floor(i / 13) * 56,
  i,
}));
function source(t: number) {
  const expansion = smooth((t - 0.65) / 1.35) * (1 - smooth((t - 6.15) / 1.1));
  const travel = smooth((t - 2.55) / 2.45) * (1 - smooth((t - 7.35) / 0.9));
  return { x: 332 + 336 * travel, y: 474, radius: 13 + 78 * expansion, expansion };
}
export function pressureFrame(t: number) {
  const focus = source(t);
  const cells = tiles.map((tile) => {
    const distance = Math.hypot(tile.x - focus.x, tile.y - focus.y);
    const lag = 0.035 + Math.min(0.18, distance * 0.0005),
      delayed = source(t - lag);
    const dx = tile.x - delayed.x,
      dy = tile.y - delayed.y,
      d = Math.hypot(dx, dy);
    const reach = 142 * delayed.expansion;
    const shift = (Math.sqrt(d * d + reach * reach) - d) * Math.exp(-((d / 320) ** 4));
    const compression = 1 - 0.28 * delayed.expansion * Math.exp(-((d / 160) ** 2));
    const size = 27 * compression;
    const rotation =
      ((Math.atan2(dy, dx) * 180) / Math.PI) *
      0.035 *
      delayed.expansion *
      Math.exp(-((d / 180) ** 2));
    let x = tile.x + (dx / d) * shift,
      y = tile.y + (dy / d) * shift;
    // A current-time contact boundary prevents the delayed response from crossing the focus.
    const relativeX = x - focus.x,
      relativeY = y - focus.y,
      separation = Math.hypot(relativeX, relativeY);
    const angle = (rotation * Math.PI) / 180;
    const half = (size / 2) * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));
    const clearance = Math.hypot(
      Math.max(0, Math.abs(relativeX) - half),
      Math.max(0, Math.abs(relativeY) - half),
    );
    const correction = Math.max(0, focus.radius + 1 - clearance) * Math.SQRT2;
    x += (relativeX / separation) * correction;
    y += (relativeY / separation) * correction;
    return { x, y, size, rotation };
  });
  return { focus, cells };
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const [width, height] = ASPECT[frame],
    initial = pressureFrame(0);
  const initialize = (root: EFTimegroupElement) => {
    const cells = Array.from(root.querySelectorAll<SVGRectElement>("[data-pressure-cell]"));
    const focus = root.querySelector<SVGCircleElement>("[data-pressure-focus]");
    const core = root.querySelector<SVGCircleElement>("[data-pressure-core]");
    const draw = (t: number) => {
      const state = pressureFrame(t);
      cells.forEach((cell, i) => {
        const item = state.cells[i];
        cell.setAttribute(
          "transform",
          `translate(${item.x} ${item.y}) rotate(${item.rotation}) scale(${item.size / 27})`,
        );
      });
      focus?.setAttribute("cx", String(state.focus.x));
      focus?.setAttribute("cy", String(state.focus.y));
      focus?.setAttribute("r", String(state.focus.radius));
      core?.setAttribute("cx", String(state.focus.x));
      core?.setAttribute("cy", String(state.focus.y));
      core?.setAttribute("r", String(4 + state.focus.expansion * 5));
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
      style={{ position: "relative", width, height, background: "#eeeae0", overflow: "hidden" }}
    >
      <svg
        viewBox="0 0 1000 1000"
        role="img"
        aria-label="A persistent tile field yields around an expanding traveling pressure source, then locally recovers its original grid"
        style={{ position: "absolute", inset: "3%", width: "94%", height: "94%" }}
      >
        {initial.cells.map((cell, i) => (
          <rect
            key={i}
            data-pressure-cell=""
            x="-13.5"
            y="-13.5"
            width="27"
            height="27"
            rx="5"
            fill={(i % 13) % 3 === 0 ? "#6f817e" : "#98a7a0"}
            transform={`translate(${cell.x} ${cell.y})`}
          />
        ))}
        <circle
          data-pressure-focus=""
          cx={initial.focus.x}
          cy={initial.focus.y}
          r={initial.focus.radius}
          fill="#cf6c4b"
        />
        <circle
          data-pressure-core=""
          cx={initial.focus.x}
          cy={initial.focus.y}
          r="4"
          fill="#f6cf95"
        />
      </svg>
    </Timegroup>
  );
}
