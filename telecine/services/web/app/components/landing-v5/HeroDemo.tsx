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
const OVERLAP_MS = 495; // 15 frames

const DUR = {
  title: 3000,
  author: 10033,
  layers: 9367,
  timeline: 11100,
  editor: 8400,
  template: 6300,
  stream: 6000,
  render: 9100,
} as const;

function sceneStyle(durationMs: number): React.CSSProperties {
  return {
    animation: `hero-fade-in ${OVERLAP_MS}ms ease-out both, hero-fade-out ${OVERLAP_MS}ms ease-in both`,
    animationDelay: `0ms, ${durationMs - OVERLAP_MS}ms`,
  };
}

/* ━━ Per-scene word-level caption data (timestamps relative to scene start) ━━ */
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

const CAPTIONS_TITLE: CaptionGroup[] = [
  { showMs: 0, hideMs: 2500, words: [
    { w: "Video", s: 0, e: 360 }, { w: "is", s: 360, e: 540 }, { w: "a", s: 540, e: 640 }, { w: "web", s: 640, e: 920 }, { w: "page", s: 920, e: 1260 }, { w: "that", s: 1260, e: 1500 }, { w: "moves.", s: 1500, e: 2100 },
  ] },
];

const CAPTIONS_AUTHOR: CaptionGroup[] = [
  { showMs: 0, hideMs: 3200, words: [
    { w: "It", s: 360, e: 560 }, { w: "starts", s: 560, e: 960 }, { w: "with", s: 960, e: 1200 }, { w: "HTML", s: 1200, e: 1700 }, { w: "and", s: 1700, e: 1960 }, { w: "CSS.", s: 1960, e: 2600 },
  ] },
  { showMs: 3400, hideMs: 8700, words: [
    { w: "When", s: 3600, e: 3900 }, { w: "you", s: 3900, e: 4100 }, { w: "need", s: 4100, e: 4400 }, { w: "more,", s: 4400, e: 4900 }, { w: "it's", s: 5200, e: 5500 }, { w: "just", s: 5500, e: 5900 }, { w: "React.", s: 5900, e: 6600 },
  ] },
];

const CAPTIONS_LAYERS: CaptionGroup[] = [
  { showMs: 0, hideMs: 3000, words: [
    { w: "Stack", s: 0, e: 920 }, { w: "layers", s: 920, e: 1280 }, { w: "the", s: 1280, e: 1480 }, { w: "way", s: 1480, e: 1720 }, { w: "you", s: 1720, e: 1880 }, { w: "stack", s: 1880, e: 2140 }, { w: "divs.", s: 2140, e: 2760 },
  ] },
  { showMs: 3100, hideMs: 6700, words: [
    { w: "Video,", s: 3320, e: 3980 }, { w: "text,", s: 4300, e: 4640 }, { w: "shapes,", s: 4940, e: 5360 }, { w: "3D\u2009\u2014", s: 5880, e: 6460 },
  ] },
  { showMs: 6700, hideMs: 8400, words: [
    { w: "mix", s: 6920, e: 7160 }, { w: "everything.", s: 7160, e: 8100 },
  ] },
];

const CAPTIONS_TIMELINE: CaptionGroup[] = [
  { showMs: 0, hideMs: 1800, words: [
    { w: "Need", s: 0, e: 1060 }, { w: "an", s: 1060, e: 1280 }, { w: "editor?", s: 1280, e: 1600 },
  ] },
  { showMs: 2000, hideMs: 4200, words: [
    { w: "Snap", s: 2240, e: 2500 }, { w: "together", s: 2500, e: 2940 }, { w: "GUI", s: 2940, e: 3440 }, { w: "primitives.", s: 3440, e: 4019 },
  ] },
  { showMs: 4200, hideMs: 7000, words: [
    { w: "Timeline,", s: 4420, e: 4900 }, { w: "waveforms,", s: 5460, e: 6200 }, { w: "captions,", s: 6400, e: 6780 },
  ] },
  { showMs: 7100, hideMs: 10100, words: [
    { w: "into", s: 7360, e: 7640 }, { w: "any", s: 7640, e: 8200 }, { w: "editing", s: 8200, e: 8640 }, { w: "experience", s: 8640, e: 9140 }, { w: "you", s: 9140, e: 9560 }, { w: "want.", s: 9560, e: 9820 },
  ] },
];

