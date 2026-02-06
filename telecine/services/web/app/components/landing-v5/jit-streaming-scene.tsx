// @ts-nocheck - React Three Fiber JSX intrinsics
import * as React from "react";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   JIT STREAMING SCENE

   X-axis layout: Traditional (left) vs Editframe JIT (right).
   Sequential acts — one at a time so the viewer can track the process.

   Phase 1 (0–2.2s):  Hero — the file appears center stage.
   Phase 2 (2.4–4.5s): Question — "How do you stream it?"
                        Laser cut. Two copies slide apart.
   Phase 3 (5–13s):   Traditional (left side, full attention):
                        Upload chunks → service → transcode → variants →
                        serve 1080p to player. Right side: dormant bar.
   Transition (13–14.5s): "What if you didn't need all that?"
                        Left side dims. Camera shifts right.
   Phase 4 (15–25.4s): JIT (right side, full attention):
                        Player sends request beam → ghost variant lights up →
                        proxy fetches source chunk → transcodes → streams to
                        player scrub bar. Repeat × 3, non-sequential segments.
   Phase 5 (26–30s):  Punchline — "Instant playback"

   Total: 30s
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ━━ Sizing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const BAR_W = 3.6;
const BAR_H = 0.20;
const BAR_D = 0.28;
const NUM_SEGS = 6;
const SEG_W = BAR_W / NUM_SEGS;
const SEG_GAP = 0.04;

