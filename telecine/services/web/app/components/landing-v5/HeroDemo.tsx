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
  title: 3333,    // voice 2.35s + buffer
  author: 6333,   // voice 5.30s + buffer
  layers: 7067,   // voice 6.06s + buffer
  timeline: 9767,  // voice 8.74s + buffer
  editor: 8200,   // voice 7.18s + buffer
  template: 5500,  // voice 4.45s + buffer
  stream: 5700,   // voice 4.70s + buffer
  render: 8833,   // voice 7.81s + buffer
} as const;

function sceneStyle(durationMs: number): React.CSSProperties {
  return {
    animation: `hero-fade-in ${OVERLAP_MS}ms ease-out both, hero-fade-out ${OVERLAP_MS}ms ease-in both`,
    animationDelay: `0ms, ${durationMs - OVERLAP_MS}ms`,
  };
}

/* ━━ Global word-level caption data (timestamps from single voiceover track) ━━ */
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

const CAPTIONS: CaptionGroup[] = [
  { showMs: 0, hideMs: 2620, words: [
    { w: "Video", s: 0, e: 1020 }, { w: "is", s: 1020, e: 1220 }, { w: "a", s: 1220, e: 1340 }, { w: "web", s: 1340, e: 1440 }, { w: "page", s: 1440, e: 1780 }, { w: "that", s: 1780, e: 1920 }, { w: "moves.", s: 1920, e: 2220 },
  ] },
  { showMs: 2680, hideMs: 5000, words: [
    { w: "It", s: 2680, e: 2900 }, { w: "starts", s: 2900, e: 3100 }, { w: "with", s: 3100, e: 3380 }, { w: "HTML", s: 3380, e: 3820 }, { w: "and", s: 3820, e: 4200 }, { w: "CSS.", s: 4200, e: 4600 },
  ] },
  { showMs: 5360, hideMs: 7960, words: [
    { w: "When", s: 5360, e: 5640 }, { w: "you", s: 5640, e: 5760 }, { w: "need", s: 5760, e: 5900 }, { w: "more,", s: 5900, e: 6180 }, { w: "it's", s: 6480, e: 6700 }, { w: "just", s: 6700, e: 6940 }, { w: "React.", s: 6940, e: 7560 },
  ] },
  { showMs: 8320, hideMs: 10700, words: [
    { w: "Stack", s: 8320, e: 8640 }, { w: "layers", s: 8640, e: 9020 }, { w: "the", s: 9020, e: 9280 }, { w: "way", s: 9280, e: 9440 }, { w: "you", s: 9440, e: 9560 }, { w: "stack", s: 9560, e: 9900 }, { w: "divs.", s: 9900, e: 10520 },
  ] },
  { showMs: 10700, hideMs: 12940, words: [
    { w: "Video,", s: 10700, e: 11060 }, { w: "text,", s: 11280, e: 11440 }, { w: "shapes,", s: 11800, e: 12080 }, { w: "3D,", s: 12340, e: 12740 },
  ] },
  { showMs: 12940, hideMs: 13940, words: [
    { w: "mix", s: 12940, e: 13060 }, { w: "everything.", s: 13060, e: 13540 },
  ] },
  { showMs: 14240, hideMs: 15480, words: [
    { w: "Need", s: 14240, e: 14680 }, { w: "an", s: 14680, e: 14840 }, { w: "editor?", s: 14840, e: 15080 },
  ] },
  { showMs: 15800, hideMs: 17580, words: [
    { w: "Snap", s: 15800, e: 16000 }, { w: "together", s: 16000, e: 16380 }, { w: "GUI", s: 16380, e: 16740 }, { w: "primitives.", s: 16740, e: 17180 },
  ] },
  { showMs: 17740, hideMs: 20200, words: [
    { w: "Timeline,", s: 17740, e: 18240 }, { w: "waveforms,", s: 18640, e: 19340 }, { w: "captions,", s: 19500, e: 19800 },
  ] },
  { showMs: 20200, hideMs: 22620, words: [
    { w: "into", s: 20200, e: 20380 }, { w: "any", s: 20380, e: 20760 }, { w: "editing", s: 20760, e: 21060 }, { w: "experience", s: 21060, e: 21500 }, { w: "you", s: 21500, e: 21920 }, { w: "want.", s: 21920, e: 22220 },
  ] },
  { showMs: 22980, hideMs: 24380, words: [
    { w: "A", s: 22980, e: 23160 }, { w: "full", s: 23160, e: 23420 }, { w: "NLE.", s: 23420, e: 23980 },
  ] },
  { showMs: 24540, hideMs: 26500, words: [
    { w: "A", s: 24540, e: 24740 }, { w: "simple", s: 24740, e: 25000 }, { w: "trim", s: 25000, e: 25260 }, { w: "tool", s: 25260, e: 25560 }, { w: "in", s: 25560, e: 25780 }, { w: "a", s: 25780, e: 25920 }, { w: "form.", s: 25920, e: 26180 },
  ] },
  { showMs: 26500, hideMs: 27840, words: [
    { w: "It's", s: 26500, e: 26700 }, { w: "your", s: 26700, e: 27000 }, { w: "UI.", s: 27000, e: 27440 },
  ] },
  { showMs: 28050, hideMs: 29920, words: [
    { w: "These", s: 28050, e: 28380 }, { w: "are", s: 28380, e: 28560 }, { w: "just", s: 28560, e: 28720 }, { w: "the", s: 28720, e: 28880 }, { w: "building", s: 28880, e: 29100 }, { w: "blocks.", s: 29100, e: 29520 },
  ] },
  { showMs: 30240, hideMs: 34420, words: [
    { w: "Feed", s: 30240, e: 30560 }, { w: "in", s: 30560, e: 30720 }, { w: "data", s: 30720, e: 31020 }, { w: "and", s: 31020, e: 31440 }, { w: "one", s: 31440, e: 31660 }, { w: "template", s: 31660, e: 31960 }, { w: "becomes", s: 31960, e: 32340 }, { w: "10,000", s: 32340, e: 33220 }, { w: "unique", s: 33220, e: 33480 }, { w: "videos.", s: 33480, e: 34020 },
  ] },
  { showMs: 34640, hideMs: 36480, words: [
    { w: "Preview", s: 34640, e: 35240 }, { w: "is", s: 35240, e: 35640 }, { w: "instant.", s: 35640, e: 36080 },
  ] },
  { showMs: 36640, hideMs: 39000, words: [
    { w: "Change", s: 36640, e: 36920 }, { w: "the", s: 36920, e: 37120 }, { w: "code,", s: 37120, e: 37440 }, { w: "see", s: 37900, e: 38140 }, { w: "the", s: 38140, e: 38280 }, { w: "frame.", s: 38280, e: 38600 },
  ] },
  { showMs: 39280, hideMs: 41380, words: [
    { w: "When", s: 39280, e: 39400 }, { w: "it's", s: 39400, e: 39580 }, { w: "ready,", s: 39580, e: 39820 }, { w: "render", s: 40080, e: 40340 }, { w: "to", s: 40340, e: 40560 }, { w: "the", s: 40560, e: 40680 }, { w: "cloud,", s: 40680, e: 41020 },
  ] },
  { showMs: 41380, hideMs: 43800, words: [
    { w: "the", s: 41380, e: 41460 }, { w: "browser,", s: 41460, e: 41820 }, { w: "or", s: 42300, e: 42580 }, { w: "the", s: 42580, e: 42760 }, { w: "command", s: 42760, e: 42980 }, { w: "line.", s: 42980, e: 43400 },
  ] },
  { showMs: 43920, hideMs: 46620, words: [
    { w: "Same", s: 43920, e: 44280 }, { w: "composition,", s: 44280, e: 44820 }, { w: "every", s: 45300, e: 45760 }, { w: "target.", s: 45760, e: 46220 },
  ] },
];

