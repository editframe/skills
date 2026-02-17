import { useId, useEffect, useState, useRef, useCallback } from "react";
import {
  Preview,
  FitScale,
  Timegroup,
  Text,
  Scrubber,
  TogglePlay,
  TimeDisplay,
} from "@editframe/react";
import { ExportButton } from "./ExportButton";

/* ━━ Scene Timing (30fps frame-aligned) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const OVERLAP_MS = 495; // 15 frames
const SCENES = [
  { name: "Author", durationMs: 2640 },
  { name: "Compose", durationMs: 3300 },
  { name: "Template", durationMs: 3630 },
  { name: "Preview", durationMs: 2640 },
  { name: "Ship", durationMs: 3795 },
] as const;

/* ━━ Code snippets per scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const CODE_SNIPPETS = [
  `<Text split="word" stagger="132ms">\n  BUILD VIDEO WITH CODE\n</Text>`,
  `<Timegroup mode="contain">\n  <Video src="interview.mp4" />\n  <Captions target="video" />\n</Timegroup>`,
  `editframe render \\\n  --data '{"name":"Sarah Chen"}'`,
  `<Preview>\n  <Filmstrip />\n  <Scrubber />\n</Preview>`,
  `npx editframe render comp.tsx\neditframe cloud-render comp.tsx`,
];

/* ━━ Crossfade style for each scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function sceneStyle(durationMs: number): React.CSSProperties {
  const fadeOutDelay = durationMs - OVERLAP_MS;
  return {
    animation: `hero-fade-in ${OVERLAP_MS}ms ease-out both, hero-fade-out ${OVERLAP_MS}ms ease-in both`,
    animationDelay: `0ms, ${fadeOutDelay}ms`,
  };
}

/* ━━ Scene 1: Author — kinetic typography ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneAuthor() {
  return (
    <Timegroup mode="fixed" duration="2640ms" className="relative" style={{ ...sceneStyle(2640), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
        <Text
          split="word"
          staggerMs={132}
          easing="ease-out"
          className="text-white text-7xl font-black tracking-tighter text-center leading-none"
          style={{ animation: "hero-slam-up 400ms ease-out both" }}
        >
          BUILD VIDEO WITH CODE
        </Text>
        <div
          className="mt-4 h-1 bg-[var(--poster-gold)]"
          style={{
            width: "40%",
            transformOrigin: "left",
            animation: "hero-draw-line 660ms ease-out both",
            animationDelay: "660ms",
          }}
        />
      </div>
    </Timegroup>
  );
}

/* ━━ Scene 2: Compose — layered composition ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneCompose() {
  return (
    <Timegroup mode="fixed" duration="3300ms" className="relative" style={{ ...sceneStyle(3300), width: 960, height: 540, background: "#0a0a0a" }}>
      {/* Background layer */}
      <div
        className="absolute"
        style={{
          left: 120, top: 60, width: 340, height: 420,
          background: "var(--poster-blue)",
          animation: "hero-slide-in-bottom 330ms ease-out both",
          animationDelay: "165ms",
        }}
      />
      {/* Caption text layer */}
      <div
        className="absolute flex items-end p-6"
        style={{
          left: 200, top: 140, width: 560, height: 340,
          background: "#1a1a1a",
          border: "3px solid white",
          animation: "hero-slide-in-bottom 330ms ease-out both",
          animationDelay: "495ms",
        }}
      >
        <div className="text-white text-2xl font-bold leading-tight">
          Every frame tells a <span className="px-1" style={{ background: "var(--poster-gold)", color: "#0a0a0a", animation: "hero-pulse-highlight 1650ms ease-out both", animationDelay: "990ms" }}>story</span>
        </div>
      </div>
      {/* Progress bar layer */}
      <div
        className="absolute"
        style={{
          left: 200, bottom: 50, width: 560, height: 4,
          background: "rgba(255,255,255,0.2)",
          animation: "hero-slide-in-bottom 330ms ease-out both",
          animationDelay: "825ms",
        }}
      >
        <div
          className="h-full bg-[var(--poster-red)]"
          style={{ animation: "hero-grow-width 1650ms ease-out both", animationDelay: "990ms", ["--bar-target" as string]: "100%" }}
        />
      </div>
      {/* Layer labels */}
      <div
        className="absolute text-xs font-mono uppercase tracking-wider text-white/50"
        style={{
          right: 40, top: 20,
          animation: "hero-fade-in 330ms ease-out both",
          animationDelay: "660ms",
        }}
      >
        3 layers
      </div>
    </Timegroup>
  );
}