/* ━━ Layout ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Z-depth layers (camera at +Z looking into -Z direction via tz):
     0.5   source bars (after split)
     3.0   traditional: service copy
     4.5   traditional: transcode box
     6.5   traditional: variant bars / JIT: ghost variant bars
     9.0   traditional: player / JIT: proxy
     12.0  JIT: player
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TRAD_X = -3.2;
const JIT_X = 3.2;
const SERVICE_Z = 3.0;
const TRANSCODE_Z = 4.5;
const VARIANT_Z = 6.5;
const PLAYER_Z = 9.0;
const PROXY_Z = 9.0;
const JIT_PLAYER_Z = 12.0;
const SIDE_Y = 0.3;

/* ━━ Timing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// Phase 1: Hero
const P1_END = 2200;
const P_PULLBACK_START = 1800;
const P_PULLBACK_END = 3500;

// Phase 2: Question + split
const P2_START = 2400;
const P2_SPLIT = 3200;
const P2_END = 4500;

// Phase 3: Traditional (left)
const TRAD_START = 5000;
const TRAD_UPLOAD_END = 8000;
const TRAD_TRANSCODE_START = 8500;
const TRAD_TRANSCODE_END = 10500;
const TRAD_VARIANTS_IN = 11000;
const TRAD_SERVE_START = 11800;
const TRAD_PLAY = 12800;

// Transition
const TRANS_START = 13200;
const TRANS_END = 14500;

// Phase 4: JIT (right)
// Each cycle: request (beam from player → ghost) → fetch (chunk from source → proxy) → stream (proxy → player)
const JIT_START = 15000;
const JIT_GHOST_IN = 15000;
const JIT_PROXY_IN = 15500;
const JIT_PLAYER_IN = 16000;

// Cycle 1: segment 0
const JIT_REQ1_START = 17000;
const JIT_REQ1_END = 17800;
const JIT_FETCH1_START = 17800;
const JIT_FETCH1_END = 18800;
const JIT_STREAM1_START = 19000;
const JIT_STREAM1_END = 19600;
const JIT_PLAY = 19800;

// Cycle 2: segment 4 (non-sequential — skip ahead)
const JIT_REQ2_START = 20400;
const JIT_REQ2_END = 21000;
const JIT_FETCH2_START = 21000;
const JIT_FETCH2_END = 21800;
const JIT_STREAM2_START = 22000;
const JIT_STREAM2_END = 22600;

// Cycle 3: segment 2 (back-fill)
const JIT_REQ3_START = 23200;
const JIT_REQ3_END = 23800;
const JIT_FETCH3_START = 23800;
const JIT_FETCH3_END = 24600;
const JIT_STREAM3_START = 24800;
const JIT_STREAM3_END = 25400;

// Phase 5: Punchline
const P5_START = 26000;
const DURATION = 30000;

/* ━━ Colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_FILE = "#7e57c2";
const COL_HIGHLIGHT = "#69f0ae";
const COL_TRAD = "#ff8a65";
const COL_1080 = "#448aff";
const COL_720 = "#64b5f6";
const COL_480 = "#90caf9";
const COL_MACHINE = "#ffab91";
const COL_EF = "#82b1ff";
const COL_BG = "#3d4158";
const COL_DONE = "#69f0ae";

/* ━━ Easing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }
function prog(ms: number, s: number, e: number) { return clamp01((ms - s) / (e - s)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function segX(i: number) { return -BAR_W / 2 + SEG_W / 2 + i * SEG_W; }

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COMPONENTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SceneLabel({ children, position, opacity, color, fontSize, bold, anchorX }: {
  children: string; position: [number, number, number]; opacity: number;
  color?: string; fontSize?: number; bold?: boolean; anchorX?: "left" | "center" | "right";
}) {
  if (opacity < 0.01) return null;
  const fs = fontSize ?? 0.18;
  return (
    <Text position={position} fontSize={fs} color={color ?? "white"} anchorX={anchorX ?? "center"} anchorY="middle" fillOpacity={opacity} fontWeight={bold ? "bold" : "normal"} outlineWidth={fs * 0.08} outlineColor="#000000" outlineOpacity={opacity * 0.6}>
      {children}
    </Text>
  );
}

function BarBackdrop({ width, opacity }: { width: number; opacity: number }) {
  if (opacity < 0.01) return null;
  return (
    <mesh>
      <boxGeometry args={[width + 0.06, BAR_H + 0.06, BAR_D * 0.5]} />
      <meshStandardMaterial color={COL_BG} roughness={0.8} transparent opacity={opacity * 0.5} depthWrite={false} />
    </mesh>
  );
}

function BarSegment({ position, color, opacity, emissive }: {
  position: [number, number, number]; color: string; opacity: number; emissive?: number;
}) {
  if (opacity < 0.01) return null;
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[SEG_W - SEG_GAP, BAR_H, BAR_D]} />
      <meshPhysicalMaterial color={color} roughness={0.12} metalness={0.15} clearcoat={0.8} transparent opacity={opacity} emissive={color} emissiveIntensity={emissive ?? 0.06} />
    </mesh>
  );
}

function FilmstripBar({ opacity, position, label, scale }: {
  opacity: number; position: [number, number, number]; label?: string; scale?: number;
}) {
  if (opacity < 0.01) return null;
  const s = scale ?? 1;
  return (
    <group position={position} scale={[s, s, s]}>
      <BarBackdrop width={BAR_W} opacity={opacity} />
      {Array.from({ length: NUM_SEGS }, (_, i) => (
        <BarSegment key={i} position={[segX(i), 0, BAR_D * 0.3]} color={COL_FILE} opacity={opacity * 0.85} />
      ))}
      {label && <SceneLabel position={[0, BAR_H / 2 + 0.14, BAR_D]} fontSize={0.09} opacity={opacity * 0.8}>{label}</SceneLabel>}
    </group>
  );
}

function SegmentedBar({ opacity, position, label, scale, missingSegs, highlightSeg, dimOthers }: {
  opacity: number; position: [number, number, number]; label?: string; scale?: number;
  missingSegs?: number[]; highlightSeg?: number; dimOthers?: boolean;
}) {
  if (opacity < 0.01) return null;
  const s = scale ?? 1;
  const missing = missingSegs ?? [];
  const hl = highlightSeg ?? -1;
  const dim = dimOthers ?? false;
  return (
    <group position={position} scale={[s, s, s]}>
      <BarBackdrop width={BAR_W} opacity={opacity} />
      {Array.from({ length: NUM_SEGS }, (_, i) => {
        if (missing.includes(i)) return null;
        const isHl = i === hl;
        const col = isHl ? COL_HIGHLIGHT : COL_FILE;
        const segOpa = isHl ? opacity : (dim && hl >= 0 ? opacity * 0.3 : opacity * 0.85);
        return <BarSegment key={i} position={[segX(i), 0, BAR_D * 0.3]} color={col} opacity={segOpa} emissive={isHl ? 0.4 : 0.06} />;
      })}
      {label && <SceneLabel position={[0, BAR_H / 2 + 0.14, BAR_D]} fontSize={0.09} opacity={opacity * 0.8}>{label}</SceneLabel>}
    </group>
  );
}

function Chunk({ opacity, color, position }: {
  opacity: number; color: string; position: [number, number, number];
}) {
  if (opacity < 0.01) return null;
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[SEG_W - SEG_GAP, BAR_H, BAR_D]} />
      <meshPhysicalMaterial color={color} roughness={0.12} metalness={0.15} clearcoat={0.8} transparent opacity={opacity} emissive={color} emissiveIntensity={0.25} />
    </mesh>
  );
}

function VariantBar({ opacity, color, position, label, scale }: {
  opacity: number; color: string; position: [number, number, number]; label: string; scale?: number;
}) {
  if (opacity < 0.01) return null;
  const s = scale ?? 1;
  return (
    <group position={position} scale={[s, s, s]}>
      <BarBackdrop width={BAR_W} opacity={opacity * 0.3} />
      {Array.from({ length: NUM_SEGS }, (_, i) => (
        <BarSegment key={i} position={[segX(i), 0, BAR_D * 0.25]} color={color} opacity={opacity} emissive={0.15} />
      ))}
      <SceneLabel position={[BAR_W / 2 + 0.12, 0, BAR_D * 0.3]} fontSize={0.08} color="#ccddff" opacity={opacity * 0.8} anchorX="left">{label}</SceneLabel>
    </group>
  );
}

function GhostVariantBar({ opacity, color, position, label, scale, filledSegs }: {
  opacity: number; color: string; position: [number, number, number]; label: string;
  scale?: number; filledSegs?: number[];
}) {
  if (opacity < 0.01) return null;
  const s = scale ?? 1;
  const filled = filledSegs ?? [];
  return (
    <group position={position} scale={[s, s, s]}>
      <BarBackdrop width={BAR_W} opacity={opacity * 0.15} />
      {Array.from({ length: NUM_SEGS }, (_, i) => {
        const isFilled = filled.includes(i);
        return (
          <BarSegment
            key={i}
            position={[segX(i), 0, BAR_D * 0.25]}
            color={color}
            opacity={isFilled ? opacity * 0.85 : opacity * 0.08}
            emissive={isFilled ? 0.3 : 0.02}
          />
        );
      })}
      <SceneLabel position={[BAR_W / 2 + 0.12, 0, BAR_D * 0.3]} fontSize={0.08} color="#ccddff" opacity={opacity * 0.5} anchorX="left">{label}</SceneLabel>
    </group>
  );
}

function TranscodeBox({ opacity, active, position, scale }: {
  opacity: number; active: boolean; position: [number, number, number]; scale?: number;
}) {
  if (opacity < 0.01) return null;
  const s = scale ?? 1;
  return (
    <group position={position} scale={[s, s, s]}>
      <mesh castShadow>
        <boxGeometry args={[1.0, 0.45, 0.35]} />
        <meshPhysicalMaterial color={COL_MACHINE} roughness={0.2} metalness={0.3} clearcoat={0.5} transparent opacity={opacity} emissive={COL_MACHINE} emissiveIntensity={active ? 0.4 : 0.05} />
      </mesh>
      <SceneLabel position={[0, 0, 0.2]} fontSize={0.09 * (1 / s)} color="#ffffff" opacity={opacity * 0.9}>transcode</SceneLabel>
      {active && <pointLight color={COL_MACHINE} intensity={3} distance={4} />}
    </group>
  );
}

function ProxyBox({ opacity, active, position }: {
  opacity: number; active: boolean; position: [number, number, number];
}) {
  if (opacity < 0.01) return null;
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.8, 0.4]} />
        <meshPhysicalMaterial color={COL_EF} roughness={0.3} metalness={0.2} clearcoat={0.4} transparent opacity={opacity * 0.15} emissive={COL_EF} emissiveIntensity={active ? 0.15 : 0.03} />
      </mesh>
      <SceneLabel position={[0, 0.28, 0.22]} fontSize={0.09} color="#82b1ff" opacity={opacity * 0.9}>editframe proxy</SceneLabel>
      <TranscodeBox opacity={opacity * 0.8} active={active} position={[0, -0.08, 0.04]} scale={0.5} />
    </group>
  );
}

const PLAYER_W = 1.3;
const PLAYER_SCREEN_W = 1.14;
const SCRUB_H = 0.05;
const SCRUB_SEG_W = PLAYER_SCREEN_W / NUM_SEGS;
const SCRUB_GAP = 0.01;

function scrubSegX(i: number) {
  return -PLAYER_SCREEN_W / 2 + SCRUB_SEG_W / 2 + i * SCRUB_SEG_W;
}

function VideoPlayer({ opacity, playing, position, bufferedSegs, bufferColor }: {
  opacity: number; playing: number; position: [number, number, number];
  bufferedSegs?: number[]; bufferColor?: string;
}) {
  if (opacity < 0.01) return null;
  const playBtnOpa = opacity * (1 - playing * 0.8);
  const buffered = bufferedSegs ?? [];
  const bCol = bufferColor ?? COL_EF;
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[PLAYER_W, 0.8, 0.06]} />
        <meshPhysicalMaterial color="#1a1a2e" roughness={0.4} metalness={0.5} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[PLAYER_SCREEN_W, 0.64, 0.02]} />
        <meshStandardMaterial color="#0a0a18" transparent opacity={opacity * 0.95} emissive={COL_EF} emissiveIntensity={playing * 0.35} />
      </mesh>
      {playBtnOpa > 0.01 && (
        <mesh position={[0, 0, 0.06]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.12, 0.16, 3]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={playBtnOpa * 0.5} depthWrite={false} />
        </mesh>
      )}
      {/* Scrub bar background */}
      <mesh position={[0, -0.30, 0.04]}>
        <boxGeometry args={[PLAYER_SCREEN_W, SCRUB_H, 0.02]} />
        <meshBasicMaterial color="#333355" transparent opacity={opacity * 0.4} depthWrite={false} />
      </mesh>
      {/* Buffered segments — individual slots that light up */}
      {Array.from({ length: NUM_SEGS }, (_, i) => {
        const isBuffered = buffered.includes(i);
        if (!isBuffered) return null;
        return (
          <mesh key={i} position={[scrubSegX(i), -0.30, 0.05]}>
            <boxGeometry args={[SCRUB_SEG_W - SCRUB_GAP, SCRUB_H + 0.01, 0.02]} />
            <meshBasicMaterial color={bCol} transparent opacity={opacity * 0.8} depthWrite={false} />
          </mesh>
        );
      })}
      {/* Playhead */}
      {playing > 0.01 && (
        <mesh position={[-PLAYER_SCREEN_W / 2 + PLAYER_SCREEN_W * playing, -0.30, 0.06]}>
          <boxGeometry args={[0.02, SCRUB_H + 0.03, 0.02]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.9} depthWrite={false} />
        </mesh>
      )}
      <SceneLabel position={[0, -0.48, 0.04]} fontSize={0.07} color="#666688" opacity={opacity * 0.4}>player</SceneLabel>
    </group>
  );
}

