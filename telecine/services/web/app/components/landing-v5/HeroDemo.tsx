import { useId, useEffect, useState, useRef } from "react";
import {
  Preview,
  FitScale,
  Timegroup,
  TimelineRoot,
  Text,
  Audio,
  Scrubber,
  TogglePlay,
  TimeDisplay,
} from "@editframe/react";
import { CompositionCanvas, useCompositionTime } from "@editframe/react/r3f";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { ExportButton } from "./ExportButton";

/* ━━ Timing Constants (30fps frame-aligned) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const VOICEOVER_SRC = "https://assets.editframe.com/hero-voiceover-v2.mp3";
const OVERLAP_MS = 495; // 15 frames

const DUR = {
  title: 3432,
  author: 8712,
  layers: 8910,
  timeline: 10164,
  editor: 8844,
  template: 5841,
  stream: 8976,
  render: 8613,
} as const;

const TOTAL_MS =
  Object.values(DUR).reduce((a, b) => a + b, 0) - 7 * OVERLAP_MS; // 60027

function sceneStyle(durationMs: number): React.CSSProperties {
  return {
    animation: `hero-fade-in ${OVERLAP_MS}ms ease-out both, hero-fade-out ${OVERLAP_MS}ms ease-in both`,
    animationDelay: `0ms, ${durationMs - OVERLAP_MS}ms`,
  };
}

/* ━━ Word-level caption data (from whisper timestamps, absolute ms) ━━━━━━ */
interface WordTiming {
  /** display text */ w: string;
  /** start ms */ s: number;
  /** end ms */ e: number;
}
interface CaptionGroup {
  showMs: number;
  hideMs: number;
  words: WordTiming[];
}