/* ━━ Scene 3: Template — data-driven name cycling ━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneTemplate() {
  const names = ["Sarah Chen", "Marcus Johnson", "Alex Rivera"];
  const cycleDuration = 990; // 30 frames each

  return (
    <Timegroup mode="fixed" duration="3630ms" className="relative" style={{ ...sceneStyle(3630), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-white/50 text-sm font-mono uppercase tracking-widest mb-6" style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "165ms" }}>
          --data
        </div>
        <div className="relative h-16 overflow-hidden" style={{ width: 500 }}>
          {names.map((name, i) => (
            <div
              key={name}
              className="absolute inset-0 flex items-center justify-center text-white text-5xl font-black tracking-tight"
              style={{
                animation: `hero-fade-in 330ms ease-out both, hero-fade-out 330ms ease-in both`,
                animationDelay: `${i * cycleDuration + 330}ms, ${(i + 1) * cycleDuration}ms`,
              }}
            >
              {name}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-8" style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "330ms" }}>
          {names.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2"
              style={{
                background: "var(--poster-gold)",
                animation: `hero-pop-in 264ms ease-out both`,
                animationDelay: `${i * cycleDuration + 330}ms`,
              }}
            />
          ))}
        </div>
      </div>
      <div
        className="absolute bottom-8 inset-x-0 text-center text-xs font-mono text-white/30"
        style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "165ms" }}
      >
        editframe render --data &apos;&#123;&quot;name&quot;:&quot;...&quot;&#125;&apos;
      </div>
    </Timegroup>
  );
}

/* ━━ Scene 4: Preview — editor UI assembly ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ScenePreview() {
  return (
    <Timegroup mode="fixed" duration="2640ms" className="relative" style={{ ...sceneStyle(2640), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col p-8 gap-3">
        {/* Preview rect */}
        <div
          className="flex-1 border-2 border-white/80 flex items-center justify-center"
          style={{ animation: "hero-slide-in-bottom 330ms ease-out both", animationDelay: "165ms" }}
        >
          <svg className="w-12 h-12 text-white/30" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        {/* Filmstrip */}
        <div
          className="h-12 flex gap-1"
          style={{ animation: "hero-slide-in-bottom 330ms ease-out both", animationDelay: "363ms" }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 bg-white/10" />
          ))}
        </div>
        {/* Scrubber + trim handles */}
        <div
          className="h-6 relative flex items-center"
          style={{ animation: "hero-slide-in-bottom 330ms ease-out both", animationDelay: "561ms" }}
        >
          <div className="absolute inset-x-0 h-1 bg-white/20">
            <div className="h-full w-1/3 bg-[var(--poster-red)]" />
          </div>
          <div className="absolute left-0 w-1 h-full bg-white" />
          <div className="absolute right-0 w-1 h-full bg-white" />
          <div className="absolute left-[33%] w-3 h-3 bg-white -translate-x-1/2" />
        </div>
      </div>
      <div
        className="absolute top-4 right-4 text-xs font-mono uppercase tracking-wider text-white/40"
        style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "330ms" }}
      >
        &lt;Preview&gt;
      </div>
    </Timegroup>
  );
}

/* ━━ Scene 5: Ship — parallel render bars ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneShip() {
  const bars = [
    { label: "Cloud", color: "var(--poster-green)", duration: 1320, target: "100%", delay: 660 },
    { label: "Browser", color: "var(--poster-blue)", duration: 1650, target: "100%", delay: 660 },
    { label: "Local", color: "var(--poster-red)", duration: 1980, target: "100%", delay: 660 },
  ];

  return (
    <Timegroup mode="fixed" duration="3795ms" className="relative" style={{ ...sceneStyle(3795), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-16 gap-6">
        <div
          className="text-white text-3xl font-black tracking-tight"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "165ms" }}
        >
          Render anywhere
        </div>
        <div className="w-full max-w-lg flex flex-col gap-4">
          {bars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-4" style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: `${bar.delay - 330}ms` }}>
              <span className="text-white/70 text-sm font-mono w-20 text-right">{bar.label}</span>
              <div className="flex-1 h-6 bg-white/10 relative overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    background: bar.color,
                    animation: `hero-grow-width ${bar.duration}ms ease-out both`,
                    animationDelay: `${bar.delay}ms`,
                    ["--bar-target" as string]: bar.target,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        {/* 4× badge on cloud bar */}
        <div
          className="absolute text-sm font-black px-2 py-1 bg-[var(--poster-gold)] text-black"
          style={{
            right: "calc(50% - 240px + 80px + 16px)",
            top: "calc(50% - 20px)",
            animation: "hero-pop-in 264ms ease-out both",
            animationDelay: `${660 + 1320 + 132}ms`,
          }}
        >
          4×
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━ Compute scene start times for code overlay sync ━━━━━━━━━━━━━━━━━━━━━ */
const sceneStartTimes: number[] = [];
{
  let t = 0;
  for (let i = 0; i < SCENES.length; i++) {
    sceneStartTimes.push(t);
    t += SCENES[i]!.durationMs - OVERLAP_MS;
  }
}