const CAPTIONS_EDITOR: CaptionGroup[] = [
  { showMs: 0, hideMs: 1700, words: [
    { w: "A", s: 0, e: 640 }, { w: "full", s: 640, e: 920 }, { w: "NLE.", s: 920, e: 1460 },
  ] },
  { showMs: 1700, hideMs: 3900, words: [
    { w: "A", s: 1980, e: 2160 }, { w: "simple", s: 2160, e: 2400 }, { w: "trim", s: 2400, e: 2700 }, { w: "tool", s: 2700, e: 3040 }, { w: "in", s: 3040, e: 3260 }, { w: "a", s: 3260, e: 3360 }, { w: "form.", s: 3360, e: 3660 },
  ] },
  { showMs: 3900, hideMs: 5100, words: [
    { w: "It's", s: 4200, e: 4380 }, { w: "your", s: 4380, e: 4500 }, { w: "UI.", s: 4500, e: 4780 },
  ] },
  { showMs: 5200, hideMs: 7200, words: [
    { w: "These", s: 5460, e: 5760 }, { w: "are", s: 5760, e: 5940 }, { w: "just", s: 5940, e: 6200 }, { w: "the", s: 6200, e: 6400 }, { w: "building", s: 6400, e: 6680 }, { w: "blocks.", s: 6680, e: 6980 },
  ] },
];

const CAPTIONS_TEMPLATE: CaptionGroup[] = [
  { showMs: 0, hideMs: 1700, words: [
    { w: "Feed", s: 0, e: 880 }, { w: "in", s: 880, e: 1080 }, { w: "data,", s: 1080, e: 1420 },
  ] },
  { showMs: 1700, hideMs: 4900, words: [
    { w: "and", s: 1940, e: 2040 }, { w: "one", s: 2040, e: 2260 }, { w: "template", s: 2260, e: 2640 }, { w: "becomes", s: 2640, e: 3120 }, { w: "10,000", s: 3120, e: 3980 }, { w: "unique", s: 3980, e: 4300 }, { w: "videos.", s: 4300, e: 4680 },
  ] },
];

const CAPTIONS_STREAM: CaptionGroup[] = [
  { showMs: 0, hideMs: 2000, words: [
    { w: "Preview", s: 0, e: 700 }, { w: "is", s: 700, e: 900 }, { w: "instant.", s: 900, e: 1600 },
  ] },
  { showMs: 2000, hideMs: 5200, words: [
    { w: "Change", s: 2200, e: 2600 }, { w: "the", s: 2600, e: 2800 }, { w: "code,", s: 2800, e: 3300 }, { w: "see", s: 3500, e: 3800 }, { w: "the", s: 3800, e: 4000 }, { w: "frame.", s: 4000, e: 4600 },
  ] },
];

const CAPTIONS_RENDER: CaptionGroup[] = [
  { showMs: 0, hideMs: 1600, words: [
    { w: "When", s: 0, e: 960 }, { w: "it's", s: 960, e: 1180 }, { w: "ready,", s: 1180, e: 1420 },
  ] },
  { showMs: 1600, hideMs: 5300, words: [
    { w: "render", s: 1900, e: 2240 }, { w: "to", s: 2240, e: 2500 }, { w: "the", s: 2500, e: 2620 }, { w: "cloud,", s: 2620, e: 3000 }, { w: "the", s: 3300, e: 3380 }, { w: "browser,", s: 3380, e: 3820 }, { w: "or", s: 4120, e: 4200 }, { w: "the", s: 4200, e: 4340 }, { w: "command", s: 4340, e: 4560 }, { w: "line.", s: 4560, e: 5100 },
  ] },
  { showMs: 5200, hideMs: 7900, words: [
    { w: "Same", s: 5400, e: 5780 }, { w: "composition,", s: 5780, e: 6380 }, { w: "every", s: 7000, e: 7340 }, { w: "target.", s: 7340, e: 7680 },
  ] },
];

const AUDIO_CDN = "https://assets.editframe.com/hero";
const AUDIO_SRC = {
  title:    `${AUDIO_CDN}/01-title-a290b7f6.mp3`,
  author:   `${AUDIO_CDN}/02-author-99e9ca24.mp3`,
  layers:   `${AUDIO_CDN}/03-layers-9b105620.mp3`,
  timeline: `${AUDIO_CDN}/04-timeline-993b3d16.mp3`,
  editor:   `${AUDIO_CDN}/05-editor-197fcf4c.mp3`,
  template: `${AUDIO_CDN}/06-template-95d5c2cd.mp3`,
  stream:   `${AUDIO_CDN}/07-stream-5b7d2772.mp3`,
  render:   `${AUDIO_CDN}/08-render-bc145020.mp3`,
} as const;

