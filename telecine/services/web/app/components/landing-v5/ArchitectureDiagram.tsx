import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Preview,
  Timegroup,
  Scrubber,
  TogglePlay,
  TimeDisplay,
} from "@editframe/react";

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

const SCENE_DUR = "18s";

type RenderState = "idle" | "rendering" | "complete";

function FanOutDiagram() {
  const uid = useId();
  const rootId = `fanout-${uid}`;
  const [isClient, setIsClient] = useState(false);
  const [renderState, setRenderState] = useState<RenderState>("idle");
  const [renderProgress, setRenderProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); };
  }, [downloadUrl]);

  const handleRender = async () => {
    const container = containerRef.current;
    if (!container) return;
    const tg = container.querySelector("ef-timegroup") as HTMLElement & {
      pause?: () => void;
      renderToVideo?: (opts: Record<string, unknown>) => Promise<ArrayBuffer | null>;
    };
    if (!tg?.renderToVideo) return;

    tg.pause?.();
    setRenderState("rendering");
    setRenderProgress(0);
    if (downloadUrl) { URL.revokeObjectURL(downloadUrl); setDownloadUrl(null); }

    try {
      const buffer = await tg.renderToVideo({
        fps: 30,
        codec: "avc",
        bitrate: 4_000_000,
        scale: 1,
        returnBuffer: true,
        onProgress: (p: { progress: number }) => setRenderProgress(p.progress),
      });
      if (buffer) {
        const url = URL.createObjectURL(new Blob([buffer], { type: "video/mp4" }));
        setDownloadUrl(url);
        setRenderState("complete");
      }
    } catch {
      setRenderState("idle");
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "editframe-parallel-rendering.mp4";
    a.click();
  };

  useEffect(() => {
    if (!isClient) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let sceneHandle: { update: (t: number, d: number) => void; resize: (w: number, h: number) => void; dispose: () => void } | null = null;
    let ro: ResizeObserver | null = null;
    let disposed = false;

    const loadScene = async () => {
      const { createParallelFragmentsScene } = await import("./parallel-fragments-scene");
      if (disposed) return;

      sceneHandle = createParallelFragmentsScene(canvas);

      const { width, height } = container.getBoundingClientRect();
      sceneHandle.resize(width, height);

      const tg = container.querySelector("ef-timegroup") as HTMLElement & {
        play?: () => void;
        addFrameTask?: (cb: (info: { ownCurrentTimeMs: number; durationMs: number }) => void) => () => void;
        ownCurrentTimeMs?: number;
        durationMs?: number;
      };

      if (tg) {
        sceneHandle.update(tg.ownCurrentTimeMs ?? 0, tg.durationMs ?? 10000);
        tg.addFrameTask?.(({ ownCurrentTimeMs, durationMs }) => {
          sceneHandle?.update(ownCurrentTimeMs, durationMs);
        });
      }

      ro = new ResizeObserver(([entry]) => {
        if (entry) {
          const { width: w, height: h } = entry.contentRect;
          sceneHandle?.resize(w, h);
        }
      });
      ro.observe(container);
    };

    loadScene();

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          const tg = container.querySelector("ef-timegroup") as HTMLElement & { play?: () => void };
          tg?.play?.();
          observer.unobserve(container);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(container);

    return () => {
      disposed = true;
      sceneHandle?.dispose();
      ro?.disconnect();
      observer.disconnect();
    };
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
          style={{ aspectRatio: "16/10", background: "#252a3a" }}
        >
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              display: "block",
            }}
          />

          {/* ── Timed text overlays ──────────────────────────────── */}
          {/* Phase 1: introduce the composition (0.4s–2.2s) */}
          <div className="ef-caption" style={{ top: "6%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 600ms 400ms backwards, efCaptionOut 500ms 2200ms forwards" }}>
            Your composition
          </div>

          {/* Phase 2: the cut (3.6s–5.5s, after camera has pulled back) */}
          <div className="ef-caption" style={{ top: "6%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 500ms 3600ms backwards, efCaptionOut 500ms 5500ms forwards" }}>
            Split into fragments
          </div>

          {/* Phase 3: side labels (6s+, persistent) */}
          <div className="ef-caption ef-caption-dim" style={{ top: "6%", left: "18%", animation: "efCaptionIn 500ms 6000ms backwards" }}>
            Sequential
          </div>
          <div className="ef-caption" style={{ top: "6%", left: "68%", animation: "efCaptionIn 500ms 6000ms backwards" }}>
            Parallel
          </div>

          {/* Phase 4: processing (8s–10.5s) */}
          <div className="ef-caption ef-caption-sm" style={{ bottom: "8%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 500ms 8000ms backwards, efCaptionOut 500ms 10500ms forwards" }}>
            All workers process simultaneously
          </div>

          {/* Phase 5: punchline (12s+) */}
          <div className="ef-caption ef-caption-hero" style={{ bottom: "10%", right: "8%", animation: "efCaptionIn 600ms 12000ms backwards" }}>
            {"4\u00d7 faster"}
          </div>
        </Timegroup>
      </Preview>

      <style>{`
        .ef-caption {
          position: absolute;
          pointer-events: none;
          color: rgba(255,255,255,0.9);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-shadow: 0 1px 8px rgba(0,0,0,0.6);
          white-space: nowrap;
          opacity: 0;
        }
        .ef-caption-dim { color: rgba(255,255,255,0.45); }
        .ef-caption-sm { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.6); }
        .ef-caption-hero { font-size: 22px; font-weight: 900; color: #42A5F5; text-shadow: 0 0 20px rgba(66,165,245,0.5); }
        @keyframes efCaptionIn {
          from { opacity: 0; transform: translateY(8px); }
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
          {renderState === "rendering" ? (
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--poster-blue)] rounded-full transition-all duration-200" style={{ width: `${renderProgress * 100}%` }} />
            </div>
          ) : (
            <Scrubber
              target={rootId}
              className="w-full h-1 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-[var(--poster-blue)] [&::part(progress)]:rounded-full [&::part(thumb)]:bg-white [&::part(thumb)]:w-2.5 [&::part(thumb)]:h-2.5 [&::part(thumb)]:rounded-full"
            />
          )}
        </div>

        <div className="px-3 border-l border-white/10 h-9 flex items-center">
          {renderState === "rendering" ? (
            <span className="text-[10px] text-white/60 font-mono tabular-nums">
              {(renderProgress * 100).toFixed(0)}%
            </span>
          ) : (
            <TimeDisplay
              target={rootId}
              className="text-[10px] text-white/60 font-mono tabular-nums"
            />
          )}
        </div>

        {/* Render / Download button */}
        <div className="border-l border-white/10 h-9 flex items-center">
          {renderState === "idle" && (
            <button
              onClick={handleRender}
              className="h-9 px-3 flex items-center gap-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Export MP4"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
              <span className="text-[10px] font-semibold tracking-wide">MP4</span>
            </button>
          )}
          {renderState === "rendering" && (
            <div className="h-9 px-3 flex items-center">
              <div className="w-3.5 h-3.5 border-2 border-[var(--poster-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {renderState === "complete" && (
            <button
              onClick={handleDownload}
              className="h-9 px-3 flex items-center gap-1.5 text-[var(--poster-green)] hover:brightness-125 transition-colors"
              title="Download editframe-parallel-rendering.mp4"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
              <span className="text-[10px] font-semibold tracking-wide">Save</span>
            </button>
          )}
        </div>
      </div>
    </div>
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

      <DiagramCard title="PARALLEL FRAGMENTS" subtitle="Split, process, recombine" color="var(--poster-blue)" span>
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
