// @ts-nocheck - React Three Fiber JSX intrinsics
/* ==============================================================================
   COMPONENT: TemplatedRenderingDemo

   Purpose: Show data-driven video generation. One template, multiple data sets,
   different output videos. R3F 3D background synced to timeline, animated chart,
   user avatars, real Editframe preview with playback controls.

   Design: Swissted poster aesthetic
   ============================================================================== */

import { useState, useEffect, useLayoutEffect, useId, useCallback, useRef, createContext, useContext, Suspense } from "react";
import { flushSync } from "react-dom";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import {
  Preview,
  FitScale,
  Timegroup,
  Text,
  TimelineRoot,
  Scrubber,
  TogglePlay,
  TimeDisplay,
} from "@editframe/react";
import { InvalidateOnTimeChange, flushR3F, yieldToScheduler, getR3FState, r3fFlushSync } from "./r3f-sync";
import { CodeBlock } from "~/components/CodeBlock";
import { ExportButton } from "./ExportButton";

/* ━━ CSS keyframes for animations inside the preview ━━━━━━━━━━━━━━━━━━━━━ */
const ANIM_STYLES = `
  @keyframes tmpl-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes tmpl-slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes tmpl-scale-in {
    from { opacity: 0; transform: scale(0.6); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes tmpl-grow-bar {
    from { transform: scaleY(0); }
    to { transform: scaleY(1); }
  }
  @keyframes tmpl-avatar-pop {
    from { opacity: 0; transform: scale(0.4); }
    to { opacity: 1; transform: scale(1); }
  }
`;

/* ━━ Data types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
interface UserData {
  name: string;
  role: string;
  company: string;
  metric: string;
  initials: string;
  color: string;
  chartData: number[];
}

const SAMPLE_DATA: UserData[] = [
  {
    name: "Sarah Chen",
    role: "Product Lead",
    company: "Acme Corp",
    metric: "+47%",
    initials: "SC",
    color: "#E53935",
    chartData: [0.3, 0.45, 0.38, 0.62, 0.7, 0.85, 0.92],
  },
  {
    name: "Marcus Johnson",
    role: "Growth Manager",
    company: "TechStart",
    metric: "+128%",
    initials: "MJ",
    color: "#1565C0",
    chartData: [0.15, 0.2, 0.35, 0.5, 0.78, 0.88, 0.95],
  },
  {
    name: "Emma Williams",
    role: "CEO",
    company: "DataFlow",
    metric: "+89%",
    initials: "EW",
    color: "#2E7D32",
    chartData: [0.4, 0.35, 0.55, 0.6, 0.72, 0.8, 0.9],
  },
];

/* ━━ Context for passing selected data to the TimelineRoot component ━━━━━ */
const DemoDataContext = createContext<{ selectedData: UserData; selectedIndex: number }>({
  selectedData: SAMPLE_DATA[0]!,
  selectedIndex: 0,
});

/* ━━ R3F: floating wireframe shapes driven by timeline time ━━━━━━━━━━━━━━ */
function FloatingShape({
  position,
  speed,
  rotationAxis,
  color,
  scale = 1,
  timeMs,
}: {
  position: [number, number, number];
  speed: number;
  rotationAxis: [number, number, number];
  color: string;
  scale?: number;
  timeMs: number;
}) {
  const t = (timeMs / 1000) * speed;

  return (
    <mesh
      position={[position[0], position[1] + Math.sin(t * 2) * 0.15, position[2]]}
      rotation={[rotationAxis[0] * t, rotationAxis[1] * t, rotationAxis[2] * t]}
      scale={scale}
    >
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.25} />
    </mesh>
  );
}

function BackgroundScene({ color, timeMs }: { color: string; timeMs: number }) {
  return (
    <>
      <FloatingShape position={[-2.5, 1.2, -3]} speed={0.3} rotationAxis={[1, 0.5, 0]} color={color} scale={1.2} timeMs={timeMs} />
      <FloatingShape position={[2.8, -0.8, -4]} speed={0.2} rotationAxis={[0, 1, 0.3]} color={color} scale={0.9} timeMs={timeMs} />
      <FloatingShape position={[0, 2, -5]} speed={0.15} rotationAxis={[0.3, 0, 1]} color={color} scale={1.5} timeMs={timeMs} />
      <FloatingShape position={[-1.5, -1.5, -3.5]} speed={0.25} rotationAxis={[0.5, 1, 0.5]} color={color} scale={0.7} timeMs={timeMs} />
      <FloatingShape position={[1.8, 1.8, -4.5]} speed={0.18} rotationAxis={[1, 0, 0.7]} color={color} scale={1.0} timeMs={timeMs} />
    </>
  );
}

