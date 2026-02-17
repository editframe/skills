import { useId, useEffect, useState, useRef } from "react";
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

function sceneStyle(durationMs: number): React.CSSProperties {
  const fadeOutDelay = durationMs - OVERLAP_MS;
  return {
    animation: `hero-fade-in ${OVERLAP_MS}ms ease-out both, hero-fade-out ${OVERLAP_MS}ms ease-in both`,
    animationDelay: `0ms, ${fadeOutDelay}ms`,
  };
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 1: Title — "BUILD VIDEO WITH CODE" char-level shatter-assemble
   Strong kinetic opener. Glass material spring.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneTitle() {
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 2: Author — HTML/CSS/Script → rendered result
   Shows the core idea: web tech becomes video frames.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneAuthor() {
  const codeLines = [
    { text: '<div class="card">', color: "text-[var(--poster-blue)]" },
    { text: '  <h1>Welcome back</h1>', color: "text-white/80" },
    { text: '  <p style="color: gold">', color: "text-white/80" },
    { text: "    Your 2024 highlights", color: "text-[var(--poster-gold)]" },
    { text: "  </p>", color: "text-white/80" },
    { text: "</div>", color: "text-[var(--poster-blue)]" },
  ];

  return (
    <Timegroup mode="fixed" duration="3630ms" className="relative" style={{ ...sceneStyle(3630), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex">
        {/* Left: code panel */}
        <div className="w-[55%] p-8 flex flex-col justify-center">
          <div
            className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 mb-4"
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "165ms" }}
          >
            html + css + script
          </div>
          <div className="font-mono text-sm leading-relaxed">
            {codeLines.map((line, i) => (
              <div
                key={i}
                className={line.color}
                style={{
                  animation: "hero-slide-up-decel 264ms ease-out both",
                  animationDelay: `${330 + i * 99}ms`,
                }}
              >
                {line.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right: rendered result */}
        <div className="w-[45%] flex items-center justify-center relative">
          <div
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 text-2xl"
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "990ms" }}
          >
            →
          </div>
          <div
            className="bg-white/5 border-2 border-white/20 p-8"
            style={{
              animation: "hero-reveal-left 495ms cubic-bezier(0.36, 0, 0.66, 1) both",
              animationDelay: "1155ms",
            }}
          >
            <div className="text-white text-3xl font-black mb-2">Welcome back</div>
            <div className="text-[var(--poster-gold)] text-lg">Your 2024 highlights</div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-6 left-8 right-8"
        style={{ animation: "hero-slide-up-decel 330ms ease-out both", animationDelay: "1980ms" }}
      >
        <Text
          split="char"
          staggerMs={25}
          easing="ease-out"
          className="text-white text-xl font-bold"
          style={{ animation: "hero-char-assemble 330ms cubic-bezier(0.68, -0.1, 0.265, 1.1) both", animationDelay: "1980ms" }}
        >
          Write HTML. Render video.
        </Text>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 3: Layers — 3D floating composition layers with R3F
   Visually rich. Shows layered composition concept.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const LAYER_COLORS = [
  new THREE.Color("#1565C0"),
  new THREE.Color("#FFFFFF"),
  new THREE.Color("#E53935"),
];

function LayerPlane({ index, color }: { index: number; color: THREE.Color }) {
  const { timeMs } = useCompositionTime();
  const meshRef = useRef<THREE.Mesh>(null!);
  const t = timeMs / 1000;

  const entranceDelay = index * 200;
  const entranceProgress = Math.min(1, Math.max(0, (timeMs - entranceDelay) / 300));
  const eased = 1 - Math.pow(1 - entranceProgress, 3);

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

function LayersCamera() {
  const { timeMs, durationMs } = useCompositionTime();
  const { camera } = useThree();

  useFrame(() => {
    const progress = durationMs > 0 ? timeMs / durationMs : 0;
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

function SceneLayers() {
  return (
    <Timegroup mode="fixed" duration="3630ms" className="relative" style={{ ...sceneStyle(3630), width: 960, height: 540, background: "#0a0a0a" }}>
      <CompositionCanvas
        camera={{ position: [3, 1.5, 5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-3, 2, 4]} intensity={0.3} color="#FFB300" />
        <LayersCamera />
        {LAYER_COLORS.map((color, i) => (
          <LayerPlane key={i} index={i} color={color} />
        ))}
      </CompositionCanvas>
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-8 left-8 text-white/60 text-xs font-mono uppercase tracking-widest"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "660ms" }}
        >
          composable layers
        </div>
        <div
          className="absolute bottom-10 left-8 right-8"
          style={{ animation: "hero-slide-up-decel 400ms ease-out both", animationDelay: "825ms" }}
        >
          <div className="text-white text-2xl font-bold leading-tight">
            Stack <span className="px-1 bg-[var(--poster-blue)] text-white">video</span>{" "}
            <span className="px-1 bg-[var(--poster-gold)] text-[#0a0a0a]">text</span>{" "}
            <span className="px-1 bg-[var(--poster-red)] text-white">shapes</span>{" "}
            and <span className="text-white/60">3D</span>
          </div>
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 4: Timeline — waveforms, captions, multi-track editor
   Shows the composition/editing surface.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneTimeline() {
  const tracks = [
    { label: "Video", color: "var(--poster-blue)", width: "85%", left: "5%" },
    { label: "Caption", color: "var(--poster-gold)", width: "60%", left: "15%" },
    { label: "Audio", color: "var(--poster-green)", width: "90%", left: "2%" },
    { label: "Overlay", color: "var(--poster-red)", width: "40%", left: "30%" },
  ];

  // Deterministic waveform heights
  const waveformHeights = Array.from({ length: 60 }, (_, j) =>
    20 + Math.sin(j * 0.5) * 30 + Math.abs(Math.sin(j * 1.7 + 3)) * 40
  );

  return (
    <Timegroup mode="fixed" duration="3960ms" className="relative" style={{ ...sceneStyle(3960), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col">
        {/* Ruler header */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-white/10">
          <div
            className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30"
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "165ms" }}
          >
            timeline
          </div>
          <div
            className="flex gap-6"
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "330ms" }}
          >
            {["00:00", "00:05", "00:10", "00:15", "00:20"].map((t) => (
              <div key={t} className="text-[10px] font-mono text-white/40">{t}</div>
            ))}
          </div>
        </div>

        {/* Track list */}
        <div className="flex-1 flex flex-col justify-center px-6 gap-2">
          {tracks.map((track, i) => (
            <div
              key={track.label}
              className="flex items-center gap-3"
              style={{
                animation: "hero-slide-up-decel 264ms ease-out both",
                animationDelay: `${330 + i * 132}ms`,
              }}
            >
              <span className="text-[10px] font-mono text-white/50 w-14 text-right uppercase">{track.label}</span>
              <div className="flex-1 h-10 bg-white/3 relative border border-white/5">
                <div
                  className="absolute top-0 bottom-0 border border-white/20"
                  style={{
                    left: track.left,
                    width: track.width,
                    background: `color-mix(in srgb, ${track.color} 20%, transparent)`,
                    borderColor: `color-mix(in srgb, ${track.color} 40%, transparent)`,
                    animation: "hero-reveal-left 396ms cubic-bezier(0.36, 0, 0.66, 1) both",
                    animationDelay: `${660 + i * 132}ms`,
                  }}
                >
                  {track.label === "Audio" && (
                    <div className="absolute inset-0 flex items-center gap-px px-1 overflow-hidden">
                      {waveformHeights.map((h, j) => (
                        <div
                          key={j}
                          className="flex-1 bg-[var(--poster-green)]"
                          style={{ height: `${h}%`, opacity: 0.5 }}
                        />
                      ))}
                    </div>
                  )}
                  {track.label === "Caption" && (
                    <div className="absolute inset-0 flex items-center px-2 gap-4 overflow-hidden">
                      {["Hello world", "Welcome back", "Your highlights"].map((text, j) => (
                        <span key={j} className="text-[9px] font-mono text-[var(--poster-gold)] whitespace-nowrap opacity-60">{text}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Playhead */}
        <div className="absolute top-12 bottom-0 pointer-events-none" style={{ left: "calc(15% + 56px)" }}>
          <div
            className="w-0.5 h-full bg-white"
            style={{
              animation: "hero-fade-in 198ms ease-out both, hero-playhead-sweep 2640ms linear both",
              animationDelay: "990ms, 990ms",
            }}
          />
        </div>

        {/* Capability tags */}
        <div className="px-6 py-3 border-t border-white/10 flex gap-3">
          {["Waveforms", "Captions", "Multi-track"].map((tag, i) => (
            <div
              key={tag}
              className="text-[10px] font-mono uppercase tracking-wider text-white/40 border border-white/10 px-2 py-0.5"
              style={{
                animation: "hero-rubber-bounce 330ms cubic-bezier(0.68, -0.55, 0.265, 1.55) both",
                animationDelay: `${1980 + i * 165}ms`,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 5: Editor — preview + filmstrip + trim handles
   Shows the editing GUI components assembling.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneEditor() {
  return (
    <Timegroup mode="fixed" duration="3300ms" className="relative" style={{ ...sceneStyle(3300), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 p-6 flex flex-col gap-2">
        {/* Preview viewport */}
        <div
          className="flex-1 border-2 border-white/60 relative overflow-hidden"
          style={{ animation: "hero-reveal-left 400ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "165ms" }}
        >
          <div className="absolute inset-0" style={{
            background: "linear-gradient(135deg, #1565C0 0%, #0a0a0a 40%, #E53935 100%)",
            opacity: 0.4,
          }} />
          <svg className="absolute inset-0 m-auto w-16 h-16 text-white/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
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
              style={{ background: `hsl(${200 + i * 8}, 30%, ${12 + i * 1.5}%)` }}
            />
          ))}
        </div>

        {/* Timeline with trim handles */}
        <div
          className="h-8 relative"
          style={{ animation: "hero-reveal-right 350ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "594ms" }}
        >
          <div className="absolute inset-0 bg-white/5 border border-white/10" />
          <div className="absolute top-0 bottom-0 left-[15%] right-[25%] border-2 border-[var(--poster-gold)]">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--poster-gold)] -translate-x-full" />
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[var(--poster-gold)] translate-x-full" />
          </div>
          <div className="absolute top-0 bottom-0 left-[40%] w-0.5 bg-white" style={{
            animation: "hero-fade-in 198ms ease-out both",
            animationDelay: "990ms",
          }} />
        </div>
      </div>

      <div
        className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider text-[var(--poster-gold)]"
        style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "330ms" }}
      >
        &lt;Preview&gt; + &lt;Filmstrip&gt; + &lt;TrimHandles&gt;
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 6: Template — Year-in-review, data-driven
   One template, thousands of personalized videos.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneTemplate() {
  const reviews = [
    { name: "Sarah Chen", stat: "2,847", label: "commits", accent: "var(--poster-red)" },
    { name: "Marcus Johnson", stat: "156", label: "videos rendered", accent: "var(--poster-blue)" },
    { name: "Alex Rivera", stat: "12.4k", label: "views", accent: "var(--poster-gold)" },
  ];
  const cycleDuration = 1155;

  return (
    <Timegroup mode="fixed" duration="3960ms" className="relative" style={{ ...sceneStyle(3960), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 mb-6"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "165ms" }}
        >
          one template → thousands of videos
        </div>

        {/* Giant year watermark */}
        <div
          className="text-white/10 text-[120px] font-black leading-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{ animation: "hero-fade-in 660ms ease-out both", animationDelay: "0ms" }}
        >
          2024
        </div>

        {/* Cycling review cards */}
        <div className="relative" style={{ width: 500, height: 180 }}>
          {reviews.map((review, i) => (
            <div
              key={review.name}
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{
                animation: `hero-char-gather 330ms ease-out both, hero-char-scatter 264ms ease-in both`,
                animationDelay: `${i * cycleDuration + 330}ms, ${(i + 1) * cycleDuration}ms`,
              }}
            >
              <div className="text-white/50 text-sm font-mono mb-3">{review.name}</div>
              <div className="text-6xl font-black mb-1" style={{ color: review.accent }}>
                {review.stat}
              </div>
              <div className="text-white/40 text-sm uppercase tracking-wider">{review.label}</div>
            </div>
          ))}
        </div>

        <div
          className="absolute bottom-6 inset-x-8 flex items-center justify-center"
          style={{ animation: "hero-slide-up-decel 330ms ease-out both", animationDelay: "330ms" }}
        >
          <div className="bg-white/5 border border-white/10 px-3 py-1.5 font-mono text-xs text-white/50 flex items-center gap-2">
            <span className="text-[var(--poster-gold)]">$</span>
            <span>editframe render --data users.json</span>
          </div>
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 7: Stream — JIT streaming playback with R3F particles
   Shows frames rendering and streaming on demand.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function StreamParticles() {
  const { timeMs, durationMs } = useCompositionTime();
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const count = 40;
  const dummy = useRef(new THREE.Object3D()).current;

  useFrame(() => {
    if (!meshRef.current) return;
    const t = durationMs > 0 ? timeMs / durationMs : 0;
    for (let i = 0; i < count; i++) {
      const offset = i / count;
      const progress = (t * 2 + offset) % 1;
      const x = (progress - 0.5) * 8;
      const y = Math.sin(offset * Math.PI * 4 + timeMs * 0.002) * 1.5;
      const z = Math.cos(offset * Math.PI * 3) * 1.2;
      const scale = 0.05 + Math.sin(progress * Math.PI) * 0.08;
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshPhysicalMaterial
        color="#FFB300"
        emissive="#FFB300"
        emissiveIntensity={0.4}
        roughness={0.3}
        metalness={0.6}
      />
    </instancedMesh>
  );
}

function StreamCamera() {
  const { timeMs, durationMs } = useCompositionTime();
  const { camera } = useThree();

  useFrame(() => {
    const progress = durationMs > 0 ? timeMs / durationMs : 0;
    const angle = progress * 0.4 - 0.2;
    camera.position.set(Math.sin(angle) * 6, 1 + progress * 0.5, Math.cos(angle) * 6);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function SceneStream() {
  return (
    <Timegroup mode="fixed" duration="3630ms" className="relative" style={{ ...sceneStyle(3630), width: 960, height: 540, background: "#0a0a0a" }}>
      <CompositionCanvas
        camera={{ position: [0, 1, 6], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[3, 3, 3]} intensity={0.6} color="#FFB300" />
        <pointLight position={[-3, 2, -2]} intensity={0.3} color="#1565C0" />
        <StreamCamera />
        <StreamParticles />
      </CompositionCanvas>

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
        <div
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "165ms" }}
        >
          jit streaming
        </div>
        <div>
          <div style={{ animation: "hero-slide-up-decel 330ms ease-out both", animationDelay: "660ms" }}>
            <Text
              split="char"
              staggerMs={30}
              easing="ease-out"
              className="text-white text-3xl font-black tracking-tight"
              style={{ animation: "hero-char-assemble 330ms cubic-bezier(0.68, -0.1, 0.265, 1.1) both", animationDelay: "660ms" }}
            >
              Instant playback. No waiting.
            </Text>
          </div>
          <div
            className="text-white/40 text-sm mt-2"
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "1155ms" }}
          >
            Frames render and stream as they&apos;re needed
          </div>
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 8: Render — Scalable parallel rendering
   Cloud parallel, browser, CLI — all render targets.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneRender() {
  const cloudSegments = [
    { label: "Seg 1", delay: 660, duration: 990 },
    { label: "Seg 2", delay: 660, duration: 1155 },
    { label: "Seg 3", delay: 660, duration: 825 },
    { label: "Seg 4", delay: 660, duration: 1320 },
  ];

  return (
    <Timegroup mode="fixed" duration="3960ms" className="relative" style={{ ...sceneStyle(3960), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col justify-center px-12 gap-6">
        <div
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "165ms" }}
        >
          scalable rendering
        </div>

        {/* Cloud: parallel segments */}
        <div>
          <div
            className="text-xs font-mono text-white/50 mb-2 flex items-center gap-2"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "330ms" }}
          >
            <span className="w-2 h-2 bg-[var(--poster-green)]" />
            Cloud — parallel
          </div>
          <div
            className="flex gap-1"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "330ms" }}
          >
            {cloudSegments.map((seg) => (
              <div key={seg.label} className="flex-1 h-8 bg-white/5 border border-white/10 relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: "var(--poster-green)",
                    opacity: 0.3,
                    animation: `hero-progress-spring ${seg.duration}ms ease-out both`,
                    animationDelay: `${seg.delay}ms`,
                    ["--bar-target" as string]: "100%",
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white/40">{seg.label}</span>
                <svg
                  className="absolute top-1 right-1 w-3 h-3 text-[var(--poster-green)]"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    strokeDasharray: 24,
                    animation: `hero-check-draw 264ms ease-out both, hero-fade-in 132ms ease-out both`,
                    animationDelay: `${seg.delay + seg.duration + 132}ms, ${seg.delay + seg.duration}ms`,
                  }}
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* Browser */}
        <div>
          <div
            className="text-xs font-mono text-white/50 mb-2 flex items-center gap-2"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "660ms" }}
          >
            <span className="w-2 h-2 bg-[var(--poster-blue)]" />
            Browser
          </div>
          <div
            className="h-8 bg-white/5 border border-white/10 relative overflow-hidden"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "660ms" }}
          >
            <div className="absolute inset-y-0 left-0" style={{
              background: "var(--poster-blue)", opacity: 0.3,
              animation: "hero-progress-spring 2310ms ease-out both",
              animationDelay: "660ms",
              ["--bar-target" as string]: "100%",
            }} />
            <svg className="absolute top-1 right-1 w-3 h-3 text-[var(--poster-blue)]"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
              strokeLinecap="round" strokeLinejoin="round"
              style={{
                strokeDasharray: 24,
                animation: `hero-check-draw 264ms ease-out both, hero-fade-in 132ms ease-out both`,
                animationDelay: `${660 + 2310 + 132}ms, ${660 + 2310}ms`,
              }}
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          </div>
        </div>

        {/* CLI */}
        <div>
          <div
            className="text-xs font-mono text-white/50 mb-2 flex items-center gap-2"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "990ms" }}
          >
            <span className="w-2 h-2 bg-[var(--poster-red)]" />
            CLI
          </div>
          <div
            className="h-8 bg-white/5 border border-white/10 relative overflow-hidden"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "990ms" }}
          >
            <div className="absolute inset-y-0 left-0" style={{
              background: "var(--poster-red)", opacity: 0.3,
              animation: "hero-progress-spring 2310ms ease-out both",
              animationDelay: "660ms",
              ["--bar-target" as string]: "100%",
            }} />
            <svg className="absolute top-1 right-1 w-3 h-3 text-[var(--poster-red)]"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
              strokeLinecap="round" strokeLinejoin="round"
              style={{
                strokeDasharray: 24,
                animation: `hero-check-draw 264ms ease-out both, hero-fade-in 132ms ease-out both`,
                animationDelay: `${660 + 2310 + 132}ms, ${660 + 2310}ms`,
              }}
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          </div>
        </div>

        <div
          className="self-start text-[10px] font-mono uppercase tracking-wider text-white/40 border border-white/10 px-2 py-0.5"
          style={{
            animation: "hero-rubber-bounce 396ms cubic-bezier(0.68, -0.55, 0.265, 1.55) both",
            animationDelay: "3300ms",
          }}
        >
          Same video. Three render targets.
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━ Main Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function HeroDemo() {
  const id = useId();
  const previewId = `hero-demo-${id}`;
  const previewRef = useRef<HTMLElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="w-full relative">
      <div className="bg-[#0a0a0a] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div className="aspect-video relative">
          {isClient ? (
            <Preview
              id={previewId}
              ref={previewRef as any}
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
                  <SceneTitle />
                  <SceneAuthor />
                  <SceneLayers />
                  <SceneTimeline />
                  <SceneEditor />
                  <SceneTemplate />
                  <SceneStream />
                  <SceneRender />
                </Timegroup>
              </FitScale>
            </Preview>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
              <div className="text-white/30 text-xs uppercase tracking-widest">Loading</div>
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
