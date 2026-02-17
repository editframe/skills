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
  { color: new THREE.Color("#1565C0"), label: "Video",  hex: "#1565C0", entranceMs: 400,  highlightMs: 3320 },
  { color: new THREE.Color("#E0E0E0"), label: "Text",   hex: "#E0E0E0", entranceMs: 1600, highlightMs: 4300 },
  { color: new THREE.Color("#E53935"), label: "Shape",  hex: "#E53935", entranceMs: 2800, highlightMs: 4940 },
  { color: new THREE.Color("#FFB300"), label: "3D",     hex: "#FFB300", entranceMs: 4000, highlightMs: 5880 },
];

function LayerContentVideo() {
  return (
    <group>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[0, 0.55 - i * 0.16, 0.001]}>
          <planeGeometry args={[2.2, 0.06]} />
          <meshBasicMaterial color="#0D47A1" transparent opacity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.002]}>
        <circleGeometry args={[0.22, 3]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function LayerContentText() {
  return (
    <group>
      {[0.5, 0.25, 0.12, -0.12, -0.25, -0.5].map((y, i) => {
        const widths = [1.8, 2.0, 1.4, 2.1, 1.6, 1.0];
        const w = widths[i] ?? 1.5;
        return (
          <mesh key={i} position={[-0.1 + (2.2 - w) * -0.2, y, 0.001]}>
            <planeGeometry args={[w, 0.08]} />
            <meshBasicMaterial color="#333333" transparent opacity={0.7} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.65, 0.001]}>
        <planeGeometry args={[1.2, 0.12]} />
        <meshBasicMaterial color="#222222" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function LayerContentShape() {
  return (
    <group>
      <mesh position={[0.15, 0.05, 0.001]}>
        <circleGeometry args={[0.38, 32]} />
        <meshBasicMaterial color="#B71C1C" transparent opacity={0.7} />
      </mesh>
      <mesh position={[-0.55, -0.3, 0.002]}>
        <planeGeometry args={[0.5, 0.35]} />
        <meshBasicMaterial color="#FF8A80" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.6, 0.4, 0.002]}>
        <circleGeometry args={[0.18, 3]} />
        <meshBasicMaterial color="#FFCDD2" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function LayerContent3D() {
  return (
    <group>
      <mesh position={[0, 0, 0.15]} rotation={[0.4, 0.6, 0]}>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshBasicMaterial color="#FF8F00" wireframe transparent opacity={0.9} />
      </mesh>
      <mesh position={[-0.35, -0.2, 0.08]} rotation={[0.3, 0.8, 0.1]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshBasicMaterial color="#FFD54F" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0.4, 0.25, 0.12]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshBasicMaterial color="#FFF8E1" wireframe transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

const LAYER_CONTENT = [LayerContentVideo, LayerContentText, LayerContentShape, LayerContent3D];

function LayerPlane({ index, def }: { index: number; def: typeof LAYER_DEFS[number] }) {
  const { timeMs } = useCompositionTime();
  const groupRef = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null!);
  const edgeMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const t = timeMs / 1000;

  const entranceProgress = Math.min(1, Math.max(0, (timeMs - def.entranceMs) / 600));
  const eased = 1 - Math.pow(1 - entranceProgress, 3);

  const highlightDuration = 600;
  const highlightProgress = Math.min(1, Math.max(0, (timeMs - def.highlightMs) / highlightDuration));
  const highlightPeak = highlightProgress < 0.5
    ? highlightProgress * 2
    : 2 - highlightProgress * 2;
  const isHighlighted = timeMs >= def.highlightMs && timeMs < def.highlightMs + highlightDuration;

  const yFloat = Math.sin(t * 0.8 + index * 2.0) * 0.04;
  const zSpacing = 1.0;
  const zOffset = (index - 1.5) * zSpacing;
  const xSpread = (index - 1.5) * 0.15;

  const ContentComponent = LAYER_CONTENT[index] ?? LayerContentVideo;

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(
      xSpread,
      yFloat + (1 - eased) * 4,
      zOffset,
    );
    groupRef.current.rotation.y = (1 - eased) * 0.8 + Math.sin(t * 0.25 + index) * 0.015;
    const s = eased * (isHighlighted ? 1.0 + highlightPeak * 0.06 : 1.0);
    groupRef.current.scale.setScalar(s);

    if (matRef.current) {
      matRef.current.opacity = eased * (isHighlighted ? 0.95 : 0.88);
      matRef.current.emissiveIntensity = isHighlighted ? highlightPeak * 0.3 : 0;
    }
    if (edgeMatRef.current) {
      edgeMatRef.current.opacity = eased * (isHighlighted ? 0.9 : 0.25);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[2.6, 1.5]} />
        <meshPhysicalMaterial
          ref={matRef}
          color={def.color}
          emissive={def.color}
          emissiveIntensity={0}
          transparent
          opacity={0.88}
          roughness={0.35}
          metalness={0.02}
          clearcoat={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.0005]}>
        <planeGeometry args={[2.64, 1.54]} />
        <meshBasicMaterial
          ref={edgeMatRef}
          color="#ffffff"
          transparent
          opacity={0.25}
          wireframe
          side={THREE.DoubleSide}
        />
      </mesh>
      <ContentComponent />
    </group>
  );
}

function LayersCamera() {
  const { timeMs, durationMs } = useCompositionTime();
  const { camera } = useThree();

  useFrame(() => {
    const progress = durationMs > 0 ? timeMs / durationMs : 0;
    const angle = 0.35 + progress * 0.55;
    const distance = 7.5 - progress * 1.2;
    const yPos = 1.8 - progress * 1.0;
    camera.position.set(
      Math.sin(angle) * distance,
      yPos,
      Math.cos(angle) * distance,
    );
    camera.lookAt(0, 0, 0.3);
  });

  return null;
}

function SceneLayers() {
  const d = DUR.layers;
  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <Audio src={AUDIO_SRC.layers} />
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 80% 70% at 50% 45%, rgba(21,101,192,0.08) 0%, transparent 70%)",
      }} />
      <CompositionCanvas
        camera={{ position: [3, 1.8, 7], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-3, 2, 4]} intensity={0.4} color="#FFB300" />
        <pointLight position={[3, -1, -2]} intensity={0.2} color="#1565C0" />
        <LayersCamera />
        {LAYER_DEFS.map((def, i) => (
          <LayerPlane key={i} index={i} def={def} />
        ))}
      </CompositionCanvas>
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-8 left-8 text-white/40 text-xs font-mono uppercase tracking-[0.3em]"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "300ms" }}
        >
          composable layers
        </div>
        <div className="absolute bottom-16 left-8 flex gap-4">
          {LAYER_DEFS.map((def) => (
            <div
              key={def.label}
              className="flex items-center gap-2"
              style={{
                animation: "hero-fade-in 400ms ease-out both",
                animationDelay: `${def.entranceMs + 200}ms`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: def.hex }} />
              <span className="text-[11px] font-mono text-white/60 uppercase tracking-wide">{def.label}</span>
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

  const featured = [
    { name: "Sarah Chen", stat: "2,847", label: "commits", accent: "var(--poster-red)" },
    { name: "Marcus Johnson", stat: "384", label: "hours listened", accent: "var(--poster-blue)" },
    { name: "Alex Rivera", stat: "12.4k", label: "photos shared", accent: "var(--poster-gold)" },
  ];

  const cascade = [
    { name: "Priya Patel", stat: "1,203", label: "miles run", accent: "var(--poster-green)" },
    { name: "James Liu", stat: "47", label: "countries visited", accent: "var(--poster-pink)" },
    { name: "Emma Wilson", stat: "892", label: "recipes tried", accent: "var(--poster-red)" },
    { name: "David Kim", stat: "5.2k", label: "songs played", accent: "var(--poster-blue)" },
    { name: "Sofia Garcia", stat: "163", label: "books finished", accent: "var(--poster-gold)" },
    { name: "Liam O'Brien", stat: "3,411", label: "photos taken", accent: "var(--poster-green)" },
    { name: "Aisha Mohammed", stat: "728", label: "workouts done", accent: "var(--poster-pink)" },
    { name: "Tom Nakamura", stat: "94", label: "PRs merged", accent: "var(--poster-red)" },
    { name: "Clara Johansson", stat: "2.1k", label: "messages sent", accent: "var(--poster-blue)" },
    { name: "Ryan Torres", stat: "456", label: "goals scored", accent: "var(--poster-gold)" },
    { name: "Mei Zhang", stat: "1,847", label: "sketches drawn", accent: "var(--poster-green)" },
    { name: "Noah Brown", stat: "612", label: "flights taken", accent: "var(--poster-pink)" },
  ];

  const cardHoldMs = 1000;
  const cardFadeMs = 250;
  const cardTotalMs = cardFadeMs + cardHoldMs + cardFadeMs;
  const cascadeStartMs = 3 * (cardHoldMs + cardFadeMs) + 400;
  const cascadeCardMs = 120;

  const counterSteps = [
    { value: "3", delay: cascadeStartMs },
    { value: "27", delay: cascadeStartMs + 200 },
    { value: "148", delay: cascadeStartMs + 400 },
    { value: "1,024", delay: cascadeStartMs + 700 },
    { value: "4,519", delay: cascadeStartMs + 1000 },
    { value: "10,000", delay: cascadeStartMs + 1300 },
  ];

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <Audio src={AUDIO_SRC.template} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Year watermark */}
        <div
          className="text-white/[0.04] text-[180px] font-black leading-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{ animation: "hero-fade-in 660ms ease-out both", animationDelay: "0ms" }}
        >
          2024
        </div>

        {/* Featured cards with surfaces */}
        <div className="relative" style={{ width: 340, height: 200 }}>
          {featured.map((review, i) => {
            const startMs = i * (cardHoldMs + cardFadeMs) + 400;
            return (
              <div
                key={review.name}
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{
                  opacity: 0,
                  animation: `hero-card-lifecycle ${cardTotalMs}ms ease both`,
                  animationDelay: `${startMs}ms`,
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                  backdropFilter: "blur(4px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <div className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-mono absolute top-3 left-4">Your Year in Review</div>
                <div className="text-white/50 text-sm font-mono mb-2">{review.name}</div>
                <div className="text-5xl font-black mb-1" style={{ color: review.accent }}>
                  {review.stat}
                </div>
                <div className="text-white/40 text-xs uppercase tracking-wider">{review.label}</div>
                <div className="text-white/10 text-[10px] font-mono absolute bottom-3 right-4">2024</div>
              </div>
            );
          })}
        </div>

        {/* Rapid cascade — many small cards streaming upward */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{
          opacity: 0,
          animation: `hero-fade-in 200ms ease both, hero-fade-out 400ms ease both`,
          animationDelay: `${cascadeStartMs}ms, ${cascadeStartMs + 1600}ms`,
        }}>
          {cascade.map((card, i) => {
            const col = i % 4;
            const xPositions = [12, 30, 55, 76];
            const x = xPositions[col];
            const stagger = i * cascadeCardMs;
            return (
              <div
                key={card.name}
                className="absolute flex flex-col items-center justify-center"
                style={{
                  width: 160,
                  height: 100,
                  left: `${x}%`,
                  top: "50%",
                  opacity: 0,
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)",
                  animation: `hero-cascade-card 600ms ease both`,
                  animationDelay: `${cascadeStartMs + stagger}ms`,
                }}
              >
                <div className="text-white/40 text-[9px] font-mono mb-1">{card.name}</div>
                <div className="text-xl font-black" style={{ color: card.accent }}>{card.stat}</div>
                <div className="text-white/30 text-[8px] uppercase tracking-wider">{card.label}</div>
              </div>
            );
          })}
        </div>

        {/* Counter ticking up */}
        <div className="absolute top-[72px] right-12 text-right">
          {counterSteps.map((step, i) => (
            <div
              key={step.value}
              className="absolute right-0 top-0 flex flex-col items-end"
              style={{
                opacity: 0,
                animation: i === counterSteps.length - 1
                  ? `hero-counter-final 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both`
                  : `hero-counter-step 200ms ease both`,
                animationDelay: `${step.delay}ms`,
              }}
            >
              <div className="text-white/20 text-[9px] font-mono uppercase tracking-wider mb-1">Videos generated</div>
              <div className="text-3xl font-black tabular-nums" style={{
                color: i === counterSteps.length - 1 ? "var(--poster-gold)" : "rgba(255,255,255,0.5)",
              }}>
                {step.value}
              </div>
            </div>
          ))}
        </div>

        {/* Command line */}
        <div
          className="absolute bottom-20 inset-x-8 flex items-center justify-center"
          style={{ animation: "hero-slide-up-decel 330ms ease-out both", animationDelay: "200ms" }}
        >
          <div className="bg-white/5 border border-white/10 px-4 py-2 font-mono text-xs text-white/50 flex items-center gap-2" style={{ borderRadius: 4 }}>
            <span className="text-[var(--poster-gold)]">$</span>
            <span>editframe render --data users.json --template year-in-review</span>
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

  // Timeline (ms from scene start):
  // 0-400      heading fades in
  // 600        Cloud label appears
  // 800-2800   Cloud 4 segments fill (staggered starts, staggered completions)
  // 2900       Cloud row flash
  // 3200       Browser label + bar appear
  // 3300-5100  Browser bar fills
  // 5200       Browser done + row flash
  // 4400       CLI label + bar appear
  // 4500-6300  CLI bar fills
  // 6400       CLI done + row flash
  // 6600       All-done glow pulse on panel
  // 7000       "One composition -> every target" tagline slides in
  // 8600       Scene starts to fade out (d - OVERLAP)

  const cloudSegments = [
    { label: "Seg 1", delay: 800,  duration: 1200 },
    { label: "Seg 2", delay: 1000, duration: 1500 },
    { label: "Seg 3", delay: 1200, duration: 1000 },
    { label: "Seg 4", delay: 1400, duration: 1400 },
  ];

  const cloudDoneMs = 2800;
  const browserAppear = 3200;
  const browserFillDur = 1900;
  const browserDoneMs = browserAppear + browserFillDur;
  const cliAppear = 4400;
  const cliFillDur = 1900;
  const cliDoneMs = cliAppear + cliFillDur;
  const allDoneMs = cliDoneMs + 200;
  const taglineMs = 7000;

  const renderRow = (
    color: string,
    label: string,
    appearMs: number,
    fillDur: number,
    doneMs: number,
  ) => (
    <div className="relative">
      <div
        className="text-xs font-mono text-white/50 mb-2 flex items-center gap-2"
        style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: `${appearMs}ms` }}
      >
        <span className="w-2 h-2" style={{ background: `var(--poster-${color})` }} />
        {label}
      </div>
      <div
        className="h-9 bg-white/[0.03] border border-white/10 relative overflow-hidden"
        style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: `${appearMs}ms` }}
      >
        {/* Fill bar */}
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{
          background: `var(--poster-${color})`, opacity: 0.4,
          animation: `hero-progress-spring ${fillDur}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
          animationDelay: `${appearMs + 100}ms`,
          ["--bar-target" as string]: "100%",
        }}>
          {/* Shimmer overlay while filling */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
            animation: `hero-bar-shimmer 800ms ease-in-out ${Math.ceil(fillDur / 800)}`,
            animationDelay: `${appearMs + 100}ms`,
            animationFillMode: "both",
          }} />
        </div>
        {/* Checkmark with pop */}
        <svg
          className="absolute top-1.5 right-1.5 w-3.5 h-3.5"
          style={{ color: `var(--poster-${color})`, animation: `hero-check-pop 330ms ease-out both`, animationDelay: `${doneMs}ms` }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M5 12l5 5L20 7" style={{
            strokeDasharray: 24,
            animation: `hero-check-draw 264ms ease-out both`,
            animationDelay: `${doneMs + 132}ms`,
          }} />
        </svg>
      </div>
      {/* Row completion flash */}
      <div className="absolute inset-0 rounded pointer-events-none" style={{
        background: `var(--poster-${color})`,
        animation: `hero-render-row-flash 500ms ease-out both`,
        animationDelay: `${doneMs + 100}ms`,
      }} />
    </div>
  );

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>
      <Audio src={AUDIO_SRC.render} />
      <div className="absolute inset-0 flex flex-col justify-center px-12 gap-5">
        {/* Heading */}
        <div
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30"
          style={{ animation: "hero-fade-in 330ms ease-out both", animationDelay: "200ms" }}
        >
          scalable rendering
        </div>

        {/* Render panel with all-done glow */}
        <div className="flex flex-col gap-5 rounded-lg p-1" style={{
          animation: `hero-render-done-glow 800ms ease-out both`,
          animationDelay: `${allDoneMs}ms`,
        }}>
          {/* Cloud: parallel segments with staggered starts */}
          <div className="relative">
            <div
              className="text-xs font-mono text-white/50 mb-2 flex items-center gap-2"
              style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "600ms" }}
            >
              <span className="w-2 h-2 bg-[var(--poster-green)]" />
              Cloud, parallel
            </div>
            <div
              className="flex gap-1"
              style={{ animation: "hero-fade-in 264ms ease-out both", animationDelay: "600ms" }}
            >
              {cloudSegments.map((seg) => {
                const segDone = seg.delay + seg.duration;
                return (
                  <div key={seg.label} className="flex-1 h-9 bg-white/[0.03] border border-white/10 relative overflow-hidden">
                    {/* Fill */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        background: "var(--poster-green)",
                        opacity: 0.4,
                        animation: `hero-progress-spring ${seg.duration}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                        animationDelay: `${seg.delay}ms`,
                        ["--bar-target" as string]: "100%",
                      }}
                    >
                      <div className="absolute inset-0" style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                        animation: `hero-bar-shimmer 600ms ease-in-out ${Math.ceil(seg.duration / 600)}`,
                        animationDelay: `${seg.delay}ms`,
                        animationFillMode: "both",
                      }} />
                    </div>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white/40">{seg.label}</span>
                    {/* Checkmark */}
                    <svg
                      className="absolute top-1.5 right-1.5 w-3 h-3 text-[var(--poster-green)]"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ animation: `hero-check-pop 330ms ease-out both`, animationDelay: `${segDone}ms` }}
                    >
                      <path d="M5 12l5 5L20 7" style={{
                        strokeDasharray: 24,
                        animation: `hero-check-draw 264ms ease-out both`,
                        animationDelay: `${segDone + 132}ms`,
                      }} />
                    </svg>
                  </div>
                );
              })}
            </div>
            {/* Cloud row flash */}
            <div className="absolute inset-0 rounded pointer-events-none" style={{
              background: "var(--poster-green)",
              animation: `hero-render-row-flash 500ms ease-out both`,
              animationDelay: `${cloudDoneMs + 100}ms`,
            }} />
          </div>

          {/* Browser */}
          {renderRow("blue", "Browser", browserAppear, browserFillDur, browserDoneMs)}

          {/* CLI */}
          {renderRow("red", "CLI", cliAppear, cliFillDur, cliDoneMs)}
        </div>

        {/* Closing tagline */}
        <div
          className="flex items-center justify-center gap-3 mt-2"
          style={{
            animation: `hero-render-tagline-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both`,
            animationDelay: `${taglineMs}ms`,
          }}
        >
          <span className="text-sm font-mono text-white/70 tracking-wide">
            One composition
          </span>
          <span className="text-white/20 font-mono">&rarr;</span>
          <span className="text-sm font-mono text-white/70 tracking-wide">
            every target
          </span>
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