function getActiveScene(currentTimeMs: number): number {
  for (let i = sceneStartTimes.length - 1; i >= 0; i--) {
    if (currentTimeMs >= sceneStartTimes[i]!) return i;
  }
  return 0;
}

/* ━━ Main Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function HeroDemo() {
  const id = useId();
  const previewId = `hero-demo-${id}`;
  const previewRef = useRef<HTMLElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const sceneName = SCENES[activeScene]?.name ?? "Author";
  const codeSnippet = CODE_SNIPPETS[activeScene] ?? CODE_SNIPPETS[0];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    let raf: number;
    const tick = () => {
      const el = previewRef.current as any;
      if (el?.currentTimeMs != null && !Number.isNaN(el.currentTimeMs)) {
        setActiveScene(getActiveScene(el.currentTimeMs));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isClient]);

  const autoPlay = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    (previewRef as any).current = el;
    requestAnimationFrame(() => {
      (el as any).play?.();
    });
  }, []);

  return (
    <div className="w-full relative">
      {/* Preview area — full width, preview-dominant */}
      <div className="bg-[#0a0a0a] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div className="aspect-video relative">
          {isClient ? (
            <Preview
              id={previewId}
              ref={autoPlay}
              loop
              className="block w-full h-full"
            >
              <FitScale>
                <Timegroup
                  mode="sequence"
                  overlapMs={OVERLAP_MS}
                  className="relative"
                  style={{ width: 960, height: 540 }}
                >
                  <SceneAuthor />
                  <SceneCompose />
                  <SceneTemplate />
                  <ScenePreview />
                  <SceneShip />
                </Timegroup>
              </FitScale>
            </Preview>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
              <div className="text-white/30 text-xs uppercase tracking-widest">Loading</div>
            </div>
          )}

          {/* Floating code card overlay */}
          {isClient && (
            <div className="absolute bottom-4 right-4 max-w-xs bg-[#0a0a0a]/90 border-2 border-white/20 p-3 pointer-events-none">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1">
                {sceneName}
              </div>
              <pre className="text-xs font-mono text-[var(--poster-gold)] leading-relaxed whitespace-pre-wrap">
                {codeSnippet}
              </pre>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="border-t-4 border-[var(--ink-black)] dark:border-white bg-[#111]">
          {isClient ? (
            <div className="flex items-center">
              <TogglePlay target={previewId}>
                <button
                  slot="pause"
                  className="w-12 h-12 flex items-center justify-center bg-[var(--poster-red)] hover:brightness-110"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
                <button
                  slot="play"
                  className="w-12 h-12 flex items-center justify-center bg-[var(--poster-blue)] hover:brightness-110"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </TogglePlay>

              <div className="flex-1 px-4 h-12 flex items-center border-l-2 border-[var(--ink-black)] dark:border-white">
                <Scrubber
                  {...{ target: previewId } as any}
                  className="w-full h-1.5 bg-white/20 cursor-pointer [&::part(progress)]:bg-[var(--poster-red)] [&::part(handle)]:bg-white [&::part(handle)]:w-3 [&::part(handle)]:h-3"
                />
              </div>

              <div className="px-4 border-l-2 border-[var(--ink-black)] dark:border-white h-12 flex items-center">
                <TimeDisplay
                  target={previewId}
                  className="text-xs text-white/70 font-mono tabular-nums"
                />
              </div>

              <ExportButton
                compact
                getTarget={() => previewRef.current?.querySelector("ef-timegroup") as HTMLElement}
                name="Hero Trailer"
                fileName="editframe-hero.mp4"
                className="border-l-2 border-[var(--ink-black)] dark:border-white"
              />
            </div>
          ) : (
            <div className="flex items-center h-12">
              <div className="w-12 h-12 flex items-center justify-center bg-[var(--poster-blue)]">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="flex-1 px-4 border-l-2 border-[var(--ink-black)] dark:border-white">
                <div className="w-full h-1.5 bg-white/20" />
              </div>
              <div className="px-4 border-l-2 border-[var(--ink-black)] dark:border-white h-12 flex items-center">
                <span className="text-xs text-white/50 font-mono">0:00</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeroDemo;
