import { useEffect, useRef, useState } from "react";

/* ━━ Embedded CSS for SVG animations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const STYLES = `
  @keyframes dashFlow { to { stroke-dashoffset: -30; } }
  @keyframes jitFlow  { to { stroke-dashoffset: -20; } }

  .arch-fp { stroke-dasharray: 6 24; fill: none; animation: dashFlow 0.7s linear infinite; animation-play-state: paused; }
  .arch-fr { stroke-dasharray: 6 24; fill: none; animation: dashFlow 1.8s linear infinite; animation-play-state: paused; }
  .arch-fj { stroke-dasharray: 4 16; fill: none; animation: jitFlow  0.6s linear infinite; animation-play-state: paused; }

  .arch-on .arch-fp,
  .arch-on .arch-fr,
  .arch-on .arch-fj { animation-play-state: running; }

  .arch-pt { visibility: hidden; }
  .arch-on .arch-pt { visibility: visible; }

  @media (prefers-reduced-motion: reduce) {
    .arch-fp, .arch-fr, .arch-fj {
      animation: none;
      stroke-dasharray: 4 12;
      opacity: 0.5;
    }
    .arch-pt { display: none; }
  }
`;

/* ━━ Layout geometry ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const CX = { L: 155, C: 320, R: 485 } as const;

const Y = {
  src: 28,   spl: 80,
  lbl: 114,  sub: 128,
  s1: 160,   s2: 210,  s3: 260,
  wk: 295,
  pOut: 345,
  fanOut: 254, fanIn: 322,
  enc: 358,  cdn: 408,
  rOut: 472,
} as const;

const WK = [CX.R - 67, CX.R, CX.R + 67] as const;

const N  = { w: 140, h: 30 };
const O  = { w: 160, h: 48 };
const W  = { w: 52,  h: 26 };
const S  = { w: 190, h: 36 };

const t = (cy: number, h: number) => cy - h / 2;
const b = (cy: number, h: number) => cy + h / 2;

/* ━━ Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ArchitectureDiagram() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    if (el.pauseAnimations) el.pauseAnimations();

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          if (el.unpauseAnimations) el.unpauseAnimations();
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 640 500"
      className="w-full h-auto"
      role="img"
      aria-label="Editframe architecture: code splits into instant browser preview and parallel cloud rendering"
    >
      <defs>
        <style>{STYLES}</style>
        <marker id="jitArr" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <path d="M0,0.5 L5,2.5 L0,4.5" fill="var(--poster-red)" />
        </marker>
      </defs>

      <g className={active ? "arch-on" : ""}>

        {/* ── Layer 1: Static connection lines ─────────────────────── */}
        <g stroke="var(--warm-gray)" strokeWidth={1.5} opacity={0.25} fill="none">
          {/* Source → Split */}
          <path d={`M${CX.C},${b(Y.src, S.h)} V${Y.spl - 12}`} />
          {/* Split forks */}
          <path d={`M${CX.C},${Y.spl + 12} L${CX.L},${t(Y.s1, N.h)}`} />
          <path d={`M${CX.C},${Y.spl + 12} L${CX.R},${t(Y.s1, N.h)}`} />
          {/* Preview column */}
          <path d={`M${CX.L},${b(Y.s1, N.h)} V${t(Y.s2, N.h)}`} />
          <path d={`M${CX.L},${b(Y.s2, N.h)} V${t(Y.s3, N.h)}`} />
          <path d={`M${CX.L},${b(Y.s3, N.h)} V${t(Y.pOut, O.h)}`} />
          {/* Render column */}
          <path d={`M${CX.R},${b(Y.s1, N.h)} V${t(Y.s2, N.h)}`} />
          <path d={`M${CX.R},${b(Y.s2, N.h)} V${Y.fanOut}`} />
          {/* Fan-out */}
          <path d={`M${CX.R},${Y.fanOut} L${WK[0]},${t(Y.wk, W.h)}`} />
          <path d={`M${CX.R},${Y.fanOut} V${t(Y.wk, W.h)}`} />
          <path d={`M${CX.R},${Y.fanOut} L${WK[2]},${t(Y.wk, W.h)}`} />
          {/* Fan-in */}
          <path d={`M${WK[0]},${b(Y.wk, W.h)} L${CX.R},${Y.fanIn}`} />
          <path d={`M${CX.R},${b(Y.wk, W.h)} V${Y.fanIn}`} />
          <path d={`M${WK[2]},${b(Y.wk, W.h)} L${CX.R},${Y.fanIn}`} />
          {/* Post fan-in */}
          <path d={`M${CX.R},${Y.fanIn} V${t(Y.enc, N.h)}`} />
          <path d={`M${CX.R},${b(Y.enc, N.h)} V${t(Y.cdn, N.h)}`} />
          <path d={`M${CX.R},${b(Y.cdn, N.h)} V${t(Y.rOut, O.h)}`} />
        </g>

        {/* ── Layer 2: Flow overlays (animated dashes) ─────────────── */}
        {/* Preview flow — gold, fast */}
        <g stroke="var(--poster-gold)" strokeWidth={2.5}>
          <path className="arch-fp" d={`M${CX.C},${Y.spl + 12} L${CX.L},${t(Y.s1, N.h)}`} />
          <path className="arch-fp" d={`M${CX.L},${b(Y.s1, N.h)} V${t(Y.s2, N.h)}`} />
          <path className="arch-fp" d={`M${CX.L},${b(Y.s2, N.h)} V${t(Y.s3, N.h)}`} />
          <path className="arch-fp" d={`M${CX.L},${b(Y.s3, N.h)} V${t(Y.pOut, O.h)}`} />
        </g>
        {/* Render flow — blue, measured */}
        <g stroke="var(--poster-blue)" strokeWidth={2.5}>
          <path className="arch-fr" d={`M${CX.C},${Y.spl + 12} L${CX.R},${t(Y.s1, N.h)}`} />
          <path className="arch-fr" d={`M${CX.R},${b(Y.s1, N.h)} V${t(Y.s2, N.h)}`} />
          <path className="arch-fr" d={`M${CX.R},${b(Y.s2, N.h)} V${Y.fanOut}`} />
          <path className="arch-fr" d={`M${CX.R},${Y.fanOut} L${WK[0]},${t(Y.wk, W.h)}`} />
          <path className="arch-fr" d={`M${CX.R},${Y.fanOut} V${t(Y.wk, W.h)}`} />
          <path className="arch-fr" d={`M${CX.R},${Y.fanOut} L${WK[2]},${t(Y.wk, W.h)}`} />
          <path className="arch-fr" d={`M${WK[0]},${b(Y.wk, W.h)} L${CX.R},${Y.fanIn}`} />
          <path className="arch-fr" d={`M${CX.R},${b(Y.wk, W.h)} V${Y.fanIn}`} />
          <path className="arch-fr" d={`M${WK[2]},${b(Y.wk, W.h)} L${CX.R},${Y.fanIn}`} />
          <path className="arch-fr" d={`M${CX.R},${Y.fanIn} V${t(Y.enc, N.h)}`} />
          <path className="arch-fr" d={`M${CX.R},${b(Y.enc, N.h)} V${t(Y.cdn, N.h)}`} />
          <path className="arch-fr" d={`M${CX.R},${b(Y.cdn, N.h)} V${t(Y.rOut, O.h)}`} />
        </g>
        {/* JIT flow — red, intermittent */}
        <g stroke="var(--poster-red)" strokeWidth={2}>
          <path className="arch-fj" d={`M10,${Y.s2} H${CX.L - N.w / 2}`} markerEnd="url(#jitArr)" />
          <path className="arch-fj" d={`M630,${Y.s2} H${CX.R + N.w / 2}`} markerEnd="url(#jitArr)" />
        </g>

        {/* ── Layer 3: Fan-out / fan-in diamond highlight ──────────── */}
        <polygon
          points={`${CX.R},${Y.fanOut} ${WK[0]},${t(Y.wk, W.h)} ${WK[0]},${b(Y.wk, W.h)} ${CX.R},${Y.fanIn} ${WK[2]},${b(Y.wk, W.h)} ${WK[2]},${t(Y.wk, W.h)}`}
          fill="var(--poster-blue)"
          opacity={0.06}
          stroke="none"
        />

        {/* ── Layer 4: Nodes ───────────────────────────────────────── */}
        {/* Source */}
        <rect x={CX.C - S.w / 2} y={t(Y.src, S.h)} width={S.w} height={S.h}
          fill="var(--poster-red)" stroke="var(--ink-black)" strokeWidth={2.5} />
        <text x={CX.C} y={Y.src} textAnchor="middle" dominantBaseline="central"
          fill="white" fontSize={11} fontWeight={900}
          style={{ letterSpacing: '0.1em' }}>YOUR CODE</text>

        {/* Split diamond */}
        <polygon
          points={`${CX.C},${Y.spl - 12} ${CX.C + 12},${Y.spl} ${CX.C},${Y.spl + 12} ${CX.C - 12},${Y.spl}`}
          fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2.5} />

        {/* ── Pipeline labels ── */}
        <text x={CX.L} y={Y.lbl} textAnchor="middle" dominantBaseline="central"
          fill="var(--poster-gold)" fontSize={12} fontWeight={900}
          style={{ letterSpacing: '0.12em' }}>PREVIEW</text>
        <text x={CX.L} y={Y.sub} textAnchor="middle" dominantBaseline="central"
          fill="var(--warm-gray)" fontSize={8} fontWeight={700}
          style={{ letterSpacing: '0.06em' }}>IN-BROWSER</text>

        <text x={CX.R} y={Y.lbl} textAnchor="middle" dominantBaseline="central"
          fill="var(--poster-blue)" fontSize={12} fontWeight={900}
          style={{ letterSpacing: '0.12em' }}>RENDER</text>
        <text x={CX.R} y={Y.sub} textAnchor="middle" dominantBaseline="central"
          fill="var(--warm-gray)" fontSize={8} fontWeight={700}
          style={{ letterSpacing: '0.06em' }}>CLOUD</text>

        {/* ── Preview nodes ── */}
        {([
          [Y.s1, "DOM RENDER"],
          [Y.s2, "JIT TRANSCODE"],
          [Y.s3, "CANVAS CAPTURE"],
        ] as const).map(([cy, label]) => (
          <g key={label}>
            <rect x={CX.L - N.w / 2} y={t(cy, N.h)} width={N.w} height={N.h}
              fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2.5} />
            <text x={CX.L} y={cy} textAnchor="middle" dominantBaseline="central"
              fill="var(--ink-black)" fontSize={10} fontWeight={800}
              style={{ letterSpacing: '0.08em' }}>{label}</text>
          </g>
        ))}

        {/* Preview output */}
        <rect x={CX.L - O.w / 2} y={t(Y.pOut, O.h)} width={O.w} height={O.h}
          fill="var(--poster-gold)" stroke="var(--ink-black)" strokeWidth={2.5} />
        <text x={CX.L} y={Y.pOut - 8} textAnchor="middle" dominantBaseline="central"
          fill="white" fontSize={20} fontWeight={900}
          style={{ letterSpacing: '-0.02em' }}>{"< 50MS"}</text>
        <text x={CX.L} y={Y.pOut + 12} textAnchor="middle" dominantBaseline="central"
          fill="white" fillOpacity={0.85} fontSize={8} fontWeight={700}
          style={{ letterSpacing: '0.1em' }}>INSTANT PREVIEW</text>

        {/* ── Render nodes ── */}
        {([
          [Y.s1, "SERIALIZE"],
          [Y.s2, "INITIALIZE"],
        ] as const).map(([cy, label]) => (
          <g key={label}>
            <rect x={CX.R - N.w / 2} y={t(cy, N.h)} width={N.w} height={N.h}
              fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2.5} />
            <text x={CX.R} y={cy} textAnchor="middle" dominantBaseline="central"
              fill="var(--ink-black)" fontSize={10} fontWeight={800}
              style={{ letterSpacing: '0.08em' }}>{label}</text>
          </g>
        ))}

        {/* Workers */}
        {([
          [WK[0], "F\u2081"],
          [WK[1], "F\u2082"],
          [WK[2], "F\u2083"],
        ] as const).map(([cx, label]) => (
          <g key={label}>
            <rect x={cx - W.w / 2} y={t(Y.wk, W.h)} width={W.w} height={W.h}
              fill="var(--poster-blue)" stroke="var(--ink-black)" strokeWidth={2} />
            <text x={cx} y={Y.wk} textAnchor="middle" dominantBaseline="central"
              fill="white" fontSize={10} fontWeight={800}>{label}</text>
          </g>
        ))}

        {/* Encode + CDN */}
        {([
          [Y.enc, "ENCODE"],
          [Y.cdn, "CDN DELIVER"],
        ] as const).map(([cy, label]) => (
          <g key={label}>
            <rect x={CX.R - N.w / 2} y={t(cy, N.h)} width={N.w} height={N.h}
              fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2.5} />
            <text x={CX.R} y={cy} textAnchor="middle" dominantBaseline="central"
              fill="var(--ink-black)" fontSize={10} fontWeight={800}
              style={{ letterSpacing: '0.08em' }}>{label}</text>
          </g>
        ))}

        {/* Render output */}
        <rect x={CX.R - O.w / 2} y={t(Y.rOut, O.h)} width={O.w} height={O.h}
          fill="var(--poster-blue)" stroke="var(--ink-black)" strokeWidth={2.5} />
        <text x={CX.R} y={Y.rOut - 8} textAnchor="middle" dominantBaseline="central"
          fill="white" fontSize={20} fontWeight={900}
          style={{ letterSpacing: '-0.02em' }}>10,000+</text>
        <text x={CX.R} y={Y.rOut + 12} textAnchor="middle" dominantBaseline="central"
          fill="white" fillOpacity={0.85} fontSize={8} fontWeight={700}
          style={{ letterSpacing: '0.1em' }}>VIDEOS / HOUR</text>

        {/* ── Layer 5: Annotations ─────────────────────────────────── */}
        {/* JIT stream labels */}
        <text x={48} y={Y.s2 - 12} textAnchor="middle" dominantBaseline="central"
          fill="var(--poster-red)" fontSize={8} fontWeight={700}
          style={{ letterSpacing: '0.08em' }}>JIT STREAM</text>
        <text x={48} y={Y.s2 + 12} textAnchor="middle" dominantBaseline="central"
          fill="var(--poster-red)" fontSize={6} fontWeight={600} fillOpacity={0.6}
          style={{ letterSpacing: '0.06em' }}>NO INGESTION</text>

        <text x={592} y={Y.s2 - 12} textAnchor="middle" dominantBaseline="central"
          fill="var(--poster-red)" fontSize={8} fontWeight={700}
          style={{ letterSpacing: '0.08em' }}>JIT STREAM</text>
        <text x={592} y={Y.s2 + 12} textAnchor="middle" dominantBaseline="central"
          fill="var(--poster-red)" fontSize={6} fontWeight={600} fillOpacity={0.6}
          style={{ letterSpacing: '0.06em' }}>NO INGESTION</text>

        {/* Fan-out / fan-in labels */}
        <text x={CX.R - N.w / 2 - 10} y={Y.fanOut} textAnchor="end" dominantBaseline="central"
          fill="var(--warm-gray)" fontSize={7} fontWeight={700}
          style={{ letterSpacing: '0.06em' }}>SPLIT</text>
        <text x={CX.R - N.w / 2 - 10} y={Y.fanIn} textAnchor="end" dominantBaseline="central"
          fill="var(--warm-gray)" fontSize={7} fontWeight={700}
          style={{ letterSpacing: '0.06em' }}>CONCAT</text>

        {/* ── Layer 6: Particles ───────────────────────────────────── */}
        {/* Preview particle — fast gold square */}
        <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-gold)">
          <animateMotion
            dur="2.5s" repeatCount="indefinite" calcMode="linear"
            path={`M${CX.C},${b(Y.src, S.h)} L${CX.C},${Y.spl + 12} L${CX.L},${t(Y.s1, N.h)} V${t(Y.pOut, O.h)}`}
          />
          <animate attributeName="opacity" dur="2.5s" repeatCount="indefinite"
            values="0;1;1;0" keyTimes="0;0.05;0.88;1" />
        </rect>
        {/* Preview particle 2 — staggered */}
        <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-gold)">
          <animateMotion
            dur="2.5s" repeatCount="indefinite" calcMode="linear" begin="1.25s"
            path={`M${CX.C},${b(Y.src, S.h)} L${CX.C},${Y.spl + 12} L${CX.L},${t(Y.s1, N.h)} V${t(Y.pOut, O.h)}`}
          />
          <animate attributeName="opacity" dur="2.5s" repeatCount="indefinite" begin="1.25s"
            values="0;1;1;0" keyTimes="0;0.05;0.88;1" />
        </rect>

        {/* Render main particle — steady blue square */}
        <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-blue)">
          <animateMotion
            dur="5s" repeatCount="indefinite" calcMode="linear"
            path={`M${CX.C},${b(Y.src, S.h)} L${CX.C},${Y.spl + 12} L${CX.R},${t(Y.s1, N.h)} V${t(Y.rOut, O.h)}`}
          />
          <animate attributeName="opacity" dur="5s" repeatCount="indefinite"
            values="0;1;1;0" keyTimes="0;0.03;0.93;1" />
        </rect>
        {/* Render main particle 2 — staggered */}
        <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-blue)">
          <animateMotion
            dur="5s" repeatCount="indefinite" calcMode="linear" begin="2.5s"
            path={`M${CX.C},${b(Y.src, S.h)} L${CX.C},${Y.spl + 12} L${CX.R},${t(Y.s1, N.h)} V${t(Y.rOut, O.h)}`}
          />
          <animate attributeName="opacity" dur="5s" repeatCount="indefinite" begin="2.5s"
            values="0;1;1;0" keyTimes="0;0.03;0.93;1" />
        </rect>

        {/* Worker 1 diverge particle */}
        <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-blue)">
          <animateMotion
            dur="1.5s" repeatCount="indefinite" calcMode="linear"
            path={`M${CX.R},${Y.fanOut} L${WK[0]},${t(Y.wk, W.h)} V${b(Y.wk, W.h)} L${CX.R},${Y.fanIn}`}
          />
          <animate attributeName="opacity" dur="1.5s" repeatCount="indefinite"
            values="0;1;1;0" keyTimes="0;0.1;0.85;1" />
        </rect>
        {/* Worker 3 diverge particle */}
        <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-blue)">
          <animateMotion
            dur="1.5s" repeatCount="indefinite" calcMode="linear" begin="0.4s"
            path={`M${CX.R},${Y.fanOut} L${WK[2]},${t(Y.wk, W.h)} V${b(Y.wk, W.h)} L${CX.R},${Y.fanIn}`}
          />
          <animate attributeName="opacity" dur="1.5s" repeatCount="indefinite" begin="0.4s"
            values="0;1;1;0" keyTimes="0;0.1;0.85;1" />
        </rect>

        {/* JIT pulse — left */}
        <rect className="arch-pt" x={-2} y={-2} width={4} height={4} fill="var(--poster-red)">
          <animateMotion
            dur="1.2s" repeatCount="indefinite" calcMode="linear"
            path={`M10,${Y.s2} H${CX.L - N.w / 2}`}
          />
          <animate attributeName="opacity" dur="1.2s" repeatCount="indefinite"
            values="0;0.9;0.9;0" keyTimes="0;0.1;0.7;1" />
        </rect>
        {/* JIT pulse — right */}
        <rect className="arch-pt" x={-2} y={-2} width={4} height={4} fill="var(--poster-red)">
          <animateMotion
            dur="1.2s" repeatCount="indefinite" calcMode="linear" begin="0.5s"
            path={`M630,${Y.s2} H${CX.R + N.w / 2}`}
          />
          <animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" begin="0.5s"
            values="0;0.9;0.9;0" keyTimes="0;0.1;0.7;1" />
        </rect>

      </g>
    </svg>
  );
}

export { ArchitectureDiagram };
export default ArchitectureDiagram;