/* ━━ Growth chart (SVG with CSS animation) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function GrowthChart({ data, color }: { data: number[]; color: string }) {
  const barWidth = 100 / data.length;
  const gap = 3;

  return (
    <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
      {data.map((value, i) => {
        const height = value * 45;
        return (
          <rect
            key={i}
            x={i * barWidth + gap / 2}
            y={50 - height}
            width={barWidth - gap}
            height={height}
            fill={color}
            opacity={0.6 + value * 0.4}
            style={{
              transformOrigin: `${i * barWidth + barWidth / 2}px 50px`,
              animation: `tmpl-grow-bar 0.6s ease-out ${i * 0.08}s both`,
            }}
          />
        );
      })}
      {/* Trend line */}
      <polyline
        points={data.map((v, i) => `${i * barWidth + barWidth / 2},${50 - v * 45}`).join(" ")}
        fill="none"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
        style={{ animation: "tmpl-fade-in 0.8s ease-out 0.5s both" }}
      />
    </svg>
  );
}

/* ━━ Avatar circle ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black uppercase"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        boxShadow: `0 4px 20px ${color}66`,
        animation: "tmpl-avatar-pop 0.4s ease-out both",
      }}
    >
      {initials}
    </div>
  );
}

/* ━━ Timeline content — rendered by TimelineRoot ━━━━━━━━━━━━━━━━━━━━━━━━ */
function TemplatedVideoContent() {
  const { selectedData, selectedIndex } = useContext(DemoDataContext);
  const timegroupRef = useRef<HTMLElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [timeMs, setTimeMs] = useState(0);

  // Sync timeline time → React state → R3F scene, then flush WebGL
  useLayoutEffect(() => {
    const tg = timegroupRef.current;
    if (!tg?.addFrameTask) return;

    let r3fReady = false;

    return tg.addFrameTask(async ({ currentTimeMs }: { currentTimeMs: number }) => {
      // 1. Flush react-dom: updates timeMs state, re-renders Canvas component
      flushSync(() => setTimeMs(currentTimeMs));

      // 2. On first frame, R3F Canvas needs a macrotask for ResizeObserver
      if (!r3fReady) {
        await yieldToScheduler();
        flushSync(() => {});
      }

      // 3. Microtask yield: lets Canvas async run() call render(children)
      await Promise.resolve();

      // 4. Flush R3F's reconciler so Three.js scene graph reflects latest props
      r3fFlushSync(() => {});

      if (!r3fReady) {
        const canvas = canvasContainerRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
        if (getR3FState(canvas)?.gl) r3fReady = true;
      }

      // 5. Imperatively render: runs useFrame subscribers + gl.render + gl.finish
      flushR3F(canvasContainerRef.current);
    });
  }, []);

  return (
    <FitScale>
      <style dangerouslySetInnerHTML={{ __html: ANIM_STYLES }} />
      <Timegroup
        ref={timegroupRef as any}
        mode="fixed"
        duration="5s"
        className="relative overflow-hidden"
        style={{ backgroundColor: "#111", width: 960, height: 540 }}
      >
        {/* R3F 3D Background — synced to timeline */}
        <div ref={canvasContainerRef} className="absolute inset-0 z-0">
          <Canvas
            frameloop="demand"
            gl={{ preserveDrawingBuffer: true, alpha: true }}
            camera={{ position: [0, 0, 5], fov: 50 }}
            style={{ background: "transparent", width: "100%", height: "100%" }}
            resize={{ offsetSize: true }}
          >
            <InvalidateOnTimeChange timeMs={timeMs} />
            <Suspense fallback={null}>
              <BackgroundScene color={selectedData.color} timeMs={timeMs} />
            </Suspense>
          </Canvas>
        </div>

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background: `radial-gradient(ellipse at center, ${selectedData.color}33 0%, ${selectedData.color}cc 100%)`,
          }}
        />

        {/* Content overlay — keyed so Text elements remount on user switch */}
        <div key={selectedIndex} className="absolute inset-0 z-[2] flex flex-col items-center justify-center text-center gap-3">
          <Avatar initials={selectedData.initials} color={selectedData.color} />

          <Text
            className="text-white/80 text-base uppercase tracking-wider"
            split="word"
            stagger="60ms"
            style={{
              animationName: "tmpl-slide-up",
              animationDuration: "0.4s",
              animationTimingFunction: "ease-out",
              animationFillMode: "both",
            }}
          >
            Welcome
          </Text>

          <Text
            className="text-white text-5xl font-black uppercase tracking-tight"
            split="word"
            stagger="100ms"
            style={{
              animationName: "tmpl-slide-up",
              animationDuration: "0.5s",
              animationTimingFunction: "ease-out",
              animationFillMode: "both",
              animationDelay: "0.2s",
            }}
          >
            {selectedData.name}!
          </Text>

          <Text
            className="text-white/70 text-lg"
            split="word"
            stagger="50ms"
            style={{
              animationName: "tmpl-fade-in",
              animationDuration: "0.5s",
              animationFillMode: "both",
              animationDelay: "0.5s",
            }}
          >
            {selectedData.role} at {selectedData.company}
          </Text>

          <div className="w-64 h-20 mt-2" style={{ animation: "tmpl-fade-in 0.5s ease-out 0.7s both" }}>
            <GrowthChart data={selectedData.chartData} color="white" />
          </div>

          <Text
            className="text-white text-7xl font-black"
            split="char"
            stagger="40ms"
            style={{
              animationName: "tmpl-scale-in",
              animationDuration: "0.4s",
              animationTimingFunction: "ease-out",
              animationFillMode: "both",
              animationDelay: "1s",
            }}
          >
            {selectedData.metric} growth
          </Text>
        </div>
      </Timegroup>
    </FitScale>
  );
}

