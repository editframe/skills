import React, { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Preview,
  Timegroup,
  Scrubber,
  TogglePlay,
  TimeDisplay,
} from "@editframe/react";
import { useRenderQueue } from "./RenderQueue";
import { ParallelFragmentsCanvas } from "./parallel-fragments-r3f";
import { JITStreamingCanvas } from "./jit-streaming-scene";

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
   5. PARALLEL FRAGMENTS — Three.js 3D visualization driven by an
   Editframe composition via addFrameTask.  Film strip fractures
   into illuminated blocks, parallel particle processing, reassembly,
   and a time-comparison punchline.  Fully scrubable.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const SCENE_DUR = "14s";
const JIT_SCENE_DUR = "14s";

function FanOutDiagram() {
  const uid = useId();
  const rootId = `fanout-${uid}`;
  const [isClient, setIsClient] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { enqueue } = useRenderQueue();

  useEffect(() => { setIsClient(true); }, []);

  const handleRender = () => {
    const tg = containerRef.current?.querySelector("ef-timegroup");
    if (tg) {
      enqueue({
        name: "Parallel Rendering",
        fileName: "editframe-parallel-rendering.mp4",
        timegroupEl: tg as HTMLElement,
      });
    }
  };

  // Bridge: addFrameTask feeds composition time → React state → R3F scene
  useEffect(() => {
    if (!isClient) return;
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const setup = async () => {
      // Dynamic import vanilla scene for render clones only
      const { createParallelFragmentsScene } = await import("./parallel-fragments-scene");
      if (disposed) return;

      const tg = container.querySelector("ef-timegroup") as HTMLElement & {
        initializer?: (instance: HTMLElement) => void;
        addFrameTask?: (cb: (info: { ownCurrentTimeMs: number; durationMs: number }) => void) => () => void;
      };
      if (!tg) return;

      // Prime: feed time to React state (R3F reads it)
      tg.addFrameTask?.(({ ownCurrentTimeMs }) => {
        setTimeMs(ownCurrentTimeMs);
      });

      // Render clones: vanilla Three.js fallback (R3F doesn't survive cloning)
      type SceneHandle = { update: (t: number, d: number) => void; resize: (w: number, h: number) => void; dispose: () => void };
      tg.initializer = (instance: HTMLElement & {
        ownCurrentTimeMs?: number;
        durationMs?: number;
        addFrameTask?: (cb: (info: { ownCurrentTimeMs: number; durationMs: number }) => void) => () => void;
      }) => {
        if (instance === tg) return;
        let cloneScene: SceneHandle | null = null;
        instance.addFrameTask?.(({ ownCurrentTimeMs, durationMs }) => {
          if (!cloneScene) {
            const cloneCvs = instance.querySelector("canvas") as HTMLCanvasElement | null;
            if (!cloneCvs) return;
            cloneScene = createParallelFragmentsScene(cloneCvs);
            const rect = cloneCvs.getBoundingClientRect();
            cloneScene.resize(rect.width || cloneCvs.clientWidth || 800, rect.height || cloneCvs.clientHeight || 500);
          }
          cloneScene.update(ownCurrentTimeMs, durationMs);
        });
      };
    };

    setup();
    return () => { disposed = true; };
  }, [isClient]);

  if (!isClient) {
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{ aspectRatio: "16/10", background: "#252a3a" }}
      >
        <span className="text-xs text-[var(--warm-gray)]">Loading\u2026</span>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <Preview id={rootId} loop>
        <Timegroup
          mode="fixed"
          duration={SCENE_DUR}
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "16/10", background: "#1e2233" }}
        >
          {/* R3F scene for live playback; vanilla fallback for render clones */}
          <ParallelFragmentsCanvas timeMs={timeMs} />

          {/* ── Timed text overlays (bigger, stronger shadows) ──── */}

          {/* Phase 1: hero moment (0.3s–1.8s) */}
          <div className="ef-caption ef-caption-lg" style={{ top: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 600ms 300ms backwards, efCaptionOut 400ms 1800ms forwards" }}>
            A 60-second video composition
          </div>

          {/* Phase 2: the question (2.2s–2.9s) */}
          <div className="ef-caption ef-caption-lg" style={{ top: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 2200ms backwards, efCaptionOut 400ms 2900ms forwards" }}>
            How do you render it?
          </div>

          {/* Phase 3: side labels (3.2s+) */}
          <div className="ef-caption ef-caption-dim" style={{ top: "3%", left: "10%", animation: "efCaptionIn 400ms 3200ms backwards" }}>
            Traditional
          </div>
          <div className="ef-caption ef-caption-sub" style={{ top: "9%", left: "10%", animation: "efCaptionIn 400ms 3600ms backwards" }}>
            One worker, start to finish
          </div>

          <div className="ef-caption ef-caption-brand" style={{ top: "3%", right: "10%", animation: "efCaptionIn 400ms 3200ms backwards" }}>
            Editframe
          </div>
          <div className="ef-caption ef-caption-sub" style={{ top: "9%", right: "10%", animation: "efCaptionIn 400ms 3600ms backwards" }}>
            Split into fragments, render in parallel
          </div>

          {/* Phase 4: narrate (7s–8.5s) */}
          <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 7000ms backwards, efCaptionOut 400ms 8500ms forwards" }}>
            Every worker processes its fragment at the same time
          </div>

          {/* Phase 5: punchline (9.5s+) */}
          <div className="ef-caption ef-caption-hero" style={{ bottom: "14%", right: "8%", animation: "efCaptionIn 500ms 9500ms backwards" }}>
            {"4\u00d7 faster"}
          </div>
          <div className="ef-caption ef-caption-sub" style={{ bottom: "7%", right: "8%", animation: "efCaptionIn 400ms 10200ms backwards" }}>
            Same quality. A fraction of the time.
          </div>
        </Timegroup>
      </Preview>

      <style>{`
        .ef-caption {
          position: absolute;
          pointer-events: none;
          color: rgba(255,255,255,0.95);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-shadow: 0 2px 12px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5);
          white-space: nowrap;
          opacity: 0;
        }
        .ef-caption-lg { font-size: 18px; font-weight: 800; }
        .ef-caption-dim { color: rgba(255,255,255,0.4); font-size: 16px; }
        .ef-caption-brand { font-size: 16px; font-weight: 800; color: #82b1ff; }
        .ef-caption-sub { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.55); }
        .ef-caption-hero { font-size: 28px; font-weight: 900; color: #82b1ff; text-shadow: 0 0 30px rgba(130,177,255,0.6), 0 2px 12px rgba(0,0,0,0.8); }
        @keyframes efCaptionIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes efCaptionOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>

      {/* ── Playback + render controls ────────────────────────── */}
      <div className="flex items-center gap-0 bg-[#111] overflow-hidden" style={{ borderRadius: "0 0 3px 3px" }}>
        <TogglePlay target={rootId}>
          <button
            slot="play"
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button
            slot="pause"
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          </button>
        </TogglePlay>

        <div className="flex-1 px-3 h-9 flex items-center border-l border-white/10">
          <Scrubber
            target={rootId}
            className="w-full h-1 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-[var(--poster-blue)] [&::part(progress)]:rounded-full [&::part(thumb)]:bg-white [&::part(thumb)]:w-2.5 [&::part(thumb)]:h-2.5 [&::part(thumb)]:rounded-full"
          />
        </div>

        <div className="px-3 border-l border-white/10 h-9 flex items-center">
          <TimeDisplay
            target={rootId}
            className="text-[10px] text-white/60 font-mono tabular-nums"
          />
        </div>

        {/* Enqueue render — progress/download handled by RenderQueuePanel */}
        <div className="border-l border-white/10 h-9 flex items-center">
          <button
            onClick={handleRender}
            className="h-9 px-3 flex items-center gap-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Export MP4"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
            <span className="text-[10px] font-semibold tracking-wide">MP4</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   6. JIT STREAMING PLAYBACK — React Three Fiber visualization showing
   on-demand transcoding with zero ingestion delay
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function JITStreamingDiagram() {
  const uid = useId();
  const rootId = `jit-streaming-${uid}`;
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { enqueue } = useRenderQueue();

  useEffect(() => { setIsClient(true); }, []);

  const handleRender = () => {
    const tg = containerRef.current?.querySelector("ef-timegroup");
    if (tg) {
      enqueue({
        name: "JIT Streaming",
        fileName: "editframe-jit-streaming.mp4",
        timegroupEl: tg as HTMLElement,
      });
    }
  };

  // State to pass to React Three Fiber
  const [sceneTime, setSceneTime] = useState(0);
  const [sceneDuration, setSceneDuration] = useState(14000);

  useEffect(() => {
    if (!isClient) return;
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const setup = async () => {
      const tg = container.querySelector("ef-timegroup") as HTMLElement & {
        ownCurrentTimeMs?: number;
        durationMs?: number;
        addFrameTask?: (cb: (info: { ownCurrentTimeMs: number; durationMs: number }) => void) => () => void;
        initializer?: (instance: HTMLElement) => void;
      };
      if (!tg || disposed) return;

      // Update scene time on every frame
      tg.addFrameTask?.(({ ownCurrentTimeMs, durationMs }) => {
        setSceneTime(ownCurrentTimeMs);
        setSceneDuration(durationMs);
      });

      // For render clones
      tg.initializer = (instance: HTMLElement & {
        ownCurrentTimeMs?: number;
        durationMs?: number;
        addFrameTask?: (cb: (info: { ownCurrentTimeMs: number; durationMs: number }) => void) => () => void;
      }) => {
        if (instance === tg) return;

        // React Three Fiber will be re-created in the clone
        instance.addFrameTask?.(() => {
          // Scene state updates will be handled by React in the cloned tree
        });
      };
    };

    setup();

    return () => {
      disposed = true;
    };
  }, [isClient]);

  if (!isClient) {
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{ aspectRatio: "16/10", background: "#1e2233" }}
      >
        <span className="text-xs text-[var(--warm-gray)]">Loading\u2026</span>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <Preview id={rootId} loop>
        <Timegroup
          mode="fixed"
          duration={JIT_SCENE_DUR}
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "16/10", background: "#1e2233" }}
        >
          {/* React Three Fiber scene */}
          <div style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}>
            {/* Lazy load the scene to avoid SSR issues */}
            {isClient && (
              <React.Suspense fallback={<div>Loading scene...</div>}>
                <JITStreamingCanvas currentTimeMs={sceneTime} />
              </React.Suspense>
            )}
          </div>

          {/* ── Timed text overlays ──── */}

          {/* Phase 1: hero moment (0.3s–2s) */}
          <div className="ef-caption ef-caption-lg" style={{ top: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 600ms 300ms backwards, efCaptionOut 400ms 1800ms forwards" }}>
            Any video. Any URL. Any format.
          </div>

          {/* Phase 2: the question (2.2s–3.2s) */}
          <div className="ef-caption ef-caption-lg" style={{ top: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 2200ms backwards, efCaptionOut 400ms 3200ms forwards" }}>
            What happens when you hit play?
          </div>

          {/* Phase 3: side labels (3.5s+) */}
          <div className="ef-caption ef-caption-dim" style={{ top: "3%", left: "8%", animation: "efCaptionIn 400ms 3800ms backwards" }}>
            Traditional
          </div>
          <div className="ef-caption ef-caption-sub" style={{ top: "9%", left: "8%", animation: "efCaptionIn 400ms 4200ms backwards" }}>
            Upload → Ingest → Transcode → Store
          </div>

          <div className="ef-caption ef-caption-brand" style={{ top: "3%", right: "8%", animation: "efCaptionIn 400ms 3800ms backwards" }}>
            Editframe
          </div>
          <div className="ef-caption ef-caption-sub" style={{ top: "9%", right: "8%", animation: "efCaptionIn 400ms 4200ms backwards" }}>
            Just a URL. JIT does the rest.
          </div>

          {/* Phase 4: narrate mechanism (5.5s–8s) */}
          <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 5500ms backwards, efCaptionOut 400ms 8000ms forwards" }}>
            Adaptive multi-bitrate streams generated on demand
          </div>

          {/* Phase 5: punchline (10s+) */}
          <div className="ef-caption ef-caption-hero" style={{ bottom: "16%", right: "6%", animation: "efCaptionIn 500ms 10000ms backwards" }}>
            Already playing
          </div>
          <div className="ef-caption ef-caption-sub" style={{ bottom: "9%", right: "6%", animation: "efCaptionIn 400ms 10500ms backwards" }}>
            No upload. No ingestion. No waiting.
          </div>

          {/* Traditional side still-going callout */}
          <div className="ef-caption ef-caption-sub" style={{ bottom: "16%", left: "8%", animation: "efCaptionIn 400ms 10800ms backwards" }}>
            Still uploading…
          </div>
        </Timegroup>
      </Preview>

      {/* Reuse caption styles from parallel fragments */}
      <style>{`
        .ef-caption {
          position: absolute;
          pointer-events: none;
          color: rgba(255,255,255,0.95);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-shadow: 0 2px 12px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5);
          white-space: nowrap;
          opacity: 0;
        }
        .ef-caption-lg { font-size: 18px; font-weight: 800; }
        .ef-caption-dim { color: rgba(255,255,255,0.4); font-size: 16px; }
        .ef-caption-brand { font-size: 16px; font-weight: 800; color: #ff5252; }
        .ef-caption-sub { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.55); }
        .ef-caption-hero { font-size: 28px; font-weight: 900; color: #ff5252; text-shadow: 0 0 30px rgba(255,82,82,0.6), 0 2px 12px rgba(0,0,0,0.8); }
        @keyframes efCaptionIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes efCaptionOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>

      {/* ── Playback + render controls ────────────────────────── */}
      <div className="flex items-center gap-0 bg-[#111] overflow-hidden" style={{ borderRadius: "0 0 3px 3px" }}>
        <TogglePlay target={rootId}>
          <button
            slot="play"
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button
            slot="pause"
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          </button>
        </TogglePlay>

        <div className="flex-1 px-3 h-9 flex items-center border-l border-white/10">
          <Scrubber
            target={rootId}
            className="w-full h-1 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-[var(--poster-red)] [&::part(progress)]:rounded-full [&::part(thumb)]:bg-white [&::part(thumb)]:w-2.5 [&::part(thumb)]:h-2.5 [&::part(thumb)]:rounded-full"
          />
        </div>

        <div className="px-3 border-l border-white/10 h-9 flex items-center">
          <TimeDisplay
            target={rootId}
            className="text-[10px] text-white/60 font-mono tabular-nums"
          />
        </div>

        <div className="border-l border-white/10 h-9 flex items-center">
          <button
            onClick={handleRender}
            className="h-9 px-3 flex items-center gap-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Export MP4"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
            <span className="text-[10px] font-semibold tracking-wide">MP4</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   7. CLIENT-SIDE RENDERING — export video without a server
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

      <DiagramCard title="PARALLEL FRAGMENTS" subtitle="Split, process, recombine" color="var(--poster-blue)" span>
        <FanOutDiagram />
      </DiagramCard>

      <DiagramCard title="JIT STREAMING PLAYBACK" subtitle="On-demand transcoding, zero wait" color="var(--poster-red)" span>
        <JITStreamingDiagram />
      </DiagramCard>

      <DiagramCard title="CLIENT-SIDE RENDERING" subtitle="Export video without a server" color="var(--poster-green)" span>
        <ClientRenderDiagram />
      </DiagramCard>
    </div>
  );
}

export { ArchitectureDiagram };
export default ArchitectureDiagram;
