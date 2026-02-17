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
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(21,101,192,0.08) 0%, transparent 70%)",
      }} />
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
          BUILD VIDEO{"\n"}WITH CODE
        </Text>
        <div
          className="mt-4 h-[3px] bg-[var(--poster-gold)]"
          style={{
            width: "40%",
            transformOrigin: "center",
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
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 60% 50% at 75% 50%, rgba(21,101,192,0.06) 0%, transparent 70%)",
      }} />
      <div className="absolute inset-0 flex items-center">
        {/* Left: code panel with editor chrome */}
        <div className="w-[52%] pl-10 pr-4 flex flex-col justify-center">
          <div
            className="border border-white/10 overflow-hidden"
            style={{ animation: "hero-fade-in 400ms ease-out both", animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border-b border-white/10">
              <div className="w-2 h-2 rounded-full bg-[var(--poster-red)]/60" />
              <div className="w-2 h-2 rounded-full bg-[var(--poster-gold)]/60" />
              <div className="w-2 h-2 rounded-full bg-[var(--poster-green)]/60" />
              <span className="ml-2 text-[9px] font-mono text-white/30">composition.tsx</span>
            </div>
            <div className="p-4 font-mono text-sm leading-relaxed bg-white/[0.02]">
              {codeLines.map((line, i) => (
                <div
                  key={i}
                  className={`flex ${line.color}`}
                  style={{
                    animation: "hero-slide-up-decel 264ms ease-out both",
                    animationDelay: `${825 + i * 180}ms`,
                  }}
                >
                  <span className="text-white/15 w-6 text-right mr-3 select-none text-xs">{i + 1}</span>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center arrow */}
        <div className="flex items-center justify-center w-[6%]">
          <div
            className="text-white/30 text-xl font-mono"
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "2800ms" }}
          >
            &rarr;
          </div>
        </div>

        {/* Right: rendered result as video frame */}
        <div className="w-[42%] pr-10 flex items-center justify-center">
          <div
            className="w-full border-2 border-white/30 relative overflow-hidden"
            style={{
              aspectRatio: "16/9",
              animation: "hero-reveal-left 660ms cubic-bezier(0.36, 0, 0.66, 1) both",
              animationDelay: "3600ms",
            }}
          >
            <div className="absolute inset-0" style={{
              background: "linear-gradient(160deg, #111 0%, #1a1a2e 100%)",
            }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <div className="text-white text-2xl font-black mb-2">Welcome back</div>
              <div className="text-[var(--poster-gold)] text-base">Your 2024 highlights</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
              <div className="h-full bg-[var(--poster-red)]" style={{
                animation: "hero-progress-spring 1800ms ease-out both",
                animationDelay: "5000ms",
                ["--bar-target" as string]: "35%",
              }} />
            </div>
          </div>
        </div>
      </div>
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 3: Layers — 3D floating composition layers with R3F
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const LAYER_DEFS = [
  { color: new THREE.Color("#1565C0"), label: "Video", opacity: 0.75 },
  { color: new THREE.Color("#EEEEEE"), label: "Text", opacity: 0.6 },
  { color: new THREE.Color("#E53935"), label: "Shape", opacity: 0.65 },
  { color: new THREE.Color("#FFB300"), label: "3D", opacity: 0.55 },
];

function LayerPlane({ index, color, opacity: baseOpacity }: { index: number; color: THREE.Color; opacity: number }) {
  const { timeMs } = useCompositionTime();
  const meshRef = useRef<THREE.Mesh>(null!);
  const t = timeMs / 1000;

  const entranceDelay = index * 350;
  const entranceProgress = Math.min(1, Math.max(0, (timeMs - entranceDelay) / 400));
  const eased = 1 - Math.pow(1 - entranceProgress, 3);

  const yFloat = Math.sin(t * 1.2 + index * 1.8) * 0.06;
  const xSpread = (index - 1.5) * 0.3;
  const zOffset = (index - 1.5) * 0.7;

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(xSpread, yFloat + (1 - eased) * 3, zOffset);
    meshRef.current.rotation.y = (1 - eased) * 0.5 + Math.sin(t * 0.3 + index) * 0.02;
    meshRef.current.scale.setScalar(eased);
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2.8, 1.6]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={baseOpacity}
        roughness={0.2}
        metalness={0.05}
        clearcoat={0.6}
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
    const angle = 0.35 + (1 - progress) * 0.3;
    const distance = 6.5 - progress * 0.8;
    camera.position.set(
      Math.sin(angle) * distance,
      1.2 + (1 - progress) * 0.4,
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
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(21,101,192,0.05) 0%, transparent 70%)",
      }} />
      <CompositionCanvas
        camera={{ position: [3, 1.5, 6], fov: 32 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.7} />
        <pointLight position={[-3, 2, 4]} intensity={0.3} color="#FFB300" />
        <LayersCamera />
        {LAYER_DEFS.map((def, i) => (
          <LayerPlane key={i} index={i} color={def.color} opacity={def.opacity} />
        ))}
      </CompositionCanvas>
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-8 left-8 text-white/40 text-xs font-mono uppercase tracking-[0.3em]"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "300ms" }}
        >
          composable layers
        </div>
        {/* Layer labels that appear as layers enter */}
        <div className="absolute bottom-16 left-8 flex gap-3">
          {LAYER_DEFS.map((def, i) => (
            <div
              key={def.label}
              className="flex items-center gap-1.5"
              style={{
                animation: "hero-fade-in 264ms ease-out both",
                animationDelay: `${800 + i * 400}ms`,
              }}
            >
              <div className="w-2 h-2" style={{ background: `#${def.color.getHexString()}` }} />
              <span className="text-[10px] font-mono text-white/50 uppercase">{def.label}</span>
            </div>
          ))}
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

        {/* Mini preview window above tracks */}
        <div
          className="mx-6 mt-4 mb-2 h-28 border border-white/10 relative overflow-hidden"
          style={{ animation: "hero-fade-in 400ms ease-out both", animationDelay: "300ms" }}
        >
          <div className="absolute inset-0" style={{
            background: "linear-gradient(135deg, #1565C0 0%, #0a0a0a 50%, #E53935 100%)",
            opacity: 0.2,
          }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/20 text-sm font-mono">Preview</div>
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

        {/* Playhead - fixed pixel sweep instead of vw */}
        <div className="absolute top-12 bottom-0 pointer-events-none" style={{ left: "80px" }}>
          <div
            className="w-0.5 h-full bg-white"
            style={{
              animation: "hero-fade-in 198ms ease-out both, hero-playhead-sweep-fixed 6000ms linear both",
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
          className="flex-1 border border-white/20 relative overflow-hidden"
          style={{ animation: "hero-reveal-left 500ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "400ms" }}
        >
          <div className="absolute inset-0" style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-white text-xl font-bold mb-1" style={{
              animation: "hero-fade-in 400ms ease-out both",
              animationDelay: "1200ms",
            }}>Welcome back</div>
            <div className="text-[var(--poster-gold)] text-sm" style={{
              animation: "hero-fade-in 400ms ease-out both",
              animationDelay: "1500ms",
            }}>Your 2024 highlights</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div className="h-full bg-[var(--poster-red)]" style={{
              animation: "hero-progress-spring 2500ms ease-out both",
              animationDelay: "3000ms",
              ["--bar-target" as string]: "60%",
            }} />
          </div>
          {/* Playback controls */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2" style={{
            animation: "hero-fade-in 264ms ease-out both",
            animationDelay: "1800ms",
          }}>
            <svg className="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            <span className="text-[10px] font-mono text-white/40">00:03.12</span>
          </div>
        </div>

        {/* Filmstrip with varied content simulation */}
        <div
          className="h-12 flex gap-0.5"
          style={{ animation: "hero-reveal-bottom 350ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "1500ms" }}
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 relative overflow-hidden"
              style={{
                background: `linear-gradient(${135 + i * 12}deg, hsl(${210 + i * 5}, ${25 + (i % 3) * 10}%, ${10 + i * 1.2}%) 0%, hsl(${220 + i * 7}, ${20 + (i % 4) * 8}%, ${14 + i * 1}%) 100%)`,
              }}
            >
              {i % 4 === 2 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-1 bg-white/20 rounded-full" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Timeline with trim handles */}
        <div
          className="h-10 relative"
          style={{ animation: "hero-reveal-right 350ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "2500ms" }}
        >
          <div className="absolute inset-0 bg-white/5 border border-white/10" />
          <div className="absolute top-0 bottom-0 left-[15%] right-[25%] border-2 border-[var(--poster-gold)]">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-[var(--poster-gold)] -translate-x-full cursor-ew-resize" />
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-[var(--poster-gold)] translate-x-full cursor-ew-resize" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-mono text-white/30">Selected region</span>
            </div>
          </div>
          <div className="absolute top-0 bottom-0 left-[40%] w-0.5 bg-white" style={{
            animation: "hero-fade-in 198ms ease-out both",
            animationDelay: "4000ms",
          }} />
        </div>
      </div>

      {/* Component labels */}
      <div className="absolute top-3 left-6 right-6 flex justify-between">
        <div
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "200ms" }}
        >
          editor primitives
        </div>
        <div
          className="flex gap-3 text-[9px] font-mono text-white/25"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "600ms" }}
        >
          <span>&lt;Preview&gt;</span>
          <span>&lt;Filmstrip&gt;</span>
          <span>&lt;TrimHandles&gt;</span>
        </div>
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
  const cycleDuration = 1600;
  const cardDuration = 1200;

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Year watermark - positioned to not overlap stats */}
        <div
          className="text-white/[0.04] text-[180px] font-black leading-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{ animation: "hero-fade-in 660ms ease-out both", animationDelay: "0ms" }}
        >
          2024
        </div>

        {/* Cycling review cards - each fully exits before next enters */}
        <div className="relative" style={{ width: 500, height: 180 }}>
          {reviews.map((review, i) => {
            const enterMs = i * cycleDuration + 400;
            const exitMs = enterMs + cardDuration;
            return (
              <div
                key={review.name}
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{
                  opacity: 0,
                  animation: `hero-card-enter 300ms ease-out both, hero-card-exit 250ms ease-in both`,
                  animationDelay: `${enterMs}ms, ${exitMs}ms`,
                }}
              >
                <div className="text-white/50 text-sm font-mono mb-3">{review.name}</div>
                <div className="text-6xl font-black mb-1" style={{ color: review.accent }}>
                  {review.stat}
                </div>
                <div className="text-white/40 text-sm uppercase tracking-wider">{review.label}</div>
              </div>
            );
          })}
        </div>

        <div
          className="absolute bottom-28 inset-x-8 flex items-center justify-center"
          style={{ animation: "hero-slide-up-decel 330ms ease-out both", animationDelay: "400ms" }}
        >
          <div className="bg-white/5 border border-white/10 px-4 py-2 font-mono text-xs text-white/50 flex items-center gap-2">
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
  const count = 60;
  const dummy = useRef(new THREE.Object3D()).current;

  useFrame(() => {
    if (!meshRef.current) return;
    const t = durationMs > 0 ? timeMs / durationMs : 0;
    for (let i = 0; i < count; i++) {
      const offset = i / count;
      const progress = (t * 1.5 + offset) % 1;
      const x = -4 + progress * 8;
      const lane = (i % 5) - 2;
      const y = lane * 0.4 + Math.sin(progress * Math.PI * 2 + offset * 6) * 0.3;
      const z = Math.cos(offset * Math.PI * 2) * 0.8;
      const scale = 0.03 + Math.sin(progress * Math.PI) * 0.06;
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
        emissiveIntensity={0.5}
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
    const angle = progress * 0.2 - 0.1;
    camera.position.set(Math.sin(angle) * 7, 0.5 + progress * 0.3, Math.cos(angle) * 7);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function SceneStream() {
  const d = DUR.stream;
  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <CompositionCanvas
        camera={{ position: [0, 0.5, 7], fov: 35 }}
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
        {/* Streaming indicator */}
        <div
          className="absolute top-8 right-8 flex items-center gap-2"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "800ms" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)]" style={{
            animation: "hero-cursor-blink 1200ms ease-in-out infinite",
          }} />
          <span className="text-[10px] font-mono text-white/40 uppercase">Live</span>
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
    { label: "Seg 1", delay: 800, duration: 1400 },
    { label: "Seg 2", delay: 950, duration: 1700 },
    { label: "Seg 3", delay: 1100, duration: 1100 },
    { label: "Seg 4", delay: 1250, duration: 1900 },
  ];

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <div className="absolute inset-0 flex flex-col justify-center px-12 gap-5">
        <div
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "200ms" }}
        >
          scalable rendering
        </div>

        {/* Cloud: parallel segments with staggered starts */}
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
              <div key={seg.label} className="flex-1 h-9 bg-white/[0.03] border border-white/10 relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: "var(--poster-green)",
                    opacity: 0.4,
                    animation: `hero-progress-spring ${seg.duration}ms ease-out both`,
                    animationDelay: `${seg.delay}ms`,
                    ["--bar-target" as string]: "100%",
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white/40">{seg.label}</span>
                <svg
                  className="absolute top-1.5 right-1.5 w-3 h-3 text-[var(--poster-green)]"
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
            className="h-9 bg-white/[0.03] border border-white/10 relative overflow-hidden"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "3200ms" }}
          >
            <div className="absolute inset-y-0 left-0" style={{
              background: "var(--poster-blue)", opacity: 0.4,
              animation: "hero-progress-spring 2000ms ease-out both",
              animationDelay: "3200ms",
              ["--bar-target" as string]: "100%",
            }} />
            <svg className="absolute top-1.5 right-1.5 w-3 h-3 text-[var(--poster-blue)]"
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
            className="h-9 bg-white/[0.03] border border-white/10 relative overflow-hidden"
            style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "4200ms" }}
          >
            <div className="absolute inset-y-0 left-0" style={{
              background: "var(--poster-red)", opacity: 0.4,
              animation: "hero-progress-spring 2000ms ease-out both",
              animationDelay: "4200ms",
              ["--bar-target" as string]: "100%",
            }} />
            <svg className="absolute top-1.5 right-1.5 w-3 h-3 text-[var(--poster-red)]"
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
          className="absolute bottom-4 left-0 right-0 flex justify-center px-8"
          style={{
            animation: `hero-fade-in 100ms ease-out both`,
            animationDelay: `${group.showMs}ms`,
          }}
        >
          <span
            className="inline-block bg-black/90 text-white text-lg font-semibold px-4 py-2 text-center leading-snug tracking-wide"
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