const VOICEOVER_SRC = "https://assets.editframe.com/hero/voiceover-b53ab1ec.mp3";

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

    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 4: Timeline — components snap together to build an editor
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneTimeline() {
  const d = DUR.timeline;

  const tracks = [
    { label: "Video", tag: "<VideoTrack>", color: "var(--poster-blue)", width: "85%", left: "5%" },
    { label: "Caption", tag: "<Captions>", color: "var(--poster-gold)", width: "60%", left: "15%" },
    { label: "Audio", tag: "<Waveform>", color: "var(--poster-green)", width: "90%", left: "2%" },
    { label: "Overlay", tag: "<Overlay>", color: "var(--poster-red)", width: "40%", left: "30%" },
  ];

  const waveformSvgPath = Array.from({ length: 100 }, (_, j) => {
    const t = j / 99;
    const y = Math.sin(t * 12) * 0.3
      + Math.sin(t * 28 + 1.2) * 0.2
      + Math.sin(t * 5.5 + 0.7) * 0.25
      + (Math.sin(t * 60) * 0.1 * Math.sin(t * 3));
    const h = Math.abs(y);
    const x = t * 100;
    return `M${x},${50 - h * 45} L${x},${50 + h * 45}`;
  }).join(" ");

  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>

      <div className="absolute inset-0 flex flex-col" style={{ padding: "12px 24px", gap: "6px" }}>

        {/* Ruler header */}
        <div
          className="flex items-center justify-between"
          style={{
            animation: "hero-fade-in 300ms ease-out both",
            animationDelay: "150ms",
            height: "28px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            paddingBottom: "6px",
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">timeline</div>
          <div className="flex gap-6">
            {["00:00", "00:05", "00:10", "00:15", "00:20"].map((t) => (
              <div key={t} className="text-[10px] font-mono text-white/40">{t}</div>
            ))}
          </div>
        </div>

        {/* Preview — snaps in as first component block */}
        <div className="relative" style={{
          animation: "hero-snap-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          animationDelay: "400ms",
        }}>
          <div className="absolute -top-0.5 left-1 z-10" style={{
            animation: "hero-label-flash 1800ms ease-out both",
            animationDelay: "500ms",
          }}>
            <span className="text-[9px] font-mono text-[var(--poster-gold)]">&lt;Preview&gt;</span>
          </div>
          <div className="border border-white/15 relative overflow-hidden" style={{ height: "150px" }}>
            <div className="absolute inset-0" style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)",
            }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative" style={{ width: "60%", height: "70%" }}>
                <div className="absolute bottom-0 left-0 right-0" style={{
                  height: "40%",
                  background: "linear-gradient(180deg, #1a3a2a 0%, #0d1f16 100%)",
                  opacity: 0.7,
                }} />
                <div className="absolute top-[15%] left-[10%]" style={{
                  width: "35%", height: "45%",
                  background: "linear-gradient(180deg, rgba(21,101,192,0.3) 0%, rgba(15,52,96,0.2) 100%)",
                  borderRadius: "2px",
                }} />
                <div className="absolute bottom-[20%] left-[8%] right-[8%]">
                  <div className="text-[var(--poster-gold)] text-sm font-bold" style={{ opacity: 0.9 }}>Welcome back</div>
                  <div className="text-white/40 text-[9px] font-mono mt-0.5">00:03.12 / 00:20.00</div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.04 }}>
              <div className="w-full" style={{
                height: "30%",
                background: "linear-gradient(180deg, transparent, white, transparent)",
                animation: "hero-scanline 3000ms linear infinite",
                animationDelay: "800ms",
              }} />
            </div>
            <div className="absolute pointer-events-none" style={{
              top: "10%", left: "10%", right: "10%", bottom: "10%",
              border: "1px dashed rgba(255,255,255,0.06)",
            }} />
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-1.5" style={{
              background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
              animation: "hero-fade-in 300ms ease-out both",
              animationDelay: "1000ms",
            }}>
              <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <div className="flex-1 h-0.5 bg-white/10 relative">
                <div className="absolute inset-y-0 left-0 bg-[var(--poster-red)]" style={{
                  animation: "hero-progress-spring 5000ms ease-out both",
                  animationDelay: "2500ms",
                  ["--bar-target" as string]: "65%",
                }} />
              </div>
              <span className="text-[8px] font-mono text-white/40">00:13 / 00:20</span>
            </div>
          </div>
        </div>

        {/* Track list — each row snaps in sequentially like lego bricks */}
        <div className="flex flex-col" style={{ gap: "4px", flex: 1 }}>
          {tracks.map((track, i) => {
            const snapDelay = 900 + i * 180;
            const clipDelay = snapDelay + 400;
            return (
              <div key={track.label} className="relative" style={{
                animation: "hero-snap-in 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
                animationDelay: `${snapDelay}ms`,
              }}>
                <div className="absolute -top-0.5 right-1 z-10" style={{
                  animation: "hero-label-flash 2000ms ease-out both",
                  animationDelay: `${snapDelay + 100}ms`,
                }}>
                  <span className="text-[8px] font-mono text-[var(--poster-gold)]">{track.tag}</span>
                </div>
                <div className="flex items-center gap-2" style={{ height: "36px" }}>
                  <span className="text-[9px] font-mono text-white/50 uppercase" style={{ width: "52px", textAlign: "right" }}>{track.label}</span>
                  <div className="flex-1 h-full bg-white/[0.02] relative border border-white/[0.06]">
                    <div
                      className="absolute top-0 bottom-0"
                      style={{
                        left: track.left,
                        width: track.width,
                        background: `color-mix(in srgb, ${track.color} 18%, transparent)`,
                        borderTop: `1px solid color-mix(in srgb, ${track.color} 50%, transparent)`,
                        borderBottom: `1px solid color-mix(in srgb, ${track.color} 50%, transparent)`,
                        borderLeft: `2px solid color-mix(in srgb, ${track.color} 70%, transparent)`,
                        borderRight: `2px solid color-mix(in srgb, ${track.color} 70%, transparent)`,
                        animation: "hero-reveal-left 350ms cubic-bezier(0.36, 0, 0.66, 1) both",
                        animationDelay: `${clipDelay}ms`,
                      }}
                    >
                      {track.label === "Video" && (
                        <>
                          <div className="absolute inset-0 flex overflow-hidden">
                            {Array.from({ length: 12 }).map((_, j) => (
                              <div key={j} className="flex-1 border-r border-white/[0.04]" style={{
                                background: `linear-gradient(${150 + j * 15}deg, hsl(${215 + j * 4}, 30%, ${9 + j * 1.5}%) 0%, hsl(${220 + j * 6}, 25%, ${12 + j}%) 100%)`,
                              }} />
                            ))}
                          </div>
                          <div className="absolute top-0.5 left-1.5">
                            <span className="text-[7px] font-mono text-white/50">interview_final.mp4</span>
                          </div>
                          <div className="absolute bottom-1 left-[20%] w-1.5 h-1.5 bg-[var(--poster-gold)] rotate-45 opacity-50" />
                          <div className="absolute bottom-1 left-[55%] w-1.5 h-1.5 bg-[var(--poster-gold)] rotate-45 opacity-50" />
                          <div className="absolute bottom-1 left-[78%] w-1.5 h-1.5 bg-[var(--poster-gold)] rotate-45 opacity-50" />
                        </>
                      )}
                      {track.label === "Caption" && (
                        <div className="absolute inset-0 flex items-center px-1 gap-1 overflow-hidden">
                          {[
                            { text: "Hello world", w: "28%" },
                            { text: "Welcome back", w: "32%" },
                            { text: "Your highlights", w: "35%" },
                          ].map((seg, j) => (
                            <div key={j} className="h-[60%] flex items-center justify-center px-1.5" style={{
                              width: seg.w,
                              background: "color-mix(in srgb, var(--poster-gold) 15%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--poster-gold) 25%, transparent)",
                              borderRadius: "2px",
                            }}>
                              <span className="text-[7px] font-mono text-[var(--poster-gold)] whitespace-nowrap opacity-70">{seg.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {track.label === "Audio" && (
                        <div className="absolute inset-0 overflow-hidden">
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" style={{ opacity: 0.5 }}>
                            <path d={waveformSvgPath} stroke="var(--poster-green)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                      {track.label === "Overlay" && (
                        <>
                          <div className="absolute inset-0" style={{
                            background: "linear-gradient(90deg, color-mix(in srgb, var(--poster-red) 30%, transparent), color-mix(in srgb, var(--poster-red) 12%, transparent))",
                          }} />
                          <div className="absolute top-0.5 left-1.5">
                            <span className="text-[7px] font-mono text-white/45">lower_third.html</span>
                          </div>
                        </>
                      )}
                    </div>
                    {[20, 40, 60, 80].map((pct) => (
                      <div key={pct} className="absolute top-0 bottom-0 w-px bg-white/[0.03]" style={{ left: `${pct}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Playhead — snaps in at VO "snap" (~2200ms), then sweeps */}
        <div className="absolute pointer-events-none" style={{ left: "76px", top: "40px", bottom: "12px" }}>
          <div
            className="w-0.5 h-full"
            style={{
              transformOrigin: "top center",
              animation: "hero-playhead-snap 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both, hero-playhead-sweep-fixed 6500ms linear both",
              animationDelay: "2200ms, 2400ms",
              background: "linear-gradient(180deg, white 0%, white 80%, transparent 100%)",
            }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2" style={{
              width: "8px", height: "8px",
              background: "white",
              clipPath: "polygon(0 0, 100% 0, 100% 50%, 50% 100%, 0 50%)",
            }} />
          </div>
        </div>
      </div>

    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 5: Editor — full NLE morphs into compact trim widget
   Phase 1 (0–3.5s): Full editor assembles — preview, filmstrip, trim bar
   Phase 2 (3.5–5.5s): Collapses into a minimal trim-tool-in-a-form
   Phase 3 (5.5–8.4s): Trim handles animate drag, bracket accents
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SceneEditor() {
  const d = DUR.editor;
  const filmstripFrames = Array.from({ length: 20 });
  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>


      {/* ── Phase 1: Full NLE layout (collapses at 3500ms) ── */}
      <div
        className="absolute inset-0 p-5 flex flex-col gap-1.5"
        style={{
          animation: "hero-fade-in 300ms ease-out both, hero-editor-nle-collapse 600ms cubic-bezier(0.4, 0, 0.2, 1) both",
          animationDelay: "200ms, 3500ms",
        }}
      >
        {/* Preview viewport */}
        <div
          className="flex-[1_1_0%] border border-white/15 relative overflow-hidden rounded-sm"
          style={{ animation: "hero-reveal-left 450ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "300ms" }}
        >
          <div className="absolute inset-0" style={{
            background: "linear-gradient(135deg, #0f1b3d 0%, #1a2755 30%, #2a1f5e 60%, #3d1248 100%)",
          }} />
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, white 3px, white 4px)",
            animation: "hero-editor-scanlines 3000ms linear infinite",
            animationDelay: "600ms",
          }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="text-white/20 text-[9px] font-mono uppercase tracking-[0.25em]" style={{
              animation: "hero-fade-in 300ms ease-out both",
              animationDelay: "800ms",
            }}>episode 12</div>
            <div className="text-white text-2xl font-bold tracking-tight" style={{
              animation: "hero-fade-in 400ms ease-out both",
              animationDelay: "1000ms",
            }}>Welcome back</div>
            <div className="text-white/40 text-xs" style={{
              animation: "hero-fade-in 300ms ease-out both",
              animationDelay: "1200ms",
            }}>Season 2 Recap</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div className="h-full bg-[var(--poster-red)]" style={{
              animation: "hero-progress-spring 3000ms ease-out both",
              animationDelay: "1400ms",
              ["--bar-target" as string]: "45%",
            }} />
          </div>
          <div className="absolute bottom-2 left-3 flex items-center gap-2" style={{
            animation: "hero-fade-in 250ms ease-out both",
            animationDelay: "1400ms",
          }}>
            <svg className="w-3.5 h-3.5 text-white/50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            <span className="text-[9px] font-mono text-white/35">00:03.12</span>
          </div>
          <div className="absolute bottom-2 right-3 text-[9px] font-mono text-white/25" style={{
            animation: "hero-fade-in 250ms ease-out both",
            animationDelay: "1600ms",
          }}>00:12.48</div>
        </div>

        {/* Filmstrip — continuous scrub */}
        <div
          className="h-11 relative overflow-hidden rounded-sm"
          style={{ animation: "hero-reveal-bottom 350ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "1200ms" }}
        >
          <div className="absolute inset-0 flex gap-px" style={{
            animation: "hero-editor-filmstrip-scrub 4000ms ease-in-out both",
            animationDelay: "1600ms",
          }}>
            {filmstripFrames.map((_, i) => {
              const hue = 220 + i * 8 + (i > 10 ? (i - 10) * 6 : 0);
              const sat = 30 + (i % 5) * 8;
              const lightBase = 12 + i * 1.5;
              const hasHighlight = i === 5 || i === 12 || i === 16;
              return (
                <div
                  key={i}
                  className="flex-shrink-0 relative overflow-hidden"
                  style={{
                    width: 48,
                    height: "100%",
                    background: `linear-gradient(${120 + i * 15}deg, hsl(${hue}, ${sat}%, ${lightBase}%) 0%, hsl(${hue + 20}, ${sat + 10}%, ${lightBase + 6}%) 100%)`,
                  }}
                >
                  {hasHighlight && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-3 rounded-sm bg-white/[0.08] border border-white/10" />
                    </div>
                  )}
                  {i === 8 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white/15 text-[7px] font-mono">CUT</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/40" style={{
            animation: "hero-fade-in 200ms ease-out both, hero-editor-scrub-indicator 4000ms ease-in-out both",
            animationDelay: "1800ms, 1800ms",
          }} />
        </div>

        {/* Timeline trim bar */}
        <div
          className="h-9 relative rounded-sm"
          style={{ animation: "hero-reveal-right 350ms cubic-bezier(0.36, 0, 0.66, 1) both", animationDelay: "1800ms" }}
        >
          <div className="absolute inset-0 bg-white/[0.03] border border-white/10 rounded-sm" />
          <div
            className="absolute top-0 bottom-0 border-2 border-[var(--poster-gold)] rounded-sm"
            style={{
              left: "12%",
              right: "30%",
              animation: "hero-editor-trim-settle 800ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
              animationDelay: "2200ms",
            }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--poster-gold)] -translate-x-full rounded-l-sm" />
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[var(--poster-gold)] translate-x-full rounded-r-sm" />
            <div className="absolute inset-0 bg-[var(--poster-gold)]/[0.04]" />
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{
            left: "35%",
            animation: "hero-fade-in 150ms ease-out both, hero-editor-playhead-tick 2000ms ease-in-out both",
            animationDelay: "2600ms, 2600ms",
          }} />
        </div>
      </div>

      {/* Phase 1 component labels */}
      <div
        className="absolute top-2 left-5 right-5 flex justify-between items-center"
        style={{
          animation: "hero-fade-in 250ms ease-out both, hero-editor-nle-collapse 600ms cubic-bezier(0.4, 0, 0.2, 1) both",
          animationDelay: "150ms, 3500ms",
        }}
      >
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/25" style={{
          animation: "hero-fade-in 300ms ease-out both",
          animationDelay: "150ms",
        }}>full nle</div>
        <div className="flex gap-2">
          {[
            { label: "<Preview>", delay: 500 },
            { label: "<Filmstrip>", delay: 1300 },
            { label: "<TrimHandles>", delay: 1900 },
          ].map((c, i) => (
            <span
              key={i}
              className="text-[8px] font-mono text-white/20 px-1.5 py-0.5 border border-white/[0.08] rounded-sm"
              style={{
                animation: "hero-slide-up-decel 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
                animationDelay: `${c.delay}ms`,
              }}
            >{c.label}</span>
          ))}
        </div>
      </div>

      {/* ── Phase 2: Compact trim-tool-in-a-form ── */}
      <div
        className="absolute inset-0 flex items-center justify-center px-16"
        style={{
          animation: "hero-editor-form-enter 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          animationDelay: "3800ms",
        }}
      >
        <div className="w-full max-w-[520px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/25" style={{
              animation: "hero-fade-in 300ms ease-out both",
              animationDelay: "4000ms",
            }}>trim clip</span>
            <span className="text-[8px] font-mono text-white/15" style={{
              animation: "hero-fade-in 300ms ease-out both",
              animationDelay: "4200ms",
            }}>00:02.10 – 00:08.44</span>
          </div>

          {/* Compact filmstrip with trim overlay */}
          <div className="h-10 relative overflow-hidden rounded border border-white/10 mb-1.5" style={{
            animation: "hero-fade-in 300ms ease-out both",
            animationDelay: "4000ms",
          }}>
            <div className="absolute inset-0 flex gap-px">
              {Array.from({ length: 14 }).map((_, i) => {
                const hue = 220 + i * 10 + (i > 7 ? (i - 7) * 6 : 0);
                return (
                  <div
                    key={i}
                    className="flex-1"
                    style={{
                      background: `linear-gradient(${130 + i * 14}deg, hsl(${hue}, 35%, ${13 + i * 1.2}%) 0%, hsl(${hue + 15}, 30%, ${17 + i}%) 100%)`,
                    }}
                  />
                );
              })}
            </div>
            <div
              className="absolute top-0 bottom-0 border-2 border-[var(--poster-gold)] rounded-sm"
              style={{
                animation: "hero-editor-trim-drag 2500ms cubic-bezier(0.4, 0, 0.2, 1) both",
                animationDelay: "5500ms",
                left: "18%",
                right: "25%",
              }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--poster-gold)] -translate-x-full rounded-l-sm flex items-center justify-center">
                <div className="w-px h-3 bg-black/30" />
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[var(--poster-gold)] translate-x-full rounded-r-sm flex items-center justify-center">
                <div className="w-px h-3 bg-black/30" />
              </div>
              <div className="absolute inset-0 bg-[var(--poster-gold)]/[0.06]" />
            </div>
            <div className="absolute top-0 bottom-0 left-0 bg-black/50" style={{
              width: "18%",
              animation: "hero-fade-in 300ms ease-out both",
              animationDelay: "4200ms",
            }} />
            <div className="absolute top-0 bottom-0 right-0 bg-black/50" style={{
              width: "25%",
              animation: "hero-fade-in 300ms ease-out both",
              animationDelay: "4200ms",
            }} />
          </div>

          {/* Form-style time inputs */}
          <div className="flex items-center gap-3 mt-2" style={{
            animation: "hero-fade-in 300ms ease-out both",
            animationDelay: "4400ms",
          }}>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-white/20 uppercase">in</span>
              <div className="px-2 py-1 bg-white/[0.04] border border-white/10 rounded text-[9px] font-mono text-white/50">00:02.10</div>
            </div>
            <div className="flex-1 h-px bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-white/20 uppercase">out</span>
              <div className="px-2 py-1 bg-white/[0.04] border border-white/10 rounded text-[9px] font-mono text-white/50" style={{
                animation: "hero-editor-time-update 2500ms step-end both",
                animationDelay: "5500ms",
              }}>00:08.44</div>
            </div>
          </div>

          {/* Component tags for form mode */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {[
              { label: "<Filmstrip>", delay: 4600 },
              { label: "<TrimHandles>", delay: 4800 },
            ].map((c, i) => (
              <span
                key={i}
                className="text-[8px] font-mono text-white/15 px-1.5 py-0.5 border border-white/[0.06] rounded-sm"
                style={{
                  animation: "hero-slide-up-decel 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
                  animationDelay: `${c.delay}ms`,
                }}
              >{c.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Phase 3: corner brackets — "building blocks" accent ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          animation: "hero-fade-in 400ms ease-out both",
          animationDelay: "6800ms",
        }}
      >
        <div className="absolute top-[28%] left-[12%] w-4 h-4 border-t border-l border-white/10" style={{
          animation: "hero-editor-bracket-pulse 1200ms ease-in-out both",
          animationDelay: "7000ms",
        }} />
        <div className="absolute top-[28%] right-[12%] w-4 h-4 border-t border-r border-white/10" style={{
          animation: "hero-editor-bracket-pulse 1200ms ease-in-out both",
          animationDelay: "7100ms",
        }} />
        <div className="absolute bottom-[28%] left-[12%] w-4 h-4 border-b border-l border-white/10" style={{
          animation: "hero-editor-bracket-pulse 1200ms ease-in-out both",
          animationDelay: "7200ms",
        }} />
        <div className="absolute bottom-[28%] right-[12%] w-4 h-4 border-b border-r border-white/10" style={{
          animation: "hero-editor-bracket-pulse 1200ms ease-in-out both",
          animationDelay: "7300ms",
        }} />
      </div>


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

    </Timegroup>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scene 7: Stream — fast pipeline: code → frames → preview
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const STREAM_LANES = 5;
const STREAM_PER_LANE = 14;
const STREAM_COUNT = STREAM_LANES * STREAM_PER_LANE;

function StreamParticles() {
  const { timeMs, durationMs } = useCompositionTime();
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useRef(new THREE.Object3D()).current;

  useFrame(() => {
    if (!meshRef.current) return;
    const t = durationMs > 0 ? timeMs / durationMs : 0;
    const entranceT = Math.min(t * 5, 1);

    for (let i = 0; i < STREAM_COUNT; i++) {
      const lane = i % STREAM_LANES;
      const idx = Math.floor(i / STREAM_LANES);

      const stagger = lane * 0.04 + idx * 0.02;
      const particleEntrance = Math.min(Math.max((entranceT - stagger) * 6, 0), 1);

      const speed = 2.8 + (lane % 3) * 0.6;
      const offset = idx / STREAM_PER_LANE + lane * 0.11;
      const progress = (t * speed + offset) % 1;

      const x = -5.5 + progress * 11;
      const laneY = (lane - (STREAM_LANES - 1) / 2) * 0.42;
      const y = laneY + Math.sin(progress * Math.PI * 6 + offset * 8) * 0.03;
      const z = (lane - 2) * 0.12;

      const fadeIn = Math.min(progress * 10, 1);
      const fadeOut = Math.min((1 - progress) * 10, 1);
      const alpha = fadeIn * fadeOut * particleEntrance;

      const baseScale = 0.035 + (lane === 2 ? 0.015 : 0);
      const scale = baseScale * alpha;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, STREAM_COUNT]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshPhysicalMaterial
        color="#FFB300"
        emissive="#FFB300"
        emissiveIntensity={0.9}
        roughness={0.2}
        metalness={0.7}
      />
    </instancedMesh>
  );
}

function StreamLaneLines() {
  const { timeMs, durationMs } = useCompositionTime();
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!groupRef.current) return;
    const t = durationMs > 0 ? timeMs / durationMs : 0;
    const opacity = Math.min(t * 6, 1) * 0.07;
    groupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: STREAM_LANES }).map((_, i) => {
        const y = (i - (STREAM_LANES - 1) / 2) * 0.42;
        return (
          <mesh key={i} position={[0, y, -0.1]}>
            <planeGeometry args={[11, 0.004]} />
            <meshBasicMaterial color="#FFB300" transparent opacity={0} />
          </mesh>
        );
      })}
    </group>
  );
}

function StreamCamera() {
  const { timeMs, durationMs } = useCompositionTime();
  const { camera } = useThree();

  useFrame(() => {
    const t = durationMs > 0 ? timeMs / durationMs : 0;
    const ease = t * t * (3 - 2 * t);
    camera.position.set(0, 0.1 + ease * 0.15, 6.2 - ease * 0.2);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function SceneStream() {
  const d = DUR.stream;
  return (
    <Timegroup mode="fixed" duration={`${d}ms`} className="relative" style={{ ...sceneStyle(d), width: 960, height: 540, background: "#0a0a0a" }}>

      <CompositionCanvas
        camera={{ position: [0, 0.1, 6.2], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 2, 3]} intensity={0.8} color="#FFB300" />
        <pointLight position={[-5, 1, 2]} intensity={0.3} color="#4FC3F7" />
        <StreamCamera />
        <StreamLaneLines />
        <StreamParticles />
      </CompositionCanvas>

      <div className="absolute inset-0 pointer-events-none">
        {/* Source: code icon */}
        <div
          className="absolute top-1/2 left-5 -translate-y-1/2 flex flex-col items-center gap-1.5"
          style={{ animation: "hero-fade-in 200ms ease-out both", animationDelay: "100ms" }}
        >
          <div
            className="w-8 h-8 rounded border border-[var(--poster-gold)]/40 flex items-center justify-center"
            style={{ animation: "hero-stream-source-pulse 1400ms ease-in-out infinite" }}
          >
            <span className="text-[var(--poster-gold)] text-xs font-mono">&lt;/&gt;</span>
          </div>
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">src</span>
        </div>

        {/* Destination: preview icon */}
        <div
          className="absolute top-1/2 right-5 -translate-y-1/2 flex flex-col items-center gap-1.5"
          style={{ animation: "hero-stream-arrive 350ms ease-out both", animationDelay: "500ms" }}
        >
          <div className="w-8 h-8 rounded border border-white/20 flex items-center justify-center bg-white/5">
            <span className="text-white/70 text-[10px] font-mono">&#9654;</span>
          </div>
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">preview</span>
        </div>

        {/* Top-left label */}
        <div
          className="absolute top-7 left-8 text-[10px] font-mono uppercase tracking-[0.3em] text-white/50"
          style={{ animation: "hero-fade-in 200ms ease-out both", animationDelay: "80ms" }}
        >
          jit streaming
        </div>

        {/* Live indicator */}
        <div
          className="absolute top-7 right-8 flex items-center gap-2"
          style={{ animation: "hero-fade-in 200ms ease-out both", animationDelay: "250ms" }}
        >
          <div className="w-2 h-2 rounded-full bg-[var(--poster-green)]" style={{
            animation: "hero-cursor-blink 700ms ease-in-out infinite",
          }} />
          <span className="text-[11px] font-mono text-white/70 uppercase tracking-wide font-medium">Live</span>
        </div>

        {/* FPS indicator */}
        <div
          className="absolute bottom-7 right-8 font-mono text-[11px] tabular-nums flex items-center gap-1.5"
          style={{ animation: "hero-fade-in 200ms ease-out both", animationDelay: "400ms" }}
        >
          <span className="text-[var(--poster-green)] font-medium">30fps</span>
          <span className="text-white/25">|</span>
          <span className="text-white/40">0 dropped</span>
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
        <SceneCaptions groups={CAPTIONS} />
      </Timegroup>
    </FitScale>
  );
}

/* ━━ Poster — static first-frame replica shown while the demo loads ━━━━━━ */
export function HeroDemoPoster() {
  return (
    <div className="w-full">
      <div className="bg-[#0a0a0a] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div className="aspect-video relative flex flex-col items-center justify-center" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(21,101,192,0.08) 0%, transparent 70%)",
        }}>
          <span className="text-white text-5xl font-black tracking-tighter leading-[1.1] text-center select-none">
            VIDEO IS A
          </span>
          <span className="text-[var(--poster-gold)] text-7xl font-black tracking-tighter leading-[1.0] text-center select-none">
            WEB PAGE
          </span>
          <span className="text-white/60 text-3xl font-bold tracking-tight leading-[1.2] mt-1 text-center select-none">
            THAT MOVES.
          </span>
        </div>
        <div className="border-t-4 border-[var(--ink-black)] dark:border-white bg-[#111] flex items-center h-12">
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
      </div>
    </div>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(21,101,192,0.08) 0%, transparent 70%)",
            }}>
              <span className="text-white text-5xl font-black tracking-tighter leading-[1.1] text-center select-none">
                VIDEO IS A
              </span>
              <span className="text-[var(--poster-gold)] text-7xl font-black tracking-tighter leading-[1.0] text-center select-none">
                WEB PAGE
              </span>
              <span className="text-white/60 text-3xl font-bold tracking-tight leading-[1.2] mt-1 text-center select-none">
                THAT MOVES.
              </span>
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
