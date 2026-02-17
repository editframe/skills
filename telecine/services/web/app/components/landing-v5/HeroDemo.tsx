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
import { CompositionCanvas, useCompositionTime } from "@editframe/react/r3f";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { ExportButton } from "./ExportButton";

/* ━━ Scene Timing (30fps frame-aligned) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const OVERLAP_MS = 495; // 15 frames
const SCENES = [
  { name: "Author", durationMs: 2640 },
  { name: "Compose", durationMs: 3300 },
  { name: "Template", durationMs: 3630 },
  { name: "Render", durationMs: 2970 },
  { name: "Ship", durationMs: 3795 },
] as const;

/* ━━ Code snippets per scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const CODE_SNIPPETS = [
  `<Text split="char" stagger="40ms"\n  easing="ease-out">\n  BUILD VIDEO WITH CODE\n</Text>`,
  `<Timegroup mode="contain">\n  <Video src="interview.mp4" />\n  <Text>Every frame tells a story</Text>\n</Timegroup>`,
  `editframe render \\\n  --data '{"name":"Sarah Chen"}'`,
  `<Preview loop>\n  <Timegroup mode="fixed" duration="5s">\n    <CompositionCanvas shadows />\n  </Timegroup>\n</Preview>`,
  `$ npx editframe render hero.tsx\n\n✓ Rendered in 1.2s`,
];

/* ━━ Crossfade style for each scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function sceneStyle(durationMs: number): React.CSSProperties {
  const fadeOutDelay = durationMs - OVERLAP_MS;
  return {
    animation: `hero-fade-in ${OVERLAP_MS}ms ease-out both, hero-fade-out ${OVERLAP_MS}ms ease-in both`,
    animationDelay: `0ms, ${fadeOutDelay}ms`,
  };
}

/* ━━ Scene 1: Author — char-level shatter-assemble, glass material ━━━━━━━ */
function SceneAuthor() {
  return (
    <Timegroup mode="fixed" duration="2640ms" className="relative" style={{ ...sceneStyle(2640), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Text
          split="char"
          staggerMs={40}
          easing="ease-out"
          className="text-white text-7xl font-black tracking-tighter text-center leading-[1.1]"
          style={{
            animation: "hero-char-assemble 400ms cubic-bezier(0.68, -0.1, 0.265, 1.1) both",
          }}
        >
          BUILD VIDEO WITH CODE
        </Text>
        <div
          className="mt-6 h-1 bg-[var(--poster-gold)]"
          style={{
            width: "50%",
            transformOrigin: "left",
            animation: "hero-draw-spring 660ms cubic-bezier(0.68, -0.1, 0.265, 1.1) both",
            animationDelay: "825ms",
          }}
        />
      </div>
    </Timegroup>
  );
}

/* ━━ Scene 2: Compose — 3D floating layers with R3F ━━━━━━━━━━━━━━━━━━━━━━ */

const LAYER_COLORS = [
  new THREE.Color("#1565C0"), // poster-blue
  new THREE.Color("#FFFFFF"),
  new THREE.Color("#E53935"), // poster-red
];

function LayerPlane({ index, color }: { index: number; color: THREE.Color }) {
  const { timeMs } = useCompositionTime();
  const meshRef = useRef<THREE.Mesh>(null!);
  const t = timeMs / 1000;

  // Stagger entrance: each layer enters 200ms apart
  const entranceDelay = index * 200;
  const entranceProgress = Math.min(1, Math.max(0, (timeMs - entranceDelay) / 300));
  // Ease-out cubic
  const eased = 1 - Math.pow(1 - entranceProgress, 3);

  // Floating offset per layer
  const yFloat = Math.sin(t * 1.5 + index * 1.2) * 0.08;
  const zOffset = (index - 1) * 0.8;

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(0, yFloat + (1 - eased) * 3, zOffset);
    meshRef.current.rotation.y = (1 - eased) * 0.5;
    meshRef.current.scale.setScalar(eased);
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[3.2, 1.8]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={0.7}
        roughness={0.15}
        metalness={0.1}
        clearcoat={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ComposeCamera() {
  const { timeMs, durationMs } = useCompositionTime();
  const { camera } = useThree();

  useFrame(() => {
    const progress = durationMs > 0 ? timeMs / durationMs : 0;
    // Orbit from angled view to straight-on
    const angle = (1 - progress) * 0.6;
    const distance = 5.5 - progress * 0.5;
    camera.position.set(
      Math.sin(angle) * distance,
      0.5 + (1 - progress) * 0.8,
      Math.cos(angle) * distance,
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function SceneCompose() {
  return (
    <Timegroup mode="fixed" duration="3300ms" className="relative" style={{ ...sceneStyle(3300), width: 960, height: 540, background: "#0a0a0a" }}>
      <CompositionCanvas
        camera={{ position: [3, 1.5, 5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-3, 2, 4]} intensity={0.3} color="#FFB300" />
        <ComposeCamera />
        {LAYER_COLORS.map((color, i) => (
          <LayerPlane key={i} index={i} color={color} />
        ))}
      </CompositionCanvas>
      {/* Overlaid labels */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-8 left-8 text-white/60 text-xs font-mono uppercase tracking-widest"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "660ms" }}
        >
          3 layers
        </div>
        <div
          className="absolute bottom-10 left-8 right-8"
          style={{ animation: "hero-slide-up-decel 400ms ease-out both", animationDelay: "825ms" }}
        >
          <div className="text-white text-2xl font-bold leading-tight">
            Every frame tells a{" "}
            <span className="px-1 bg-[var(--poster-gold)] text-[#0a0a0a]">story</span>
          </div>
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━ Scene 3: Template — char-level name morph + typewriter ━━━━━━━━━━━━━━ */
function SceneTemplate() {
  const names = ["Sarah Chen", "Marcus Johnson", "Alex Rivera"];
  const cycleDuration = 990;

  return (
    <Timegroup mode="fixed" duration="3630ms" className="relative" style={{ ...sceneStyle(3630), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Label */}
        <div
          className="text-white/40 text-xs font-mono uppercase tracking-[0.3em] mb-8"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "165ms" }}
        >
          data-driven templates
        </div>

        {/* Name cycling area */}
        <div className="relative" style={{ width: 600, height: 72 }}>
          {names.map((name, i) => (
            <div
              key={name}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                animation: `hero-char-gather 330ms ease-out both, hero-char-scatter 264ms ease-in both`,
                animationDelay: `${i * cycleDuration + 330}ms, ${(i + 1) * cycleDuration}ms`,
              }}
            >
              <Text
                split="char"
                staggerMs={30}
                easing="ease-out"
                className="text-white text-6xl font-black tracking-tight text-center"
                style={{
                  animation: "hero-char-gather 330ms ease-out both",
                  animationDelay: `${i * cycleDuration + 330}ms`,
                }}
              >
                {name}
              </Text>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex gap-3 mt-10">
          {names.map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5"
              style={{
                background: "var(--poster-gold)",
                animation: "hero-rubber-bounce 330ms cubic-bezier(0.68, -0.55, 0.265, 1.55) both",
                animationDelay: `${i * cycleDuration + 330}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Typewriter CLI at bottom */}
      <div className="absolute bottom-8 inset-x-8">
        <div className="bg-white/5 border border-white/10 px-4 py-2 font-mono text-xs text-white/50 flex items-center gap-2">
          <span className="text-[var(--poster-gold)]">$</span>
          <span style={{ animation: "hero-fade-in 1650ms steps(38, end) both", animationDelay: "330ms" }}>
            editframe render --data &apos;&#123;&quot;name&quot;:&quot;...&quot;&#125;&apos;
          </span>
          <span className="w-2 h-4 bg-white/70 ml-0.5" style={{ animation: "hero-cursor-blink 660ms step-end infinite both" }} />
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━ Scene 4: Render — editor assembly with clip-path reveals ━━━━━━━━━━━━ */
function SceneRender() {
  return (
    <Timegroup mode="fixed" duration="2970ms" className="relative" style={{ ...sceneStyle(2970), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 p-6 flex flex-col gap-2">
        {/* Preview viewport */}
        <div
          className="flex-1 border-2 border-white/60 relative overflow-hidden"
          style={{ animation: "hero-reveal-left 400ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "165ms" }}
        >
          {/* Gradient fill to simulate video content */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(135deg, #1565C0 0%, #0a0a0a 40%, #E53935 100%)",
            opacity: 0.4,
          }} />
          <svg className="absolute inset-0 m-auto w-16 h-16 text-white/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {/* Scrub position indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div className="h-full bg-[var(--poster-red)]" style={{
              animation: "hero-progress-spring 1650ms ease-out both",
              animationDelay: "825ms",
              ["--bar-target" as string]: "60%",
            }} />
          </div>
        </div>

        {/* Filmstrip */}
        <div
          className="h-10 flex gap-0.5"
          style={{ animation: "hero-reveal-bottom 350ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "396ms" }}
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="flex-1"
              style={{
                background: `hsl(${200 + i * 8}, 30%, ${12 + i * 1.5}%)`,
              }}
            />
          ))}
        </div>

        {/* Timeline with trim handles */}
        <div
          className="h-8 relative"
          style={{ animation: "hero-reveal-right 350ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "594ms" }}
        >
          <div className="absolute inset-0 bg-white/5 border border-white/10" />
          {/* Trim region */}
          <div className="absolute top-0 bottom-0 left-[15%] right-[25%] border-2 border-[var(--poster-gold)]">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--poster-gold)] -translate-x-full" />
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[var(--poster-gold)] translate-x-full" />
          </div>
          {/* Playhead */}
          <div className="absolute top-0 bottom-0 left-[40%] w-0.5 bg-white" style={{
            animation: "hero-fade-in 198ms ease-out both",
            animationDelay: "990ms",
          }} />
        </div>
      </div>

      {/* Component label */}
      <div
        className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider text-[var(--poster-gold)]"
        style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "330ms" }}
      >
        &lt;Preview&gt; + &lt;Filmstrip&gt; + &lt;TrimHandles&gt;
      </div>
    </Timegroup>
  );
}

/* ━━ Scene 5: Ship — terminal + progress + checkmark ━━━━━━━━━━━━━━━━━━━━━ */
function SceneShip() {
  const bars = [
    { label: "Cloud", color: "var(--poster-green)", duration: 1320, delay: 990 },
    { label: "Browser", color: "var(--poster-blue)", duration: 1650, delay: 990 },
    { label: "Local", color: "var(--poster-red)", duration: 1980, delay: 990 },
  ];

  return (
    <Timegroup mode="fixed" duration="3795ms" className="relative" style={{ ...sceneStyle(3795), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-20 gap-5">
        {/* Terminal header */}
        <div
          className="w-full max-w-lg"
          style={{ animation: "hero-slide-up-decel 330ms ease-out both", animationDelay: "165ms" }}
        >
          <div className="bg-white/5 border border-white/10 px-4 py-2 font-mono text-sm text-white/70 flex items-center gap-2">
            <span className="text-[var(--poster-gold)]">$</span>
            <span>npx editframe render hero.tsx</span>
          </div>
        </div>

        {/* Progress bars */}
        <div className="w-full max-w-lg flex flex-col gap-3">
          {bars.map((bar, i) => (
            <div
              key={bar.label}
              className="flex items-center gap-4"
              style={{
                animation: "hero-slide-up-decel 264ms ease-out both",
                animationDelay: `${660 + i * 132}ms`,
              }}
            >
              <span className="text-white/50 text-xs font-mono w-16 text-right">{bar.label}</span>
              <div className="flex-1 h-5 bg-white/5 relative overflow-hidden border border-white/10">
                <div
                  className="h-full"
                  style={{
                    background: bar.color,
                    animation: `hero-progress-spring ${bar.duration}ms ease-out both`,
                    animationDelay: `${bar.delay}ms`,
                    ["--bar-target" as string]: "100%",
                  }}
                />
              </div>
              {/* Checkmark appears when bar completes */}
              <svg
                className="w-4 h-4 text-[var(--poster-green)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 24,
                  animation: `hero-check-draw 264ms ease-out both, hero-fade-in 132ms ease-out both`,
                  animationDelay: `${bar.delay + bar.duration + 132}ms, ${bar.delay + bar.duration}ms`,
                }}
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
          ))}
        </div>

        {/* Speed badge on Cloud row */}
        <div
          className="absolute text-sm font-black px-2 py-0.5 bg-[var(--poster-gold)] text-[#0a0a0a]"
          style={{
            top: "calc(50% - 28px)",
            right: "calc(50% - 200px)",
            animation: "hero-rubber-bounce 396ms cubic-bezier(0.68, -0.55, 0.265, 1.55) both",
            animationDelay: `${990 + 1320 + 264}ms`,
          }}
        >
          4× faster
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
                  <SceneRender />
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
            <div className="absolute bottom-4 right-4 max-w-[280px] bg-[#0a0a0a]/90 border-2 border-white/15 p-3 pointer-events-none backdrop-blur-sm">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1.5">
                {sceneName}
              </div>
              <pre className="text-[11px] font-mono text-[var(--poster-gold)] leading-relaxed whitespace-pre-wrap">
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