function SceneCaptions({ groups }: { groups: CaptionGroup[] }) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {groups.map((group, gi) => (
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
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 1: Title — "VIDEO IS A / WEB PAGE / THAT MOVES."
   Three-line staggered reveal with continuous drift. "WEB PAGE" is the
   hero phrase, rendered in gold with a scale pulse.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneTitle() {
  const d = DUR.title;
  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <Audio src={AUDIO_SRC.title} />
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(21,101,192,0.08) 0%, transparent 70%)",
      }} />
      {/* Continuous slow drift keeps every frame unique */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{
        animation: `hero-title-drift ${d}ms ease-in-out both`,
      }}>
        {/* Line 1: "VIDEO IS A" — visible immediately */}
        <Text
          split="char"
          staggerMs={35}
          easing="ease-out"
          className="text-white text-6xl font-black tracking-tighter text-center leading-[1.1]"
          style={{
            animation: "hero-char-assemble 350ms cubic-bezier(0.68, -0.1, 0.265, 1.1) both",
            animationDelay: "0ms",
          }}
        >
          VIDEO IS A
        </Text>
        {/* Line 2: "WEB PAGE" — hero phrase, gold, larger */}
        <Text
          split="char"
          staggerMs={50}
          easing="ease-out"
          className="text-[var(--poster-gold)] text-8xl font-black tracking-tighter text-center leading-[1.0]"
          style={{
            animation: "hero-char-assemble 400ms cubic-bezier(0.68, -0.1, 0.265, 1.1) both, hero-title-pulse 1800ms ease-in-out both",
            animationDelay: "500ms, 1400ms",
          }}
        >
          WEB PAGE
        </Text>
        {/* Line 3: "THAT MOVES." — slides up last */}
        <Text
          split="char"
          staggerMs={30}
          easing="ease-out"
          className="text-white/60 text-4xl font-bold tracking-tight text-center leading-[1.2] mt-1"
          style={{
            animation: "hero-slide-up-decel 400ms ease-out both",
            animationDelay: "1100ms",
          }}
        >
          THAT MOVES.
        </Text>
      </div>
      <SceneCaptions groups={CAPTIONS_TITLE} />
    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 2: Author — HTML/CSS/Script -> rendered result
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneAuthor() {
  const d = DUR.author;

  /* Phase 1 (0–3s "It starts with HTML and CSS"):
       HTML lines type in → right panel builds: video bg, then title
     Phase 2 (3.4–6.5s "When you need more, it's just React"):
       CSS lines type in → right panel restyles: gold title, size, glow
     Phase 3 (6.5–9s): settle, progress bar, hold */

  const codeLines = [
    { text: '<video src="clip.mp4"></video>', color: "text-[var(--poster-blue)]", delay: 600 },
    { text: '<h1 class="title">', color: "text-white/80", delay: 1400 },
    { text: "  Year in Review", color: "text-white/60", delay: 1900 },
    { text: "</h1>", color: "text-white/80", delay: 2300 },
    { text: "<style>", color: "text-[var(--poster-gold)]", delay: 3600 },
    { text: "  .title {", color: "text-[var(--poster-gold)]", delay: 4100 },
    { text: "    color: gold;", color: "text-[#FFD54F]", delay: 4600 },
    { text: "    font-size: 3rem;", color: "text-[#FFD54F]", delay: 5100 },
    { text: "  }", color: "text-[var(--poster-gold)]", delay: 5600 },
    { text: "</style>", color: "text-[var(--poster-gold)]", delay: 5900 },
  ];

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <Audio src={AUDIO_SRC.author} />
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 60% 50% at 75% 50%, rgba(21,101,192,0.06) 0%, transparent 70%)",
      }} />
      <div className="absolute inset-0 flex items-center">
        {/* Left: code panel */}
        <div className="w-[48%] pl-8 pr-2 flex flex-col justify-center">
          <div
            className="border border-white/10 overflow-hidden"
            style={{ animation: "hero-fade-in 400ms ease-out both", animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border-b border-white/10">
              <div className="w-2 h-2 rounded-full bg-[var(--poster-red)]/60" />
              <div className="w-2 h-2 rounded-full bg-[var(--poster-gold)]/60" />
              <div className="w-2 h-2 rounded-full bg-[var(--poster-green)]/60" />
              <span className="ml-2 text-[9px] font-mono text-white/30">composition.html</span>
            </div>
            <div className="p-4 font-mono text-[12px] leading-relaxed bg-white/[0.02]">
              {codeLines.map((line, i) => (
                <div
                  key={i}
                  className={`flex ${line.color}`}
                  style={{
                    animation: "hero-slide-up-decel 264ms ease-out both",
                    animationDelay: `${line.delay}ms`,
                  }}
                >
                  <span className="text-white/15 w-5 text-right mr-3 select-none text-xs">{i + 1}</span>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center arrow */}
        <div className="flex items-center justify-center w-[4%]">
          <div
            className="text-white/40 text-lg font-mono"
            style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "1800ms" }}
          >
            &rarr;
          </div>
        </div>

        {/* Right: rendered video frame — builds progressively */}
        <div className="w-[48%] pr-8 flex items-center justify-center">
          <div
            className="w-full relative overflow-hidden"
            style={{
              aspectRatio: "16/9",
              animation: "hero-fade-in 500ms ease-out both",
              animationDelay: "800ms",
            }}
          >
            {/* Video background — appears when <video> line types */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 40%, #1a1230 100%)",
                animation: "hero-fade-in 600ms ease-out both",
                animationDelay: "900ms",
              }}
            />
            <div className="absolute inset-0" style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(21,101,192,0.12) 0%, transparent 70%)",
              animation: "hero-fade-in 600ms ease-out both",
              animationDelay: "900ms",
            }} />

            {/* Play button — appears with <video>, fades when <h1> arrives */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                animation: "hero-fade-in 400ms ease-out both, hero-fade-out 400ms ease-in both",
                animationDelay: "1000ms, 1900ms",
              }}
            >
              <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white/30 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Border frame */}
            <div
              className="absolute inset-0 border border-white/20"
              style={{
                animation: "hero-fade-in 400ms ease-out both",
                animationDelay: "900ms",
              }}
            />

            {/* Title — appears when <h1> types (~2s), restyles to gold at ~4.8s */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-6"
              style={{
                animation: "hero-fade-in 400ms ease-out both",
                animationDelay: "2100ms",
              }}
            >
              <div
                className="text-white text-2xl font-black tracking-tight text-center leading-tight"
                style={{
                  animation: "hero-author-title-restyle 600ms ease-out both",
                  animationDelay: "4800ms",
                }}
              >
                Year in Review
              </div>
            </div>

            {/* Gold glow — appears when CSS block types */}
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,179,0,0.1) 0%, transparent 70%)",
                animation: "hero-fade-in 800ms ease-out both",
                animationDelay: "4800ms",
              }}
            />

            {/* Year watermark — appears with CSS restyle */}
            <div
              className="absolute top-4 left-5 text-white/[0.08] text-5xl font-black leading-none select-none"
              style={{
                animation: "hero-fade-in 600ms ease-out both",
                animationDelay: "5200ms",
              }}
            >
              2024
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <div className="h-full bg-[var(--poster-red)]" style={{
                animation: "hero-progress-spring 2500ms ease-out both",
                animationDelay: "6500ms",
                ["--bar-target" as string]: "45%",
              }} />
            </div>

            {/* Timecode */}
            <div
              className="absolute bottom-2 right-3 text-[9px] font-mono text-white/30"
              style={{
                animation: "hero-fade-in 264ms ease-out both",
                animationDelay: "6500ms",
              }}
            >
              00:02.14
            </div>
          </div>
        </div>
      </div>
      <SceneCaptions groups={CAPTIONS_AUTHOR} />
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
  const xSpread = (index - 1.5) * 0.5;
  const zOffset = (index - 1.5) * 0.55;

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
    const angle = 0.25 + (1 - progress) * 0.2;
    const distance = 7 - progress * 0.5;
    camera.position.set(
      Math.sin(angle) * distance,
      1.0 + (1 - progress) * 0.3,
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
      <Audio src={AUDIO_SRC.layers} />
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
      <SceneCaptions groups={CAPTIONS_LAYERS} />
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
      <Audio src={AUDIO_SRC.timeline} />
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
      <SceneCaptions groups={CAPTIONS_TIMELINE} />
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
      <Audio src={AUDIO_SRC.editor} />
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
            <div className="text-[var(--poster-gold)] text-xl font-bold" style={{
              animation: "hero-fade-in 400ms ease-out both",
              animationDelay: "1200ms",
            }}>Welcome back</div>
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
      <SceneCaptions groups={CAPTIONS_EDITOR} />
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
  const cardHoldMs = 1200;
  const cardFadeMs = 300;
  const cardTotalMs = cardFadeMs + cardHoldMs + cardFadeMs;

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <Audio src={AUDIO_SRC.template} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Year watermark - positioned to not overlap stats */}
        <div
          className="text-white/[0.04] text-[180px] font-black leading-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{ animation: "hero-fade-in 660ms ease-out both", animationDelay: "0ms" }}
        >
          2024
        </div>

        {/* Cycling review cards - single animation per card handles full lifecycle */}
        <div className="relative" style={{ width: 500, height: 180 }}>
          {reviews.map((review, i) => {
            const startMs = i * (cardHoldMs + cardFadeMs) + 400;
            return (
              <div
                key={review.name}
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{
                  opacity: 0,
                  animation: `hero-card-lifecycle ${cardTotalMs}ms ease both`,
                  animationDelay: `${startMs}ms`,
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
      <SceneCaptions groups={CAPTIONS_TEMPLATE} />
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
      <Audio src={AUDIO_SRC.stream} />
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
      <SceneCaptions groups={CAPTIONS_STREAM} />
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
      <Audio src={AUDIO_SRC.render} />
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
      <SceneCaptions groups={CAPTIONS_RENDER} />
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