function LaserCutLine({ x, y, opacity }: { x: number; y: number; opacity: number }) {
  if (opacity < 0.01) return null;
  return (
    <mesh position={[x, y, 0.01]}>
      <planeGeometry args={[0.03, 0.8]} />
      <meshBasicMaterial color="white" transparent opacity={opacity} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** A thin beam that travels from point A to point B, showing a request in flight.
 *  `progress` 0→1 controls how far the beam has extended. */
function RequestBeam({ from, to, progress, opacity, color }: {
  from: [number, number, number]; to: [number, number, number];
  progress: number; opacity: number; color: string;
}) {
  if (opacity < 0.01 || progress <= 0) return null;
  const p = clamp01(progress);
  const midX = lerp(from[0], to[0], p);
  const midY = lerp(from[1], to[1], p);
  const midZ = lerp(from[2], to[2], p);
  const dx = midX - from[0];
  const dy = midY - from[1];
  const dz = midZ - from[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 0.01) return null;

  // Position at midpoint of the drawn portion
  const cx = (from[0] + midX) / 2;
  const cy = (from[1] + midY) / 2;
  const cz = (from[2] + midZ) / 2;

  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  return (
    <mesh position={[cx, cy, cz]} quaternion={quat}>
      <cylinderGeometry args={[0.012, 0.012, len, 4]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/* ━━ Environment ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Floor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]} receiveShadow>
        <planeGeometry args={[60, 50]} />
        <meshStandardMaterial color="#2a2e42" roughness={0.75} metalness={0.1} />
      </mesh>
      <gridHelper args={[40, 40, "#3a3f58", "#3a3f58"]} position={[0, -0.69, 0]}>
        {/* @ts-expect-error gridHelper material access */}
        <meshBasicMaterial transparent opacity={0.25} />
      </gridHelper>
    </>
  );
}

function Lighting({ timeMs }: { timeMs: number }) {
  const rimRef = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (rimRef.current) rimRef.current.intensity = 0.9 + Math.sin(timeMs * 0.0015) * 0.15;
  });
  return (
    <>
      <ambientLight color="#d0d8f0" intensity={0.9} />
      <directionalLight position={[3, 10, 8]} intensity={1.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={15} shadow-camera-bottom={-8} />
      <directionalLight position={[-3, 6, 4]} color="#aaccff" intensity={0.6} />
      <pointLight ref={rimRef} position={[0, 3, 6]} color={COL_EF} intensity={0.9} distance={30} />
      <spotLight position={[0, 8, 10]} intensity={2.0} distance={30} angle={Math.PI / 4} penumbra={0.4} decay={1} />
    </>
  );
}

/* ━━ Camera ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Simple camera: close on bar → pull back → pan left → pan right → settle.
   No orbit, no snap zoom, no shake. Let the objects tell the story. */
function CameraController({ timeMs }: { timeMs: number }) {
  const { camera } = useThree();

  useFrame(() => {
    // Phase 1→2: pull back from close-up to wide shot showing both sides
    const pullback = easeInOut(prog(timeMs, P_PULLBACK_START, P_PULLBACK_END));

    let cx = 0;
    let cy = lerp(0.8, 5.0, pullback);
    let cz = lerp(3.2, 16, pullback);
    let tx = 0;
    let ty = lerp(0.15, -0.2, pullback);
    let tz = lerp(0, 5, pullback);

    // Phase 3: gently pan left to follow traditional side
    const tradFocus = easeInOut(prog(timeMs, TRAD_START, TRAD_START + 1500));
    const tradRelease = easeInOut(prog(timeMs, TRANS_START, TRANS_END));
    const tradPan = tradFocus * (1 - tradRelease);
    cx += tradPan * -1.0;
    tx += tradPan * -0.8;

    // Transition → Phase 4: pan right to follow JIT side
    const jitPan = easeInOut(prog(timeMs, TRANS_START, JIT_START));
    cx += jitPan * 2.0;
    tx += jitPan * 1.6;

    // Phase 5: settle to center, slightly favoring JIT side
    const settle = easeInOut(prog(timeMs, P5_START, P5_START + 1500));
    if (settle > 0) {
      cx = lerp(cx, 0.8, settle);
      ty = lerp(ty, 0, settle);
    }

    camera.position.set(cx, cy, cz);
    camera.lookAt(tx, ty, tz);
  });

  return null;
}

/* ━━ SCENE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function JITStreamingScene({ currentTimeMs: timeMs }: { currentTimeMs: number }) {

  // ── Global dimming: traditional side dims after transition ──
  const tradDim = 1 - easeOut(prog(timeMs, TRANS_START, TRANS_END)) * 0.7;

  // ── Phase 1: hero ──
  const p1 = easeOut(prog(timeMs, 0, P1_END));
  const heroY = lerp(0.8, 0.3, p1);
  const titleOpa = easeOut(prog(timeMs, 300, 800)) * (1 - easeOut(prog(timeMs, 1800, 2200)));
  const questionOpa = easeOut(prog(timeMs, 2200, 2600)) * (1 - easeOut(prog(timeMs, 2900, 3200)));

  // ── Phase 2: split ──
  const inP2 = timeMs >= P2_START;
  const splitProg = easeInOut(prog(timeMs, P2_SPLIT, P2_END));
  const crossfade = easeOut(prog(timeMs, P2_START + 200, P2_START + 600));
  const unifiedOpa = inP2 ? (1 - crossfade) : p1;

  const cutBrightness = (c: number) => {
    if (!inP2) return 0;
    const delay = c * 100;
    const cp = prog(timeMs, P2_START + delay, P2_START + delay + 200);
    const cf = prog(timeMs, P2_START + delay + 150, P2_START + delay + 500);
    return cp * (1 - cf);
  };

  const sideLabelOpa = easeOut(prog(timeMs, P2_SPLIT, P2_END));
  const subLabelOpa = easeOut(prog(timeMs, P2_SPLIT + 300, P2_END + 300));

  // ── Phase 3: Traditional ──
  const inTrad = timeMs >= TRAD_START;
  const tradUploadDur = TRAD_UPLOAD_END - TRAD_START;
  const tradChunkDelay = tradUploadDur / NUM_SEGS;
  const tradChunkTravel = tradChunkDelay * 1.5;

  const tradUploaded: number[] = [];
  const tradChunkProgs: number[] = [];
  for (let i = 0; i < NUM_SEGS; i++) {
    const t0 = TRAD_START + i * tradChunkDelay;
    const p = easeInOut(prog(timeMs, t0, t0 + tradChunkTravel));
    tradChunkProgs.push(p);
    if (p >= 1) tradUploaded.push(i);
  }

  const tradCopyOpa = tradUploaded.length > 0 ? easeOut(tradUploaded.length / NUM_SEGS) : 0;
  const tradTransOpa = easeOut(prog(timeMs, TRAD_TRANSCODE_START - 400, TRAD_TRANSCODE_START));
  const tradTransActive = timeMs >= TRAD_TRANSCODE_START && timeMs < TRAD_TRANSCODE_END;

  const tradVar1080 = easeOut(prog(timeMs, TRAD_VARIANTS_IN, TRAD_VARIANTS_IN + 400));
  const tradVar720 = easeOut(prog(timeMs, TRAD_VARIANTS_IN + 400, TRAD_VARIANTS_IN + 800));
  const tradVar480 = easeOut(prog(timeMs, TRAD_VARIANTS_IN + 800, TRAD_VARIANTS_IN + 1200));

  const tradServeDur = TRAD_PLAY - TRAD_SERVE_START;
  const tradServeDelay = tradServeDur / 3;
  const tradServeTravel = tradServeDelay * 1.4;
  const tradServeProgs: number[] = [];
  const tradBufferedSegs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = TRAD_SERVE_START + i * tradServeDelay;
    const p = easeInOut(prog(timeMs, t0, t0 + tradServeTravel));
    tradServeProgs.push(p);
    if (p >= 0.95) tradBufferedSegs.push(i);
  }
  const tradPlayerOpa = easeOut(prog(timeMs, TRAD_SERVE_START - 500, TRAD_SERVE_START));
  const tradPlaying = easeOut(prog(timeMs, TRAD_PLAY, TRAD_PLAY + 500));

  // ── Transition text ──
  const transOpa = easeOut(prog(timeMs, TRANS_START + 200, TRANS_START + 600)) * (1 - easeOut(prog(timeMs, TRANS_END - 300, TRANS_END)));

  // ── Phase 4: JIT ──
  const inJit = timeMs >= JIT_START;
  const jitGhostOpa = easeOut(prog(timeMs, JIT_GHOST_IN, JIT_GHOST_IN + 800));
  const jitProxyOpa = easeOut(prog(timeMs, JIT_PROXY_IN, JIT_PROXY_IN + 500));
  const jitPlayerOpa = easeOut(prog(timeMs, JIT_PLAYER_IN, JIT_PLAYER_IN + 500));

  // Segments fetched out of order: 0, 4, 2 — skipping around to show
  // the JIT approach doesn't need sequential access.
  // Each cycle: request → fetch → stream
  type Cycle = { rs: number; re: number; fs: number; fe: number; ss: number; se: number; seg: number };
  const jitCycles: Cycle[] = [
    { rs: JIT_REQ1_START, re: JIT_REQ1_END, fs: JIT_FETCH1_START, fe: JIT_FETCH1_END, ss: JIT_STREAM1_START, se: JIT_STREAM1_END, seg: 0 },
    { rs: JIT_REQ2_START, re: JIT_REQ2_END, fs: JIT_FETCH2_START, fe: JIT_FETCH2_END, ss: JIT_STREAM2_START, se: JIT_STREAM2_END, seg: 4 },
    { rs: JIT_REQ3_START, re: JIT_REQ3_END, fs: JIT_FETCH3_START, fe: JIT_FETCH3_END, ss: JIT_STREAM3_START, se: JIT_STREAM3_END, seg: 2 },
  ];

  const jitHighlight = jitCycles.find(c => timeMs >= c.rs && timeMs < c.se)?.seg ?? -1;
  const jitTransActive = jitCycles.some(c => timeMs >= c.fe && timeMs < c.ss);
  const jitPlaying = easeOut(prog(timeMs, JIT_PLAY, JIT_PLAY + 500));
  const jitFilledSegs = jitCycles.filter(c => timeMs >= c.se).map(c => c.seg);

  // Phase 5
  const punchOpa = easeOut(prog(timeMs, P5_START + 200, P5_START + 600));
  const tagOpa = easeOut(prog(timeMs, P5_START + 800, P5_START + 1200));

  return (
    <>
      <CameraController timeMs={timeMs} />
      <Lighting timeMs={timeMs} />
      <Floor />

      {/* ── Phase 1: Hero ── */}
      <SceneLabel position={[0, 0.65, 0.2]} opacity={titleOpa} fontSize={0.22} bold>
        A video file on a remote URL.
      </SceneLabel>

      <SceneLabel position={[0, 0.65, 0.2]} opacity={questionOpa} fontSize={0.22} bold>
        How do you stream it?
      </SceneLabel>

      {/* Unified bar (pre-split) */}
      <FilmstripBar opacity={unifiedOpa} position={[0, heroY, 0]} label="video.mp4" />

      {/* Laser cuts */}
      {Array.from({ length: NUM_SEGS - 1 }, (_, c) => (
        <LaserCutLine key={c} x={segX(c) + SEG_W / 2} y={0.3} opacity={cutBrightness(c)} />
      ))}
      {inP2 && (
        <pointLight
          position={[0, 0.8, 0.5]}
          intensity={prog(timeMs, P2_START, P2_START + 200) * (1 - prog(timeMs, P2_START + 150, P2_START + 500)) * 8}
          distance={8}
        />
      )}

      {/* ── Side labels ── */}
      <SceneLabel position={[TRAD_X, 0.65, 0.5]} opacity={sideLabelOpa * tradDim} color="#888888" fontSize={0.18} bold>
        Traditional
      </SceneLabel>
      <SceneLabel position={[TRAD_X, 0.50, 0.5]} opacity={subLabelOpa * tradDim} color="#777777" fontSize={0.10}>
        Upload everything, then stream
      </SceneLabel>

      <SceneLabel position={[JIT_X, 0.65, 0.5]} opacity={sideLabelOpa} color={COL_EF} fontSize={0.18} bold>
        Editframe
      </SceneLabel>
      <SceneLabel position={[JIT_X, 0.50, 0.5]} opacity={subLabelOpa} color="#aaaaaa" fontSize={0.10}>
        Stream on demand, no upload
      </SceneLabel>

      {/* ── Traditional bar (left) — loses chunks as they upload ── */}
      {inP2 && (
        <SegmentedBar
          opacity={crossfade * tradDim}
          position={[lerp(0, TRAD_X, splitProg), SIDE_Y, lerp(0, 0.5, splitProg)]}
          label="video.mp4"
          missingSegs={tradUploaded}
        />
      )}

      {/* ── JIT bar (right) — stays whole, highlights fetched chunk ── */}
      {inP2 && (
        <SegmentedBar
          opacity={crossfade}
          position={[lerp(0, JIT_X, splitProg), SIDE_Y, lerp(0, 0.5, splitProg)]}
          label="video.mp4 — same URL"
          highlightSeg={jitHighlight}
          dimOthers
        />
      )}

      {/* ━━ TRADITIONAL SIDE (Phase 3) ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {inTrad && (
        <>
          {/* Chunks uploading from bar → service depth */}
          {tradChunkProgs.map((p, i) => {
            if (p <= 0 || p >= 1) return null;
            return (
              <Chunk key={`tup-${i}`} opacity={0.85 * tradDim} color={COL_TRAD}
                position={[TRAD_X + segX(i), SIDE_Y + Math.sin(p * Math.PI) * 0.25, lerp(0.5, SERVICE_Z, p)]} />
            );
          })}

          {/* Server copy */}
          <FilmstripBar opacity={tradCopyOpa * tradDim} position={[TRAD_X, SIDE_Y, SERVICE_Z]} label="copy on service" scale={0.9} />

          {/* Transcode box */}
          <TranscodeBox opacity={tradTransOpa * tradDim} active={tradTransActive} position={[TRAD_X, -0.1, TRANSCODE_Z]} />

          {/* Variant bars */}
          <group position={[TRAD_X, -0.1, VARIANT_Z]}>
            <VariantBar opacity={tradVar1080 * tradDim} color={COL_1080} position={[0, 0.28, 0]} label="1080p" scale={0.75} />
            <VariantBar opacity={tradVar720 * tradDim} color={COL_720} position={[0, 0, 0]} label="720p" scale={0.75} />
            <VariantBar opacity={tradVar480 * tradDim} color={COL_480} position={[0, -0.28, 0]} label="480p" scale={0.75} />
          </group>

          {/* Chunks from 1080p → player */}
          {tradServeProgs.map((p, i) => {
            if (p <= 0 || p >= 1) return null;
            return (
              <Chunk key={`tsrv-${i}`} opacity={0.8 * tradDim} color={COL_1080}
                position={[TRAD_X + segX(i) * 0.75, lerp(-0.1, -0.35, p) + Math.sin(p * Math.PI) * 0.2, lerp(VARIANT_Z, PLAYER_Z, p)]} />
            );
          })}

          {/* Player — scrub bar fills sequentially as chunks arrive */}
          <VideoPlayer opacity={tradPlayerOpa * tradDim} playing={tradPlaying} position={[TRAD_X, -0.35, PLAYER_Z]} bufferedSegs={tradBufferedSegs} bufferColor={COL_1080} />

          {/* Summary text */}
          <SceneLabel position={[TRAD_X, -0.75, PLAYER_Z + 0.5]} opacity={easeOut(prog(timeMs, TRAD_PLAY + 200, TRAD_PLAY + 600)) * tradDim} color="#888888" fontSize={0.10}>
            Upload. Transcode. Store. Then play.
          </SceneLabel>
        </>
      )}

      {/* ── Transition text ── */}
      <SceneLabel position={[0, 0.65, 1.5]} opacity={transOpa} fontSize={0.22} bold>
        What if you didn't need all that?
      </SceneLabel>

      {/* ━━ JIT SIDE (Phase 4) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {inJit && (
        <>
          {/* Ghost variant grid — the available bitrate space, instantly visible.
              Segments light up as the proxy fetches and transcodes them. */}
          <group position={[JIT_X, -0.1, VARIANT_Z]}>
            <GhostVariantBar opacity={jitGhostOpa} color={COL_1080} position={[0, 0.28, 0]} label="1080p" scale={0.75} filledSegs={jitFilledSegs} />
            <GhostVariantBar opacity={jitGhostOpa * 0.7} color={COL_720} position={[0, 0, 0]} label="720p" scale={0.75} />
            <GhostVariantBar opacity={jitGhostOpa * 0.5} color={COL_480} position={[0, -0.28, 0]} label="480p" scale={0.75} />
          </group>

          {/* Proxy */}
          <ProxyBox opacity={jitProxyOpa} active={jitTransActive} position={[JIT_X, -0.15, PROXY_Z]} />

          {/* Player — scrub bar fills non-contiguously as chunks arrive out of order */}
          <VideoPlayer opacity={jitPlayerOpa} playing={jitPlaying} position={[JIT_X, -0.35, JIT_PLAYER_Z]} bufferedSegs={jitFilledSegs} bufferColor={COL_1080} />

          {/* Request → Fetch → Stream cycles */}
          {jitCycles.map((c, ci) => {
            // Phase A: request beam from player → ghost variant segment
            const reqP = easeInOut(prog(timeMs, c.rs, c.re));
            const requesting = timeMs >= c.rs && timeMs < c.re;

            // Phase B: chunk fetched from source bar → proxy
            const fetchP = easeInOut(prog(timeMs, c.fs, c.fe));
            const fetching = timeMs >= c.fs && timeMs < c.fe;

            // Phase C: chunk streamed from proxy → player
            const streamP = easeInOut(prog(timeMs, c.ss, c.se));
            const streaming = timeMs >= c.ss && timeMs < c.se;

            // Target position: the specific segment in the 1080p ghost bar
            const ghostSegY = -0.1 + 0.28; // ghost group Y + 1080p row offset
            const ghostSegX = JIT_X + segX(c.seg) * 0.75; // scaled by ghost bar scale

            return (
              <React.Fragment key={ci}>
                {/* Request beam: player → ghost variant segment */}
                {requesting && (
                  <RequestBeam
                    from={[JIT_X, -0.35, JIT_PLAYER_Z]}
                    to={[ghostSegX, ghostSegY, VARIANT_Z]}
                    progress={reqP}
                    opacity={0.7}
                    color={COL_EF}
                  />
                )}
                {/* Small pulse at the target ghost segment when request arrives */}
                {reqP > 0.85 && timeMs < c.fe + 200 && (
                  <pointLight
                    position={[ghostSegX, ghostSegY, VARIANT_Z]}
                    color={COL_EF}
                    intensity={3 * (1 - prog(timeMs, c.re, c.re + 300))}
                    distance={2}
                  />
                )}
                {/* Fetch: chunk travels from source bar → proxy */}
                {fetching && (
                  <Chunk opacity={0.9} color={COL_HIGHLIGHT}
                    position={[
                      lerp(JIT_X + segX(c.seg), JIT_X, fetchP),
                      SIDE_Y + Math.sin(fetchP * Math.PI) * 0.3,
                      lerp(0.5, PROXY_Z, fetchP),
                    ]} />
                )}
                {/* Stream: chunk travels from proxy → player */}
                {streaming && (
                  <Chunk opacity={0.9} color={COL_1080}
                    position={[
                      JIT_X,
                      lerp(-0.15, -0.35, streamP) + Math.sin(streamP * Math.PI) * 0.15,
                      lerp(PROXY_Z, JIT_PLAYER_Z, streamP),
                    ]} />
                )}
              </React.Fragment>
            );
          })}

          {/* Summary text */}
          <SceneLabel position={[JIT_X, -0.75, JIT_PLAYER_Z + 0.5]} opacity={easeOut(prog(timeMs, JIT_PLAY + 200, JIT_PLAY + 600))} color={COL_EF} fontSize={0.10}>
            Already playing.
          </SceneLabel>
        </>
      )}

      {/* ── Phase 5: Punchline ── */}
      <SceneLabel
        position={[JIT_X + 0.3, -0.15, JIT_PLAYER_Z + 1.5 + punchOpa * 0.6]}
        opacity={punchOpa} color={COL_DONE} fontSize={0.30} bold
      >
        Instant playback
      </SceneLabel>
      <SceneLabel
        position={[JIT_X + 0.3, -0.42, JIT_PLAYER_Z + 1.5 + tagOpa * 0.6]}
        opacity={tagOpa} color="#aaaaaa" fontSize={0.11}
      >
        No upload. No transcoding queue. Just the chunks you need.
      </SceneLabel>
    </>
  );
}
