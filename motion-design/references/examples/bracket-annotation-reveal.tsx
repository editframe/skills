import type { CSSProperties } from "react";
import { ACCENT, INK, Mono, MUTED, NAVY, Reveal, Solo } from "../src/primitives";

const LINES: Array<Array<[string, string]>> = [
  [
    ["export default function ", MUTED],
    ["Brief", INK],
    ["() {", MUTED],
  ],
  [["  return (", MUTED]],
  [["    <main>", INK]],
  [
    ["      <Suspense fallback={<", INK],
    ["Skeleton", MUTED],
    [" />}>", INK],
  ],
  [["        <Can />", INK]],
  [["      </Suspense>", INK]],
  [["      <SkuGrid />", INK]],
  [["    </main>", INK]],
  [["  );", MUTED]],
  [["}", MUTED]],
];

const LH = 52;
const CODE_W = 720;

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  const staticY1 = 8;
  const staticY2 = LINES.length * LH - 8;
  const dynY1 = 3 * LH + 8;
  const dynY2 = 6 * LH - 8;
  const svgH = LINES.length * LH + 16;

  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="relative" style={{ width: CODE_W + 320 }}>
          <Reveal enter={[0, 280]} y={0}>
            <div className="mb-6 text-sm uppercase tracking-[0.08em]" style={{ color: MUTED }}>
              <Mono>src / Video.tsx</Mono>
            </div>
          </Reveal>
          <Mono>
            <div style={{ fontSize: 26, lineHeight: `${LH}px`, whiteSpace: "pre" }}>
              {LINES.map((tokens, i) => (
                <div
                  key={i}
                  style={{
                    height: LH,
                    animation: `reveal-in 240ms ${i * 110}ms cubic-bezier(0.33,1,0.68,1) backwards`,
                    ["--reveal-y" as string]: "10px",
                  }}
                >
                  {tokens.map(([txt, color], j) => (
                    <span key={j} style={{ color }}>
                      {txt}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </Mono>
          <svg
            width="280"
            height={svgH}
            viewBox={`0 0 280 ${svgH}`}
            className="absolute"
            style={{ left: CODE_W - 40, top: 44 }}
          >
            <path
              d={`M 8 ${staticY1} L 28 ${staticY1} L 28 ${staticY2} L 8 ${staticY2}`}
              stroke={NAVY}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={340}
              strokeDashoffset={340}
              style={{ animation: "draw 500ms 1800ms cubic-bezier(0.33,1,0.68,1) both" }}
            />
            <path
              d={`M 48 ${dynY1} L 68 ${dynY1} L 68 ${dynY2} L 48 ${dynY2}`}
              stroke={ACCENT}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={240}
              strokeDashoffset={240}
              style={{ animation: "draw 500ms 2500ms cubic-bezier(0.33,1,0.68,1) both" }}
            />
          </svg>
          <div
            className="absolute"
            style={
              {
                left: CODE_W + 8,
                top: 36,
                color: NAVY,
                fontSize: 28,
                fontWeight: 500,
                "--slide-x": "24px",
                animation: "slide-x-in 320ms 2150ms cubic-bezier(0.33,1,0.68,1) backwards",
              } as CSSProperties
            }
          >
            shell
            <div className="mt-1 font-mono text-sm" style={{ color: MUTED }}>
              prerendered
            </div>
          </div>
          <div
            className="absolute"
            style={
              {
                left: CODE_W + 52,
                top: 44 + (dynY1 + dynY2) / 2 - 28,
                color: ACCENT,
                fontSize: 28,
                fontWeight: 500,
                "--slide-x": "24px",
                animation: "slide-x-in 320ms 2850ms cubic-bezier(0.33,1,0.68,1) backwards",
              } as CSSProperties
            }
          >
            stream
            <div className="mt-1 font-mono text-sm" style={{ color: MUTED }}>
              at request
            </div>
          </div>
        </div>
      </div>
    </Solo>
  );
}