/* ━━ Code generation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function generateCode(data: UserData): string {
  return `import { Timegroup, Text } from '@editframe/react';
import { Canvas } from '@react-three/fiber';
import { getRenderData } from '@editframe/elements';
import { FloatingShapes } from './FloatingShapes';
import { Avatar } from './Avatar';
import { GrowthChart } from './GrowthChart';

export function WelcomeVideo() {
  const data = getRenderData<UserData>();
  // Current: { name: "${data.name}", metric: "${data.metric}" }

  return (
    <Timegroup mode="fixed" duration="5s"
      className="w-[1920px] h-[1080px] relative">

      {/* 3D background */}
      <Canvas><FloatingShapes color={data.color} /></Canvas>

      {/* Avatar + animated text */}
      <Avatar initials={data.initials} />
      <Text split="word" stagger="80ms"
        style={{ animationName: 'slideUp' }}>
        Welcome, {data.name}!
      </Text>

      {/* Growth chart */}
      <GrowthChart data={data.chartData} />
      <Text split="char" stagger="40ms"
        style={{ animationName: 'scaleIn' }}>
        {data.metric} growth
      </Text>
    </Timegroup>
  );
}`;
}

function generateCliCode(data: UserData): string {
  const firstName = data.name.split(" ")[0]?.toLowerCase();
  const jsonData = JSON.stringify(
    { name: data.name, role: data.role, company: data.company, metric: data.metric, color: data.color },
    null,
    2,
  );
  return `$ npx editframe render \\
    --data '${jsonData}' \\
    -o welcome-${firstName}.mp4`;
}

/* ━━ JSON display helper ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function formatUserJson(data: UserData): string {
  return JSON.stringify(
    {
      name: data.name,
      role: data.role,
      company: data.company,
      metric: data.metric,
      initials: data.initials,
      color: data.color,
      chartData: data.chartData,
    },
    null,
    2,
  );
}

/* ━━ Main component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function TemplatedRenderingDemo() {
  const id = useId();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  const selectedData = SAMPLE_DATA[selectedIndex]!;
  const previewId = `templated-demo-${id}`;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const currentCode = generateCode(selectedData);
  const cliCode = generateCliCode(selectedData);

  return (
    <DemoDataContext.Provider value={{ selectedData, selectedIndex }}>
      <div className="pb-2 pr-2">
        {/* ─── Top row: Preview + Data selector side by side ─── */}
        <div className="grid lg:grid-cols-5 gap-4 mb-4">
          {/* Preview (3 cols) */}
          <div className="lg:col-span-3 relative">
            <div className="absolute -bottom-2 -right-2 w-full h-full" style={{ backgroundColor: selectedData.color }} />
            <div className="relative border-4 border-black dark:border-white bg-[#1a1a1a] overflow-hidden">
              {/* Video header */}
              <div className="px-3 py-1.5 border-b border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--poster-red)]" />
                  <div className="w-3 h-3 rounded-full bg-[var(--poster-gold)]" />
                  <div className="w-3 h-3 rounded-full bg-[var(--poster-green)]" />
                  <span className="ml-3 text-white/40 text-xs font-mono">
                    welcome-{selectedData.name.split(" ")[0]?.toLowerCase()}.mp4
                  </span>
                </div>
              </div>

              {/* Live Preview — fixed 960×540 internal resolution, CSS-scaled to fit */}
              {isClient ? (
                <div className="aspect-video w-full overflow-hidden">
                  <Preview id={previewId} ref={previewRef as any} loop className="block" style={{ width: "100%", height: "100%" }}>
                    <TimelineRoot id={previewId} component={TemplatedVideoContent} />
                  </Preview>
                </div>
              ) : (
                <div
                  className="aspect-video flex flex-col items-center justify-center p-6 text-center"
                  style={{ backgroundColor: selectedData.color }}
                >
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-black mb-2">
                    {selectedData.initials}
                  </div>
                  <p className="text-white/80 text-xs uppercase tracking-wider">Welcome</p>
                  <h3 className="text-white text-3xl font-black uppercase tracking-tight mt-1">
                    {selectedData.name}!
                  </h3>
                  <p className="text-white/70 text-xs mt-1">
                    {selectedData.role} at {selectedData.company}
                  </p>
                  <p className="text-white text-4xl font-black mt-3">{selectedData.metric}</p>
                  <p className="text-white/70 text-sm mt-1">growth</p>
                </div>
              )}

              {/* Playback Controls */}
              <div className="border-t border-white/10 bg-[#1a1a1a]">
                {isClient ? (
                  <div className="flex items-center">
                    <TogglePlay target={previewId}>
                      <button
                        slot="pause"
                        className="w-10 h-10 flex items-center justify-center hover:brightness-110 transition-all"
                        style={{ backgroundColor: selectedData.color }}
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      </button>
                      <button
                        slot="play"
                        className="w-10 h-10 flex items-center justify-center hover:brightness-110 transition-all"
                        style={{ backgroundColor: selectedData.color }}
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    </TogglePlay>

                    <div className="flex-1 px-3 h-10 flex items-center border-l border-white/10">
                      <Scrubber
                        target={previewId}
                        className="w-full h-1 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-white/50 [&::part(progress)]:rounded-full [&::part(handle)]:bg-white [&::part(handle)]:w-2.5 [&::part(handle)]:h-2.5 [&::part(handle)]:rounded-full"
                      />
                    </div>

                    <div className="px-3 border-l border-white/10 h-10 flex items-center">
                      <TimeDisplay
                        target={previewId}
                        className="text-[10px] text-white/60 font-mono tabular-nums"
                      />
                    </div>

                    <ExportButton
                      compact
                      getTarget={() => previewRef.current?.querySelector("ef-timegroup") as HTMLElement}
                      name={`Welcome — ${selectedData.name}`}
                      fileName={`welcome-${selectedData.name.split(" ")[0]?.toLowerCase()}.mp4`}
                      className="border-l border-white/10"
                    />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div
                      className="w-10 h-10 flex items-center justify-center"
                      style={{ backgroundColor: selectedData.color }}
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 px-3 border-l border-white/10 h-10 flex items-center">
                      <div className="w-full h-1 bg-white/20 rounded-full" />
                    </div>
                    <div className="px-3 border-l border-white/10 h-10 flex items-center">
                      <span className="text-[10px] text-white/60 font-mono">0:00 / 0:05</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Selector (2 cols) — right next to preview */}
          <div className="lg:col-span-2">
            <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] overflow-hidden h-full flex flex-col">
              <div className="px-4 py-2 bg-[var(--poster-gold)] border-b-4 border-black dark:border-white">
                <span className="text-xs font-black uppercase tracking-wider text-black">
                  users.json
                </span>
              </div>

              {/* User tabs */}
              <div className="flex border-b border-black/10 dark:border-white/10">
                {SAMPLE_DATA.map((data, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
                      selectedIndex === i
                        ? "text-white border-transparent"
                        : "text-black/50 dark:text-white/50 border-transparent hover:text-black dark:hover:text-white"
                    }`}
                    style={selectedIndex === i ? { backgroundColor: data.color, borderColor: data.color } : undefined}
                  >
                    {data.name.split(" ")[0]}
                  </button>
                ))}
              </div>

              {/* Full JSON display */}
              <div className="flex-1 overflow-auto">
                <pre className="p-3 text-[11px] font-mono leading-relaxed text-black/80 dark:text-white/80 whitespace-pre">
                  {formatUserJson(selectedData)}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom row: code + CLI ─── */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Template Code */}
          <div className="border-4 border-black dark:border-white bg-[#1a1a1a] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/20">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--poster-red)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--poster-gold)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--poster-green)]" />
              <span className="ml-2 text-white/40 text-xs font-mono">welcome-video.tsx</span>
            </div>
            <div className="overflow-auto max-h-[160px] md:max-h-[220px]">
              <CodeBlock className="language-tsx">{currentCode}</CodeBlock>
            </div>
          </div>

          {/* CLI Command */}
          <div className="border-4 border-black dark:border-white bg-black overflow-hidden">
            <div className="px-3 py-1.5 border-b border-white/20 flex items-center gap-2">
              <span className="text-[#4CAF50] font-mono text-sm">$</span>
              <span className="text-white/50 text-xs font-mono uppercase">Terminal</span>
            </div>
            <div className="overflow-auto max-h-[160px] md:max-h-[220px]">
              <CodeBlock className="language-bash">{cliCode}</CodeBlock>
            </div>
          </div>
        </div>
      </div>
    </DemoDataContext.Provider>
  );
}

export default TemplatedRenderingDemo;
