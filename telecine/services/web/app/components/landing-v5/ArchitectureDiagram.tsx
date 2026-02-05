import { useEffect, useRef, useState, type ReactNode } from "react";

/* ━━ Shared animation CSS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const STYLES = `
  @keyframes df { to { stroke-dashoffset: -30; } }
  @keyframes jf { to { stroke-dashoffset: -20; } }
  .arch-fp { stroke-dasharray: 6 24; fill: none; animation: df 0.7s linear infinite; animation-play-state: paused; }
  .arch-fr { stroke-dasharray: 6 24; fill: none; animation: df 1.8s linear infinite; animation-play-state: paused; }
  .arch-fm { stroke-dasharray: 6 24; fill: none; animation: df 1s  linear infinite; animation-play-state: paused; }
  .arch-fj { stroke-dasharray: 4 16; fill: none; animation: jf 0.6s linear infinite; animation-play-state: paused; }
  [data-on="1"] .arch-fp,
  [data-on="1"] .arch-fr,
  [data-on="1"] .arch-fm,
  [data-on="1"] .arch-fj { animation-play-state: running; }
  .arch-pt { visibility: hidden; }
  [data-on="1"] .arch-pt { visibility: visible; }
  @media (prefers-reduced-motion: reduce) {
    .arch-fp, .arch-fr, .arch-fm, .arch-fj { animation: none; stroke-dasharray: 4 12; opacity: 0.5; }
    .arch-pt { display: none; }
  }
`;

const ls = { letterSpacing: "0.08em" } as const;
const lsw = { letterSpacing: "0.1em" } as const;

/* ━━ Shared hook ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function useDiagramAnim() {
  const ref = useRef<SVGSVGElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.pauseAnimations) el.pauseAnimations();
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setOn(true);
          if (el.unpauseAnimations) el.unpauseAnimations();
          obs.unobserve(el);
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, on };
}

/* ━━ Card wrapper ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function DiagramCard({
  title,
  subtitle,
  color,
  children,
  span = false,
}: {
  title: string;
  subtitle: string;
  color: string;
  children: ReactNode;
  span?: boolean;
}) {
  return (
    <div className={span ? "md:col-span-2" : ""}>
      <div className="relative bg-[var(--card-bg)] border-3 border-[var(--ink-black)] dark:border-white overflow-hidden h-full">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
        <div className="p-5 pt-6">
          <div className="mb-4">
            <h3
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color }}
            >
              {title}
            </h3>
            <p className="text-[10px] text-[var(--warm-gray)] uppercase tracking-wide mt-1">
              {subtitle}
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. THE SPLIT — same code, two execution paths
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SplitDiagram() {
  const { ref, on } = useDiagramAnim();
  return (
    <svg ref={ref} data-on={on ? "1" : "0"} viewBox="0 0 380 160" className="w-full h-auto">
      <defs><style>{STYLES}</style></defs>

      {/* Static lines */}
      <g stroke="var(--warm-gray)" strokeWidth={1.5} opacity={0.25} fill="none">
        <path d="M190,36 V52" />
        <path d="M190,72 L105,121" />
        <path d="M190,72 L275,121" />
      </g>

      {/* Flow overlays */}
      <path className="arch-fp" d="M190,72 L105,121" stroke="var(--poster-gold)" strokeWidth={2} />
      <path className="arch-fr" d="M190,72 L275,121" stroke="var(--poster-blue)" strokeWidth={2} />

      {/* Source */}
      <rect x={120} y={8} width={140} height={28} fill="var(--poster-red)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={190} y={22} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={9} fontWeight={800} style={ls}>YOUR CODE</text>

      {/* Diamond */}
      <polygon points="190,52 200,62 190,72 180,62" fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />

      {/* Preview endpoint */}
      <rect x={48} y={121} width={115} height={28} fill="var(--card-bg)" stroke="var(--poster-gold)" strokeWidth={2.5} />
      <text x={105} y={131} textAnchor="middle" dominantBaseline="central" fill="var(--poster-gold)" fontSize={9} fontWeight={800} style={ls}>PREVIEW</text>
      <text x={105} y={143} textAnchor="middle" dominantBaseline="central" fill="var(--warm-gray)" fontSize={7} fontWeight={600} style={ls}>IN-BROWSER</text>

      {/* Render endpoint */}
      <rect x={218} y={121} width={115} height={28} fill="var(--card-bg)" stroke="var(--poster-blue)" strokeWidth={2.5} />
      <text x={275} y={131} textAnchor="middle" dominantBaseline="central" fill="var(--poster-blue)" fontSize={9} fontWeight={800} style={ls}>RENDER</text>
      <text x={275} y={143} textAnchor="middle" dominantBaseline="central" fill="var(--warm-gray)" fontSize={7} fontWeight={600} style={ls}>CLOUD</text>

      {/* Particles */}
      <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-gold)">
        <animateMotion dur="2s" repeatCount="indefinite" calcMode="linear" path="M190,36 L190,72 L105,135" />
        <animate attributeName="opacity" dur="2s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.05;0.85;1" />
      </rect>
      <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-blue)">
        <animateMotion dur="2s" repeatCount="indefinite" calcMode="linear" begin="0.3s" path="M190,36 L190,72 L275,135" />
        <animate attributeName="opacity" dur="2s" repeatCount="indefinite" begin="0.3s" values="0;1;1;0" keyTimes="0;0.05;0.85;1" />
      </rect>
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2. PREVIEW PIPELINE — instant feedback in the browser
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function PreviewDiagram() {
  const { ref, on } = useDiagramAnim();
  // cx=120, node w=115 h=26
  return (
    <svg ref={ref} data-on={on ? "1" : "0"} viewBox="0 0 220 270" className="w-full h-auto">
      <defs>
        <style>{STYLES}</style>
        <marker id="arrJ" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <path d="M0,0.5 L5,2.5 L0,4.5" fill="var(--poster-red)" />
        </marker>
      </defs>

      {/* Static lines */}
      <g stroke="var(--warm-gray)" strokeWidth={1.5} opacity={0.25} fill="none">
        <path d="M120,43 V57" />
        <path d="M120,83 V107" />
        <path d="M120,133 V157" />
        <path d="M120,183 V209" />
      </g>

      {/* Flow (gold, fast) */}
      <g stroke="var(--poster-gold)" strokeWidth={2}>
        <path className="arch-fp" d="M120,43 V57" />
        <path className="arch-fp" d="M120,83 V107" />
        <path className="arch-fp" d="M120,133 V157" />
        <path className="arch-fp" d="M120,183 V209" />
      </g>

      {/* JIT side-entry */}
      <path className="arch-fj" d="M8,120 H63" stroke="var(--poster-red)" strokeWidth={1.5} markerEnd="url(#arrJ)" />
      <text x={36} y={109} textAnchor="middle" dominantBaseline="central" fill="var(--poster-red)" fontSize={6.5} fontWeight={700} style={ls}>JIT STREAM</text>

      {/* Nodes */}
      <rect x={63} y={17} width={115} height={26} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={30} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={9} fontWeight={800} style={ls}>DOM RENDER</text>

      <rect x={63} y={57} width={115} height={26} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={70} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={9} fontWeight={800} style={ls}>LAYOUT ENGINE</text>

      <rect x={63} y={107} width={115} height={26} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={120} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={9} fontWeight={800} style={ls}>JIT TRANSCODE</text>

      <rect x={63} y={157} width={115} height={26} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={170} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={9} fontWeight={800} style={ls}>CANVAS CAPTURE</text>

      {/* Output */}
      <rect x={50} y={209} width={140} height={44} fill="var(--poster-gold)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={224} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={17} fontWeight={900} style={{ letterSpacing: "-0.02em" }}>{"< 50MS"}</text>
      <text x={120} y={241} textAnchor="middle" dominantBaseline="central" fill="white" fillOpacity={0.85} fontSize={7} fontWeight={700} style={lsw}>INSTANT PREVIEW</text>

      {/* Particle */}
      <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-gold)">
        <animateMotion dur="2s" repeatCount="indefinite" calcMode="linear" path="M120,17 V209" />
        <animate attributeName="opacity" dur="2s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.05;0.88;1" />
      </rect>
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. RENDER PIPELINE — production video at scale
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function RenderDiagram() {
  const { ref, on } = useDiagramAnim();
  // cx=120, nodes w=115 h=26, workers node w=140 h=28
  return (
    <svg ref={ref} data-on={on ? "1" : "0"} viewBox="0 0 220 320" className="w-full h-auto">
      <defs><style>{STYLES}</style></defs>

      {/* Static lines */}
      <g stroke="var(--warm-gray)" strokeWidth={1.5} opacity={0.25} fill="none">
        <path d="M120,43 V57" />
        <path d="M120,83 V100" />
        <path d="M120,128 V145" />
        <path d="M120,171 V188" />
        <path d="M120,214 V231" />
        <path d="M120,257 V274" />
      </g>

      {/* Flow (blue, measured) */}
      <g stroke="var(--poster-blue)" strokeWidth={2}>
        <path className="arch-fr" d="M120,43 V57" />
        <path className="arch-fr" d="M120,83 V100" />
        <path className="arch-fr" d="M120,128 V145" />
        <path className="arch-fr" d="M120,171 V188" />
        <path className="arch-fr" d="M120,214 V231" />
        <path className="arch-fr" d="M120,257 V274" />
      </g>

      {/* Nodes */}
      <rect x={63} y={17} width={115} height={26} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={30} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={9} fontWeight={800} style={ls}>SERIALIZE</text>

      <rect x={63} y={57} width={115} height={26} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={70} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={9} fontWeight={800} style={ls}>INITIALIZE</text>

      {/* Fragment workers — distinct wider node */}
      <rect x={40} y={100} width={160} height={28} fill="var(--poster-blue)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={110} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={8} fontWeight={800} style={ls}>FRAGMENT WORKERS</text>
      <text x={120} y={122} textAnchor="middle" dominantBaseline="central" fill="white" fillOpacity={0.7} fontSize={6.5} fontWeight={600} style={ls}>PARALLEL</text>

      <rect x={63} y={145} width={115} height={26} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={158} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={9} fontWeight={800} style={ls}>CONCATENATE</text>

      <rect x={63} y={188} width={115} height={26} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={201} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={9} fontWeight={800} style={ls}>ENCODE</text>

      <rect x={63} y={231} width={115} height={26} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={244} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={9} fontWeight={800} style={ls}>CDN DELIVER</text>

      {/* Output */}
      <rect x={43} y={274} width={155} height={42} fill="var(--poster-blue)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={120} y={289} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={17} fontWeight={900} style={{ letterSpacing: "-0.02em" }}>10,000+</text>
      <text x={120} y={305} textAnchor="middle" dominantBaseline="central" fill="white" fillOpacity={0.85} fontSize={7} fontWeight={700} style={lsw}>VIDEOS / HOUR</text>

      {/* Particle */}
      <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-blue)">
        <animateMotion dur="4s" repeatCount="indefinite" calcMode="linear" path="M120,17 V274" />
        <animate attributeName="opacity" dur="4s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.03;0.93;1" />
      </rect>
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. JIT STREAMING — media on demand, no ingestion
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function JitDiagram() {
  const { ref, on } = useDiagramAnim();
  return (
    <svg ref={ref} data-on={on ? "1" : "0"} viewBox="0 0 340 160" className="w-full h-auto">
      <defs>
        <style>{STYLES}</style>
        <marker id="arrR" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <path d="M0,0.5 L5,2.5 L0,4.5" fill="var(--poster-red)" />
        </marker>
      </defs>

      {/* Static lines */}
      <g stroke="var(--warm-gray)" strokeWidth={1.5} opacity={0.25} fill="none">
        <path d="M88,55 H125" />
        <path d="M215,55 H252" />
      </g>

      {/* Flow (red) */}
      <path className="arch-fj" d="M88,55 H125" stroke="var(--poster-red)" strokeWidth={2} markerEnd="url(#arrR)" />
      <path className="arch-fj" d="M215,55 H252" stroke="var(--poster-red)" strokeWidth={2} markerEnd="url(#arrR)" />

      {/* Arrow labels */}
      <text x={106} y={42} textAnchor="middle" dominantBaseline="central" fill="var(--warm-gray)" fontSize={6.5} fontWeight={700} style={ls}>BYTE-RANGE</text>
      <text x={234} y={42} textAnchor="middle" dominantBaseline="central" fill="var(--warm-gray)" fontSize={6.5} fontWeight={700} style={ls}>SEGMENT</text>

      {/* Remote URL node */}
      <rect x={13} y={36} width={75} height={38} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={50} y={50} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={8} fontWeight={800} style={ls}>REMOTE</text>
      <text x={50} y={62} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={8} fontWeight={800} style={ls}>URL</text>

      {/* JIT Service */}
      <rect x={125} y={36} width={90} height={38} fill="var(--poster-red)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={170} y={50} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={8} fontWeight={800} style={ls}>JIT</text>
      <text x={170} y={62} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={8} fontWeight={800} style={ls}>SERVICE</text>

      {/* Renderer */}
      <rect x={252} y={36} width={75} height={38} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={289} y={50} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={8} fontWeight={800} style={ls}>RENDERER</text>

      {/* Cache indicator */}
      <text x={170} y={86} textAnchor="middle" dominantBaseline="central" fill="var(--warm-gray)" fontSize={7} fontWeight={700} style={ls}>+ CACHE</text>

      {/* Negation annotations */}
      <text x={56} y={115} textAnchor="middle" dominantBaseline="central" fill="var(--poster-red)" fontSize={8} fontWeight={700} style={ls}>✕ NO UPLOAD</text>
      <text x={170} y={115} textAnchor="middle" dominantBaseline="central" fill="var(--poster-red)" fontSize={8} fontWeight={700} style={ls}>✕ NO INGESTION</text>
      <text x={284} y={115} textAnchor="middle" dominantBaseline="central" fill="var(--poster-red)" fontSize={8} fontWeight={700} style={ls}>✕ NO WAIT</text>

      {/* Particles */}
      <rect className="arch-pt" x={-2} y={-2} width={4} height={4} fill="var(--poster-red)">
        <animateMotion dur="2s" repeatCount="indefinite" calcMode="linear" path="M50,55 H289" />
        <animate attributeName="opacity" dur="2s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.05;0.9;1" />
      </rect>
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   5. PARALLEL FRAGMENTS — the timeline gets sliced, processed
   simultaneously, and reassembled. The punchline is the time
   comparison at the bottom: 4× faster.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function FanOutDiagram() {
  const { ref, on } = useDiagramAnim();

  const FRAGS = [
    { x: 35,  w: 76, cx: 73,  range: "0\u201315s" },
    { x: 113, w: 76, cx: 151, range: "15\u201330s" },
    { x: 191, w: 76, cx: 229, range: "30\u201345s" },
    { x: 269, w: 76, cx: 307, range: "45\u201360s" },
  ] as const;

  const SY = 28;   // segment Y
  const SH = 24;   // segment height
  const WY = 92;   // worker Y
  const WH = 38;   // worker height
  const OY = 166;  // output Y
  const OH = 24;   // output height

  return (
    <svg ref={ref} data-on={on ? "1" : "0"} viewBox="0 0 380 268" className="w-full h-auto">
      <defs><style>{STYLES}</style></defs>

      {/* ── Input: the video timeline, sliced into 4 segments ──── */}
      <text x={35} y={16} dominantBaseline="central"
        fill="var(--warm-gray)" fontSize={7.5} fontWeight={600}
        style={ls}>60 second composition</text>

      {FRAGS.map((f, i) => (
        <g key={f.x}>
          <rect x={f.x} y={SY} width={f.w} height={SH}
            fill="var(--poster-blue)" fillOpacity={1 - i * 0.15}
            stroke="var(--ink-black)" strokeWidth={1} />
          <text x={f.cx} y={SY + SH / 2} textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize={7.5} fontWeight={700}>{f.range}</text>
        </g>
      ))}

      {/* Time markers */}
      <g fill="var(--warm-gray)" fontSize={6} fontWeight={600}>
        <text x={35} y={SY + SH + 10}>0s</text>
        <text x={113} y={SY + SH + 10} textAnchor="middle">15s</text>
        <text x={191} y={SY + SH + 10} textAnchor="middle">30s</text>
        <text x={269} y={SY + SH + 10} textAnchor="middle">45s</text>
        <text x={345} y={SY + SH + 10} textAnchor="end">60s</text>
      </g>

      {/* ── Fan-out: each segment drops to its worker ─────────── */}
      <g stroke="var(--warm-gray)" strokeWidth={1} opacity={0.2} fill="none">
        {FRAGS.map((f) => <path key={`fo${f.x}`} d={`M${f.cx},${SY + SH} V${WY}`} />)}
      </g>
      <g stroke="var(--poster-blue)" strokeWidth={2}>
        {FRAGS.map((f) => <path key={`fof${f.x}`} className="arch-fr" d={`M${f.cx},${SY + SH} V${WY}`} />)}
      </g>

      {/* ── Workers: aligned below their segments ─────────────── */}
      {FRAGS.map((f, i) => (
        <g key={`w${i}`}>
          <rect x={f.x} y={WY} width={f.w} height={WH}
            fill="var(--poster-blue)" stroke="var(--ink-black)" strokeWidth={1.5} />
          <text x={f.cx} y={WY + 14} textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize={8.5} fontWeight={700}>Worker {i + 1}</text>
          <text x={f.cx} y={WY + 28} textAnchor="middle" dominantBaseline="central"
            fill="white" fillOpacity={0.6} fontSize={7} fontWeight={600}>{f.range}</text>
        </g>
      ))}

      {/* ── Fan-in: workers deliver back to a single output ───── */}
      <g stroke="var(--warm-gray)" strokeWidth={1} opacity={0.2} fill="none">
        {FRAGS.map((f) => <path key={`fi${f.x}`} d={`M${f.cx},${WY + WH} V${OY}`} />)}
      </g>
      <g stroke="var(--poster-blue)" strokeWidth={2}>
        {FRAGS.map((f) => <path key={`fif${f.x}`} className="arch-fr" d={`M${f.cx},${WY + WH} V${OY}`} />)}
      </g>

      {/* ── Output: reassembled, no gaps ──────────────────────── */}
      <rect x={35} y={OY} width={310} height={OH}
        fill="var(--poster-blue)" stroke="var(--ink-black)" strokeWidth={1} />
      <text x={190} y={OY + OH / 2} textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize={8} fontWeight={700} style={ls}>Complete video</text>

      {/* ── The punchline: time comparison ────────────────────── */}
      <text x={35} y={210} dominantBaseline="central"
        fill="var(--ink-black)" fontSize={8} fontWeight={700} style={ls}>Render time</text>

      {/* Sequential: full bar, gray, slow */}
      <rect x={35} y={222} width={310} height={14}
        fill="var(--warm-gray)" fillOpacity={0.15}
        stroke="var(--warm-gray)" strokeWidth={0.5} />
      <text x={190} y={229} textAnchor="middle" dominantBaseline="central"
        fill="var(--warm-gray)" fontSize={7} fontWeight={600}>Sequential \u2014 one worker</text>
      <text x={350} y={229} dominantBaseline="central"
        fill="var(--warm-gray)" fontSize={8} fontWeight={700}>60s</text>

      {/* Parallel: quarter bar, blue, fast */}
      <rect x={35} y={244} width={77} height={14}
        fill="var(--poster-blue)" />
      <text x={73} y={251} textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize={7} fontWeight={700}>15s</text>

      {/* 4x callout */}
      <text x={124} y={251} dominantBaseline="central"
        fill="var(--poster-blue)" fontSize={14} fontWeight={900}>4\u00d7 faster</text>

      {/* ── Particles ────────────────────────────────────────── */}
      {FRAGS.map((f, i) => (
        <rect key={`p${i}`} className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-blue)">
          <animateMotion
            dur="2.5s" repeatCount="indefinite" calcMode="linear" begin={`${i * 0.15}s`}
            path={`M${f.cx},${SY + SH} V${WY} V${WY + WH} V${OY}`}
          />
          <animate attributeName="opacity" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.15}s`}
            values="0;1;1;0" keyTimes="0;0.05;0.9;1" />
        </rect>
      ))}
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   6. CLIENT-SIDE RENDERING — export video without a server
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ClientRenderDiagram() {
  const { ref, on } = useDiagramAnim();
  return (
    <svg ref={ref} data-on={on ? "1" : "0"} viewBox="0 0 400 125" className="w-full h-auto">
      <defs>
        <style>{STYLES}</style>
        <marker id="arrG" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <path d="M0,0.5 L5,2.5 L0,4.5" fill="var(--poster-green)" />
        </marker>
      </defs>

      {/* Static lines */}
      <g stroke="var(--warm-gray)" strokeWidth={1.5} opacity={0.25} fill="none">
        <path d="M92,42 H118" />
        <path d="M208,42 H234" />
        <path d="M324,42 H348" />
      </g>

      {/* Flow (green) */}
      <g stroke="var(--poster-green)" strokeWidth={2}>
        <path className="arch-fm" d="M92,42 H118" markerEnd="url(#arrG)" />
        <path className="arch-fm" d="M208,42 H234" markerEnd="url(#arrG)" />
        <path className="arch-fm" d="M324,42 H348" markerEnd="url(#arrG)" />
      </g>

      {/* Nodes */}
      <rect x={17} y={23} width={75} height={38} fill="var(--poster-red)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={54} y={36} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={8} fontWeight={800} style={ls}>YOUR</text>
      <text x={54} y={48} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={8} fontWeight={800} style={ls}>CODE</text>

      <rect x={118} y={23} width={90} height={38} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={163} y={36} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={8} fontWeight={800} style={ls}>BROWSER</text>
      <text x={163} y={48} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={8} fontWeight={800} style={ls}>RENDER</text>

      <rect x={234} y={23} width={90} height={38} fill="var(--card-bg)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={279} y={36} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={8} fontWeight={800} style={ls}>WEBCODECS</text>
      <text x={279} y={48} textAnchor="middle" dominantBaseline="central" fill="var(--ink-black)" fontSize={8} fontWeight={800} style={ls}>ENCODE</text>

      <rect x={348} y={23} width={38} height={38} fill="var(--poster-green)" stroke="var(--ink-black)" strokeWidth={2} />
      <text x={367} y={42} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={9} fontWeight={900}>MP4</text>

      {/* Subtitle */}
      <text x={200} y={90} textAnchor="middle" dominantBaseline="central" fill="var(--warm-gray)" fontSize={8} fontWeight={700} style={ls}>
        NO SERVER. NO UPLOAD. RENDERED ON YOUR DEVICE.
      </text>

      {/* Particle */}
      <rect className="arch-pt" x={-3} y={-3} width={6} height={6} fill="var(--poster-green)">
        <animateMotion dur="2.5s" repeatCount="indefinite" calcMode="linear" path="M54,42 H367" />
        <animate attributeName="opacity" dur="2.5s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.05;0.88;1" />
      </rect>
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COMPOSED LAYOUT — all 6 diagrams in a grid
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ArchitectureDiagram() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <DiagramCard title="THE SPLIT" subtitle="Same code, two execution paths" color="var(--ink-black)" span>
        <SplitDiagram />
      </DiagramCard>

      <DiagramCard title="PREVIEW PIPELINE" subtitle="Instant feedback in the browser" color="var(--poster-gold)">
        <PreviewDiagram />
      </DiagramCard>

      <DiagramCard title="RENDER PIPELINE" subtitle="Production video at scale" color="var(--poster-blue)">
        <RenderDiagram />
      </DiagramCard>

      <DiagramCard title="JIT STREAMING" subtitle="Media on demand, no ingestion" color="var(--poster-red)">
        <JitDiagram />
      </DiagramCard>

      <DiagramCard title="PARALLEL FRAGMENTS" subtitle="Split, process, recombine" color="var(--poster-blue)">
        <FanOutDiagram />
      </DiagramCard>

      <DiagramCard title="CLIENT-SIDE RENDERING" subtitle="Export video without a server" color="var(--poster-green)" span>
        <ClientRenderDiagram />
      </DiagramCard>
    </div>
  );
}

export { ArchitectureDiagram };
export default ArchitectureDiagram;