const CAPTION_GROUPS: CaptionGroup[] = [
  // Scene 1: Title
  { showMs: 740, hideMs: 3200, words: [
    { w: "Video", s: 840, e: 1160 }, { w: "shouldn't", s: 1160, e: 1520 }, { w: "be", s: 1520, e: 1840 }, { w: "this", s: 1840, e: 2120 }, { w: "hard", s: 2120, e: 2340 }, { w: "to", s: 2340, e: 2700 }, { w: "automate.", s: 2700, e: 3000 },
  ] },
  // Scene 2: Author
  { showMs: 3260, hideMs: 5720, words: [
    { w: "What", s: 3360, e: 3540 }, { w: "if", s: 3540, e: 3780 }, { w: "video", s: 3780, e: 4120 }, { w: "was", s: 4120, e: 4460 }, { w: "just", s: 4460, e: 4880 }, { w: "HTML?", s: 4880, e: 5520 },
  ] },
  { showMs: 6060, hideMs: 8220, words: [
    { w: "Write", s: 6160, e: 6380 }, { w: "markup,", s: 6380, e: 6980 }, { w: "add", s: 7180, e: 7480 }, { w: "styles", s: 7480, e: 8020 }, { w: "\u2014", s: 8020, e: 8020 },
  ] },
  { showMs: 8460, hideMs: 11380, words: [
    { w: "Editframe", s: 8560, e: 9080 }, { w: "renders", s: 9080, e: 9480 }, { w: "it", s: 9480, e: 9720 }, { w: "to", s: 9720, e: 9960 }, { w: "real", s: 9960, e: 10220 }, { w: "video", s: 10220, e: 10700 }, { w: "frames.", s: 10700, e: 11180 },
  ] },
  // Scene 3: Layers
  { showMs: 11500, hideMs: 14040, words: [
    { w: "Stack", s: 11600, e: 11900 }, { w: "layers", s: 11900, e: 12300 }, { w: "the", s: 12300, e: 12480 }, { w: "way", s: 12480, e: 12620 }, { w: "you'd", s: 12620, e: 12980 }, { w: "stack", s: 12980, e: 13160 }, { w: "divs", s: 13160, e: 13840 }, { w: "\u2014", s: 13840, e: 13840 },
  ] },
  { showMs: 13920, hideMs: 17360, words: [
    { w: "video,", s: 14020, e: 14560 }, { w: "text,", s: 14820, e: 15260 }, { w: "shapes,", s: 15700, e: 16040 }, { w: "3D", s: 16580, e: 17160 }, { w: "\u2014", s: 17160, e: 17160 },
  ] },
  { showMs: 17280, hideMs: 19740, words: [
    { w: "each", s: 17380, e: 17760 }, { w: "one", s: 17760, e: 18020 }, { w: "a", s: 18020, e: 18500 }, { w: "composable", s: 18500, e: 19100 }, { w: "element.", s: 19100, e: 19540 },
  ] },
  // Scene 4: Timeline
  { showMs: 20000, hideMs: 21180, words: [
    { w: "Need", s: 20100, e: 20220 }, { w: "an", s: 20220, e: 20500 }, { w: "editor?", s: 20500, e: 20880 },
  ] },
  { showMs: 21380, hideMs: 23820, words: [
    { w: "Snap", s: 21480, e: 21740 }, { w: "together", s: 21740, e: 22240 }, { w: "GUI", s: 22240, e: 22840 }, { w: "primitives", s: 22840, e: 23620 }, { w: "\u2014", s: 23620, e: 23620 },
  ] },
  { showMs: 23840, hideMs: 26660, words: [
    { w: "timeline,", s: 23940, e: 24440 }, { w: "waveforms,", s: 24860, e: 25780 }, { w: "captions", s: 26000, e: 26460 }, { w: "\u2014", s: 26460, e: 26460 },
  ] },
  { showMs: 27000, hideMs: 29680, words: [
    { w: "into", s: 27100, e: 27380 }, { w: "any", s: 27380, e: 27840 }, { w: "editing", s: 27840, e: 28140 }, { w: "experience", s: 28140, e: 28900 }, { w: "you", s: 28900, e: 29260 }, { w: "want.", s: 29260, e: 29480 },
  ] },
  // Scene 5: Editor
  { showMs: 29380, hideMs: 31660, words: [
    { w: "A", s: 29480, e: 30160 }, { w: "full", s: 30160, e: 30600 }, { w: "NLE.", s: 30600, e: 31460 },
  ] },
  { showMs: 31820, hideMs: 34020, words: [
    { w: "A", s: 31920, e: 32140 }, { w: "simple", s: 32140, e: 32460 }, { w: "trim", s: 32460, e: 32720 }, { w: "tool", s: 32720, e: 33020 }, { w: "in", s: 33020, e: 33220 }, { w: "a", s: 33220, e: 33500 }, { w: "form.", s: 33500, e: 33820 },
  ] },
  { showMs: 34120, hideMs: 35380, words: [
    { w: "It's", s: 34220, e: 34500 }, { w: "your", s: 34500, e: 34760 }, { w: "UI", s: 34760, e: 35180 }, { w: "\u2014", s: 35180, e: 35180 },
  ] },
  { showMs: 35500, hideMs: 37780, words: [
    { w: "these", s: 35600, e: 35840 }, { w: "are", s: 35840, e: 36120 }, { w: "just", s: 36120, e: 36480 }, { w: "the", s: 36480, e: 36760 }, { w: "building", s: 36760, e: 37020 }, { w: "blocks.", s: 37020, e: 37580 },
  ] },
  // Scene 6: Template
  { showMs: 37960, hideMs: 39120, words: [
    { w: "Feed", s: 38060, e: 38240 }, { w: "in", s: 38240, e: 38520 }, { w: "data,", s: 38520, e: 38920 },
  ] },
  { showMs: 39180, hideMs: 43180, words: [
    { w: "and", s: 39280, e: 39580 }, { w: "one", s: 39580, e: 40100 }, { w: "template", s: 40100, e: 40520 }, { w: "becomes", s: 40520, e: 40960 }, { w: "10,000", s: 40960, e: 41840 }, { w: "unique", s: 41840, e: 42300 }, { w: "videos.", s: 42300, e: 42980 },
  ] },
  // Scene 7: Stream
  { showMs: 43260, hideMs: 45020, words: [
    { w: "Preview", s: 43360, e: 43860 }, { w: "is", s: 43860, e: 44240 }, { w: "instant.", s: 44240, e: 44820 },
  ] },
  { showMs: 45040, hideMs: 48020, words: [
    { w: "Frames", s: 45140, e: 45760 }, { w: "stream", s: 46060, e: 46520 }, { w: "just-in-time,", s: 46840, e: 47820 },
  ] },
  { showMs: 48180, hideMs: 51680, words: [
    { w: "so", s: 48280, e: 48500 }, { w: "you're", s: 48500, e: 48780 }, { w: "never", s: 48780, e: 49100 }, { w: "waiting", s: 49100, e: 49460 }, { w: "on", s: 49460, e: 49800 }, { w: "a", s: 49800, e: 50020 }, { w: "render", s: 50020, e: 50260 }, { w: "to", s: 50260, e: 50500 }, { w: "see", s: 50500, e: 50740 }, { w: "your", s: 50740, e: 51140 }, { w: "work.", s: 51140, e: 51480 },
  ] },
  // Scene 8: Render
  { showMs: 51720, hideMs: 52900, words: [
    { w: "When", s: 51820, e: 52020 }, { w: "it's", s: 52020, e: 52280 }, { w: "ready,", s: 52280, e: 52700 },
  ] },
  { showMs: 52920, hideMs: 56780, words: [
    { w: "render", s: 53020, e: 53320 }, { w: "to", s: 53320, e: 53540 }, { w: "the", s: 53540, e: 53760 }, { w: "cloud,", s: 53760, e: 54060 }, { w: "the", s: 54360, e: 54580 }, { w: "browser,", s: 54580, e: 55040 }, { w: "or", s: 55320, e: 55540 }, { w: "the", s: 55540, e: 55800 }, { w: "command", s: 55800, e: 56160 }, { w: "line", s: 56160, e: 56580 }, { w: "\u2014", s: 56580, e: 56580 },
  ] },
  { showMs: 56480, hideMs: 59880, words: [
    { w: "Same", s: 56580, e: 57560 }, { w: "composition,", s: 57560, e: 58500 }, { w: "every", s: 59120, e: 59320 }, { w: "target.", s: 59320, e: 59680 },
  ] },
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 1: Title — "BUILD VIDEO WITH CODE" char-level shatter-assemble
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneTitle() {
  const d = DUR.title;
  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Text
          split="char"
          staggerMs={40}
          easing="ease-out"
          className="text-white text-7xl font-black tracking-tighter text-center leading-[1.1]"
          style={{
            animation: "hero-char-assemble 400ms cubic-bezier(0.68, -0.1, 0.265, 1.1) both",
            animationDelay: "500ms",
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
            animationDelay: "1650ms",
          }}
        />
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 2: Author — HTML/CSS/Script -> rendered result
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneAuthor() {
  const d = DUR.author;
  const codeLines = [
    { text: '<div class="card">', color: "text-[var(--poster-blue)]" },
    { text: '  <h1>Welcome back</h1>', color: "text-white/80" },
    { text: '  <p style="color: gold">', color: "text-white/80" },
    { text: "    Your 2024 highlights", color: "text-[var(--poster-gold)]" },
    { text: "  </p>", color: "text-white/80" },
    { text: "</div>", color: "text-[var(--poster-blue)]" },
  ];

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex">
        {/* Left: code panel */}
        <div className="w-[55%] p-8 flex flex-col justify-center">
          <div
            className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 mb-4"
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "300ms" }}
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
                  animationDelay: `${825 + i * 180}ms`,
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
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "3000ms" }}
          >
            &rarr;
          </div>
          <div
            className="bg-white/5 border-2 border-white/20 p-8"
            style={{
              animation: "hero-reveal-left 660ms cubic-bezier(0.36, 0, 0.66, 1) both",
              animationDelay: "5400ms",
            }}
          >
            <div className="text-white text-3xl font-black mb-2">Welcome back</div>
            <div className="text-[var(--poster-gold)] text-lg">Your 2024 highlights</div>
          </div>
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 3: Layers — 3D floating composition layers with R3F
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
  const d = DUR.layers;
  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
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
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "300ms" }}
        >
          composable layers
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 4: Timeline — waveforms, captions, multi-track editor
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneTimeline() {
  const d = DUR.timeline;
  const tracks = [
    { label: "Video", color: "var(--poster-blue)", width: "85%", left: "5%" },
    { label: "Caption", color: "var(--poster-gold)", width: "60%", left: "15%" },
    { label: "Audio", color: "var(--poster-green)", width: "90%", left: "2%" },
    { label: "Overlay", color: "var(--poster-red)", width: "40%", left: "30%" },
  ];

  const waveformHeights = Array.from({ length: 60 }, (_, j) =>
    20 + Math.sin(j * 0.5) * 30 + Math.abs(Math.sin(j * 1.7 + 3)) * 40
  );

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col">
        {/* Ruler header */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-white/10">
          <div
            className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30"
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "200ms" }}
          >
            timeline
          </div>
          <div
            className="flex gap-6"
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "400ms" }}
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
                animationDelay: `${500 + i * 200}ms`,
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
                    animationDelay: `${1200 + i * 250}ms`,
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
              animation: "hero-fade-in 198ms ease-out both, hero-playhead-sweep 6000ms linear both",
              animationDelay: "2500ms, 2500ms",
            }}
          />
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 5: Editor — preview + filmstrip + trim handles
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneEditor() {
  const d = DUR.editor;
  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 p-6 flex flex-col gap-2">
        {/* Preview viewport */}
        <div
          className="flex-1 border-2 border-white/60 relative overflow-hidden"
          style={{ animation: "hero-reveal-left 500ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "400ms" }}
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
              animation: "hero-progress-spring 2500ms ease-out both",
              animationDelay: "3000ms",
              ["--bar-target" as string]: "60%",
            }} />
          </div>
        </div>

        {/* Filmstrip */}
        <div
          className="h-10 flex gap-0.5"
          style={{ animation: "hero-reveal-bottom 350ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "1500ms" }}
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
          style={{ animation: "hero-reveal-right 350ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "2500ms" }}
        >
          <div className="absolute inset-0 bg-white/5 border border-white/10" />
          <div className="absolute top-0 bottom-0 left-[15%] right-[25%] border-2 border-[var(--poster-gold)]">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--poster-gold)] -translate-x-full" />
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[var(--poster-gold)] translate-x-full" />
          </div>
          <div className="absolute top-0 bottom-0 left-[40%] w-0.5 bg-white" style={{
            animation: "hero-fade-in 198ms ease-out both",
            animationDelay: "4000ms",
          }} />
        </div>
      </div>

      <div
        className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider text-[var(--poster-gold)]"
        style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "200ms" }}
      >
        &lt;Preview&gt; + &lt;Filmstrip&gt; + &lt;TrimHandles&gt;
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 6: Template — Year-in-review, data-driven
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneTemplate() {
  const d = DUR.template;
  const reviews = [
    { name: "Sarah Chen", stat: "2,847", label: "commits", accent: "var(--poster-red)" },
    { name: "Marcus Johnson", stat: "156", label: "videos rendered", accent: "var(--poster-blue)" },
    { name: "Alex Rivera", stat: "12.4k", label: "views", accent: "var(--poster-gold)" },
  ];
  const cycleDuration = 1500;

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
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
                animationDelay: `${i * cycleDuration + 500}ms, ${(i + 1) * cycleDuration + 200}ms`,
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
          className="absolute bottom-32 inset-x-8 flex items-center justify-center"
          style={{ animation: "hero-slide-up-decel 330ms ease-out both", animationDelay: "500ms" }}
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
  const d = DUR.stream;
  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
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

      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-8 left-8 text-[10px] font-mono uppercase tracking-[0.3em] text-white/30"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "200ms" }}
        >
          jit streaming
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 8: Render — Scalable parallel rendering
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneRender() {
  const d = DUR.render;
  const cloudSegments = [
    { label: "Seg 1", delay: 1200, duration: 1500 },
    { label: "Seg 2", delay: 1200, duration: 1800 },
    { label: "Seg 3", delay: 1200, duration: 1200 },
    { label: "Seg 4", delay: 1200, duration: 2000 },
  ];

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col justify-center px-12 gap-6">
        <div
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "200ms" }}
        >
          scalable rendering
        </div>

        {/* Cloud: parallel segments */}
        <div>
          <div
            className="text-xs font-mono text-white/50 mb-2 flex items-center gap-2"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "400ms" }}
          >
            <span className="w-2 h-2 bg-[var(--poster-green)]" />
            Cloud &mdash; parallel
          </div>
          <div
            className="flex gap-1"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "400ms" }}
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
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "3200ms" }}
          >
            <span className="w-2 h-2 bg-[var(--poster-blue)]" />
            Browser
          </div>
          <div
            className="h-8 bg-white/5 border border-white/10 relative overflow-hidden"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "3200ms" }}
          >
            <div className="absolute inset-y-0 left-0" style={{
              background: "var(--poster-blue)", opacity: 0.3,
              animation: "hero-progress-spring 2000ms ease-out both",
              animationDelay: "3200ms",
              ["--bar-target" as string]: "100%",
            }} />
            <svg className="absolute top-1 right-1 w-3 h-3 text-[var(--poster-blue)]"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
              strokeLinecap="round" strokeLinejoin="round"
              style={{
                strokeDasharray: 24,
                animation: `hero-check-draw 264ms ease-out both, hero-fade-in 132ms ease-out both`,
                animationDelay: `${3200 + 2000 + 132}ms, ${3200 + 2000}ms`,
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
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "4200ms" }}
          >
            <span className="w-2 h-2 bg-[var(--poster-red)]" />
            CLI
          </div>
          <div
            className="h-8 bg-white/5 border border-white/10 relative overflow-hidden"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "4200ms" }}
          >
            <div className="absolute inset-y-0 left-0" style={{
              background: "var(--poster-red)", opacity: 0.3,
              animation: "hero-progress-spring 2000ms ease-out both",
              animationDelay: "4200ms",
              ["--bar-target" as string]: "100%",
            }} />
            <svg className="absolute top-1 right-1 w-3 h-3 text-[var(--poster-red)]"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
              strokeLinecap="round" strokeLinejoin="round"
              style={{
                strokeDasharray: 24,
                animation: `hero-check-draw 264ms ease-out both, hero-fade-in 132ms ease-out both`,
                animationDelay: `${4200 + 2000 + 132}ms, ${4200 + 2000}ms`,
              }}
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          </div>
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Caption Overlay — word-level karaoke captions
   Each word lights up when spoken (opacity 0.4 → 1) and gets a brief
   gold color flash. Group visibility uses nested fade-in / fade-out.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function CaptionOverlay() {
  return (
    <Timegroup
      mode="fixed"
      duration={`${TOTAL_MS}ms`}
      className="absolute inset-0 z-10 pointer-events-none"
    >
      {CAPTION_GROUPS.map((group, gi) => (
        <div
          key={gi}
          className="absolute bottom-10 left-0 right-0 flex justify-center px-8"
          style={{
            animation: `hero-fade-in 100ms ease-out both`,
            animationDelay: `${group.showMs}ms`,
          }}
        >
          <span
            className="inline-block bg-black/85 text-white text-xl font-semibold px-5 py-3 text-center leading-relaxed tracking-wide"
            style={{
              animation: `hero-fade-out 100ms ease-in both`,
              animationDelay: `${group.hideMs}ms`,
            }}
          >
            {group.words.map((word, wi) => {
              const dur = Math.max(word.e - word.s, 80);
              return (
                <span
                  key={wi}
                  style={{
                    animation: `hero-word-on 80ms ease-out both, hero-word-speak ${dur}ms ease both`,
                    animationDelay: `${word.s}ms, ${word.s}ms`,
                  }}
                >
                  {word.w}{wi < group.words.length - 1 ? " " : ""}
                </span>
              );
            })}
          </span>
        </div>
      ))}
    </Timegroup>
  );
}

/* ━━ Timeline Content (used by TimelineRoot for clone rendering) ━━━━━━━━━ */
function HeroDemoContent() {
  return (
    <FitScale>
      <Timegroup
        mode="contain"
        className="relative"
        style={{ width: 960, height: 540 }}
      >
        <Audio src={VOICEOVER_SRC} />
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
        <CaptionOverlay />
      </Timegroup>
    </FitScale>
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
              <TimelineRoot id={previewId} component={HeroDemoContent} />
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
