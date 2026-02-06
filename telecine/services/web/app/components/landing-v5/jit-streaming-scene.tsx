// @ts-nocheck - React Three Fiber JSX intrinsics
import * as React from "react";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   JIT STREAMING SCENE — Directional Narratives

   Two stories told sequentially with OPPOSITE Z-DIRECTIONS:
   Traditional tracks FORWARD (source→player): content must traverse
   the entire pipeline before the client can act.
   JIT tracks BACKWARD (player→source): the client initiates, and
   only the needed chunk traverses back.

   Phase 1 (0–3s):     Hero — solid bar appears. "A video on a remote URL"
   Phase 2 (3–7s):     Traditional — Transfer to pipeline.
                        Orange chunks peel off one by one → PIPELINE_Z.
   Phase 3 (7–13s):    Traditional — Transcode to variants.
                        Per-segment, per-row: pipeline chunks copy into
                        1080p, 720p, 480p rows sequentially.
   Phase 4 (13–16s):   Traditional — Client finally requests.
                        Player appears. Request lines from player to 1080p.
                        Chunks travel along lines. Scrub bar fills.
   Phase 5 (16–18s):   Transition — zoom out, "What if you didn't need
                        all that?", dim traditional side.
   Phase 6 (18–22s):   JIT setup — pan to Editframe source bar.
                        Ghost grid + player appear.
   Phase 7 (22–28s):   JIT cycles — request line player→ghost→source,
                        chunk travels back along line to player. ×3 out
                        of order (segments 0, 4, 2).
   Phase 8 (28–30s):   Punchline — "Instant playback"

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
   Z-depth layers:
     0       source bars
     2.5     traditional: pipeline copy
     4.5     variant bars / JIT ghost grid
     6.5     player (both sides)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TRAD_X = -3.2;
const JIT_X = 3.2;
const SOURCE_Z = 0;
const PIPELINE_Z = 2.5;
const VARIANT_Z = 4.5;
const PLAYER_Z = 6.5;
const SIDE_Y = 0.3;

/* ━━ Timing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// Phase 1: Hero
const HERO_IN = 300;
const HERO_HOLD = 3000;

// Phase 2: Traditional — transfer to pipeline
const TRAD_TRANSFER_START = 3000;
const TRAD_TRANSFER_END = 7000;
const TRAD_TRANSFER_CAPTION_IN = 3000;
const TRAD_TRANSFER_CAPTION_OUT = 6500;

// Phase 3: Traditional — transcode to variants
const TRAD_TRANSCODE_START = 7000;
const TRAD_TRANSCODE_END = 12500;
const TRAD_TRANSCODE_CAPTION_IN = 7000;
const TRAD_TRANSCODE_CAPTION_OUT = 12000;

// Phase 4: Traditional — client requests
const TRAD_REQUEST_START = 13000;
const TRAD_REQUEST_END = 15500;
const TRAD_PLAYER_IN = 12800;
const TRAD_PLAY = 15500;
const TRAD_REQUEST_CAPTION_IN = 13000;
const TRAD_REQUEST_CAPTION_OUT = 15200;

// Phase 5: Transition
const TRANS_START = 16000;
const TRANS_END = 18000;

// Phase 6: JIT setup
const JIT_SETUP_START = 18000;
const JIT_GHOST_IN = 18500;
const JIT_PLAYER_IN = 19000;
const JIT_SETUP_CAPTION_IN = 18500;
const JIT_SETUP_CAPTION_OUT = 21500;

// Phase 7: JIT cycles — request line → fetch → deliver
const JIT_CYC1_START = 22000;
const JIT_CYC1_ARRIVE = 23200;
const JIT_CYC1_END = 23500;
const JIT_PLAY = 23500;

const JIT_CYC2_START = 24000;
const JIT_CYC2_ARRIVE = 25200;
const JIT_CYC2_END = 25500;

const JIT_CYC3_START = 25800;
const JIT_CYC3_ARRIVE = 27000;
const JIT_CYC3_END = 27300;

// Phase 8: Punchline
const P8_START = 28000;
const DURATION = 30000;

/* ━━ Colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_FILE = "#7e57c2";
const COL_HIGHLIGHT = "#69f0ae";
const COL_TRAD = "#ff8a65";
const COL_1080 = "#448aff";
const COL_720 = "#64b5f6";
const COL_480 = "#90caf9";
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

/** Solid bar — no segment gaps. Used for the hero file before chunks peel off. */
function SolidBar({ opacity, position, label, color }: {
  opacity: number; position: [number, number, number]; label?: string; color?: string;
}) {
  if (opacity < 0.01) return null;
  const c = color ?? COL_FILE;
  return (
    <group position={position}>
      <BarBackdrop width={BAR_W} opacity={opacity} />
      <mesh castShadow>
        <boxGeometry args={[BAR_W, BAR_H, BAR_D]} />
        <meshPhysicalMaterial color={c} roughness={0.12} metalness={0.15} clearcoat={0.8} transparent opacity={opacity * 0.85} emissive={c} emissiveIntensity={0.06} />
      </mesh>
      {label && <SceneLabel position={[0, BAR_H / 2 + 0.14, BAR_D]} fontSize={0.09} opacity={opacity * 0.8}>{label}</SceneLabel>}
    </group>
  );
}

function FilmstripBar({ opacity, position, label, scale, missingSegs, color }: {
  opacity: number; position: [number, number, number]; label?: string; scale?: number;
  missingSegs?: number[]; color?: string;
}) {
  if (opacity < 0.01) return null;
  const s = scale ?? 1;
  const missing = missingSegs ?? [];
  const col = color ?? COL_FILE;
  return (
    <group position={position} scale={[s, s, s]}>
      <BarBackdrop width={BAR_W} opacity={opacity} />
      {Array.from({ length: NUM_SEGS }, (_, i) => {
        if (missing.includes(i)) return null;
        return <BarSegment key={i} position={[segX(i), 0, BAR_D * 0.3]} color={col} opacity={opacity * 0.85} />;
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

function VariantBar({ opacity, color, position, label, scale, filledSegs }: {
  opacity: number; color: string; position: [number, number, number]; label: string;
  scale?: number; filledSegs?: number[];
}) {
  if (opacity < 0.01) return null;
  const s = scale ?? 1;
  const filled = filledSegs ?? [];
  return (
    <group position={position} scale={[s, s, s]}>
      <BarBackdrop width={BAR_W} opacity={opacity * 0.3} />
      {Array.from({ length: NUM_SEGS }, (_, i) => {
        const isFilled = filled.includes(i);
        if (!isFilled) return null;
        return (
          <BarSegment key={i} position={[segX(i), 0, BAR_D * 0.25]} color={color} opacity={opacity} emissive={0.15} />
        );
      })}
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
      <mesh position={[0, -0.30, 0.04]}>
        <boxGeometry args={[PLAYER_SCREEN_W, SCRUB_H, 0.02]} />
        <meshBasicMaterial color="#333355" transparent opacity={opacity * 0.4} depthWrite={false} />
      </mesh>
      {Array.from({ length: NUM_SEGS }, (_, i) => {
        if (!buffered.includes(i)) return null;
        return (
          <mesh key={i} position={[scrubSegX(i), -0.30, 0.05]}>
            <boxGeometry args={[SCRUB_SEG_W - SCRUB_GAP, SCRUB_H + 0.01, 0.02]} />
            <meshBasicMaterial color={bCol} transparent opacity={opacity * 0.8} depthWrite={false} />
          </mesh>
        );
      })}
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

/** Beam connecting two points. progress controls draw-in animation (0→1).
 *  Once progress reaches 1, beam stays fully drawn as long as opacity > 0. */
function RequestBeam({ from, to, progress, opacity, color }: {
  from: [number, number, number]; to: [number, number, number];
  progress: number; opacity: number; color: string;
}) {
  if (opacity < 0.01 || progress <= 0) return null;
  const p = clamp01(progress);

  const endX = lerp(from[0], to[0], p);
  const endY = lerp(from[1], to[1], p);
  const endZ = lerp(from[2], to[2], p);
  const dx = endX - from[0];
  const dy = endY - from[1];
  const dz = endZ - from[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 0.01) return null;

  const cx = (from[0] + endX) / 2;
  const cy = (from[1] + endY) / 2;
  const cz = (from[2] + endZ) / 2;

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
        <planeGeometry args={[50, 35]} />
        <meshStandardMaterial color="#2a2e42" roughness={0.75} metalness={0.1} />
      </mesh>
      <gridHelper args={[30, 30, "#3a3f58", "#3a3f58"]} position={[0, -0.69, 0]}>
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
      <directionalLight position={[3, 8, 5]} intensity={1.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={8} shadow-camera-bottom={-8} />
      <directionalLight position={[-3, 4, -2]} color="#aaccff" intensity={0.6} />
      <pointLight ref={rimRef} position={[0, 2, 3]} color={COL_EF} intensity={0.9} distance={20} />
      <spotLight position={[0, 6, 5]} intensity={2.0} distance={20} angle={Math.PI / 5} penumbra={0.4} decay={1} />
    </>
  );
}

/* ━━ Camera ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Stays moderately close and tracks with the content.
   Traditional: drifts forward in Z as stages complete, slight left bias.
   Transition: pulls back to show whole pipeline.
   JIT: recenters on right side, tracks content.
   Camera offset from content X keeps things centered in frame. */
function CameraController({ timeMs }: { timeMs: number }) {
  const { camera } = useThree();

  useFrame(() => {
    // Phase 1: centered on the hero bar at Z=0, looking nearly top-down
    let cx = 0;
    let cy = 3.5;
    let cz = 3.0;
    let tx = 0;
    let ty = 0;
    let tz = 0;

    // Phase 2: track forward, center on traditional side
    const transferTrack = easeInOut(prog(timeMs, TRAD_TRANSFER_START, TRAD_TRANSFER_END));
    cx = lerp(0, TRAD_X, transferTrack);
    cz = lerp(3.0, PIPELINE_Z + 3.0, transferTrack);
    tx = lerp(0, TRAD_X, transferTrack);
    tz = lerp(0, PIPELINE_Z, transferTrack);

    // Phase 3: continue forward to variants
    const transcodeTrack = easeInOut(prog(timeMs, TRAD_TRANSCODE_START, TRAD_TRANSCODE_END));
    if (timeMs >= TRAD_TRANSCODE_START) {
      cz = lerp(PIPELINE_Z + 3.0, VARIANT_Z + 3.0, transcodeTrack);
      tz = lerp(PIPELINE_Z, VARIANT_Z, transcodeTrack);
      cy = lerp(3.5, 4.0, transcodeTrack);
    }

    // Phase 4: arrive at player
    const requestTrack = easeInOut(prog(timeMs, TRAD_REQUEST_START, TRAD_REQUEST_END));
    if (timeMs >= TRAD_REQUEST_START) {
      cz = lerp(VARIANT_Z + 3.0, PLAYER_Z + 3.0, requestTrack);
      tz = lerp(VARIANT_Z, PLAYER_Z, requestTrack);
    }

    // Phase 5: pull back to show whole traditional pipeline
    const pullback = easeInOut(prog(timeMs, TRANS_START, TRANS_END));
    if (timeMs >= TRANS_START) {
      cx = lerp(cx, TRAD_X * 0.5, pullback);
      cy = lerp(cy, 6.0, pullback);
      cz = lerp(cz, PLAYER_Z + 6.0, pullback);
      tx = lerp(tx, TRAD_X * 0.5, pullback);
      ty = lerp(ty, -0.2, pullback);
      tz = lerp(tz, PIPELINE_Z, pullback);
    }

    // Phase 6: pan right to JIT side, center directly on it
    const jitZoom = easeInOut(prog(timeMs, JIT_SETUP_START, JIT_SETUP_START + 2500));
    if (timeMs >= JIT_SETUP_START) {
      cx = lerp(cx, JIT_X, jitZoom);
      cy = lerp(cy, 3.5, jitZoom);
      cz = lerp(cz, PLAYER_Z + 3.5, jitZoom);
      tx = lerp(tx, JIT_X, jitZoom);
      ty = lerp(ty, 0, jitZoom);
      tz = lerp(tz, VARIANT_Z - 0.5, jitZoom);
    }

    // Phase 7: JIT cycles — subtle drift backward toward source
    const jitDrift = easeInOut(prog(timeMs, JIT_CYC1_START, JIT_CYC3_END));
    if (timeMs >= JIT_CYC1_START) {
      tz = lerp(tz, PIPELINE_Z, jitDrift * 0.4);
      cy = lerp(cy, 4.0, jitDrift * 0.3);
    }

    // Phase 8: settle
    const settle = easeInOut(prog(timeMs, P8_START, P8_START + 1500));
    if (settle > 0) {
      cx = lerp(cx, JIT_X, settle);
      cy = lerp(cy, 3.5, settle);
      ty = lerp(ty, 0, settle);
    }

    camera.position.set(cx, cy, cz);
    camera.lookAt(tx, ty, tz);
  });

  return null;
}

/* ━━ SCENE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function JITStreamingScene({ currentTimeMs: timeMs }: { currentTimeMs: number }) {

  // ── Dimming: traditional side dims after transition ──
  const tradDim = 1 - easeOut(prog(timeMs, TRANS_START, TRANS_END)) * 0.7;

  /* ═══════════════════════════════════════════════════════════════
     PHASE 1: Hero — solid bar
     ═══════════════════════════════════════════════════════════════ */
  const heroOpa = easeOut(prog(timeMs, HERO_IN, HERO_IN + 600));
  const heroFade = 1 - easeOut(prog(timeMs, TRAD_TRANSFER_START, TRAD_TRANSFER_START + 800));
  const titleOpa = easeOut(prog(timeMs, HERO_IN, HERO_IN + 400)) * (1 - easeOut(prog(timeMs, HERO_HOLD - 500, HERO_HOLD)));

  /* ═══════════════════════════════════════════════════════════════
     PHASE 2: Traditional — Transfer to pipeline
     Orange chunks peel off the source bar one by one → PIPELINE_Z
     ═══════════════════════════════════════════════════════════════ */
  const transferDur = TRAD_TRANSFER_END - TRAD_TRANSFER_START;
  const chunkDelay = transferDur / NUM_SEGS;
  const chunkTravel = chunkDelay * 1.4;

  const tradTransferred: number[] = [];
  const tradChunkProgs: number[] = [];
  for (let i = 0; i < NUM_SEGS; i++) {
    const t0 = TRAD_TRANSFER_START + i * chunkDelay;
    const p = easeInOut(prog(timeMs, t0, t0 + chunkTravel));
    tradChunkProgs.push(p);
    if (p >= 1) tradTransferred.push(i);
  }

  const pipelineOpa = tradTransferred.length > 0 ? easeOut(tradTransferred.length / NUM_SEGS) : 0;

  const transferCaptionOpa =
    easeOut(prog(timeMs, TRAD_TRANSFER_CAPTION_IN, TRAD_TRANSFER_CAPTION_IN + 500)) *
    (1 - easeOut(prog(timeMs, TRAD_TRANSFER_CAPTION_OUT, TRAD_TRANSFER_CAPTION_OUT + 500)));

  /* ═══════════════════════════════════════════════════════════════
     PHASE 3: Traditional — Transcode to variants
     Per-segment, per-row: pipeline chunks copy into variant rows.
     Order: all 6 segments into 1080p, then 720p, then 480p.
     ═══════════════════════════════════════════════════════════════ */
  const transcodeDur = TRAD_TRANSCODE_END - TRAD_TRANSCODE_START;
  const totalTranscodeSteps = NUM_SEGS * 3; // 6 segs × 3 rows
  const transcodeStepDur = transcodeDur / totalTranscodeSteps;
  const transcodeChunkTravel = transcodeStepDur * 1.6;

  // Each step: { row, seg, progress }
  const VARIANT_ROWS = [
    { color: COL_1080, label: "1080p", yOff: 0.28 },
    { color: COL_720, label: "720p", yOff: 0 },
    { color: COL_480, label: "480p", yOff: -0.28 },
  ];

  // Track which segments are filled in each row
  const variantFilled: number[][] = [[], [], []];
  const transcodeChunks: { row: number; seg: number; p: number }[] = [];

  for (let row = 0; row < 3; row++) {
    for (let seg = 0; seg < NUM_SEGS; seg++) {
      const stepIndex = row * NUM_SEGS + seg;
      const t0 = TRAD_TRANSCODE_START + stepIndex * transcodeStepDur;
      const p = easeInOut(prog(timeMs, t0, t0 + transcodeChunkTravel));
      if (p > 0) {
        transcodeChunks.push({ row, seg, p });
      }
      if (p >= 1) {
        variantFilled[row].push(seg);
      }
    }
  }

  const transcodeCaptionOpa =
    easeOut(prog(timeMs, TRAD_TRANSCODE_CAPTION_IN, TRAD_TRANSCODE_CAPTION_IN + 500)) *
    (1 - easeOut(prog(timeMs, TRAD_TRANSCODE_CAPTION_OUT, TRAD_TRANSCODE_CAPTION_OUT + 500)));

  // Variant bar appearance: each row fades in as its first segment starts
  const variantRowOpa = VARIANT_ROWS.map((_, row) => {
    const firstStepStart = TRAD_TRANSCODE_START + row * NUM_SEGS * transcodeStepDur;
    return easeOut(prog(timeMs, firstStepStart, firstStepStart + 400));
  });

  /* ═══════════════════════════════════════════════════════════════
     PHASE 4: Traditional — Client requests
     Request lines from player → 1080p variant.
     Chunks travel along line to player. Lines persist until arrival.
     ═══════════════════════════════════════════════════════════════ */
  const tradPlayerOpa = easeOut(prog(timeMs, TRAD_PLAYER_IN, TRAD_PLAYER_IN + 500));
  const tradPlaying = easeOut(prog(timeMs, TRAD_PLAY, TRAD_PLAY + 500));

  const tradRequestDur = TRAD_REQUEST_END - TRAD_REQUEST_START;
  const tradReqDelay = tradRequestDur / 3;
  const tradReqTravel = tradReqDelay * 1.2;

  type TradReq = { seg: number; reqP: number; chunkP: number; delivered: boolean };
  const tradRequests: TradReq[] = [];
  const tradBufferedSegs: number[] = [];
  const tradReqSegs = [0, 1, 2];
  for (let i = 0; i < 3; i++) {
    const reqStart = TRAD_REQUEST_START + i * tradReqDelay;
    const reqP = easeInOut(prog(timeMs, reqStart, reqStart + 400));
    const chunkStart = reqStart + 300;
    const chunkP = easeInOut(prog(timeMs, chunkStart, chunkStart + tradReqTravel));
    const delivered = chunkP >= 0.98;
    tradRequests.push({ seg: tradReqSegs[i], reqP, chunkP, delivered });
    if (delivered) tradBufferedSegs.push(tradReqSegs[i]);
  }

  const requestCaptionOpa =
    easeOut(prog(timeMs, TRAD_REQUEST_CAPTION_IN, TRAD_REQUEST_CAPTION_IN + 500)) *
    (1 - easeOut(prog(timeMs, TRAD_REQUEST_CAPTION_OUT, TRAD_REQUEST_CAPTION_OUT + 500)));

  const tradSummaryOpa = easeOut(prog(timeMs, TRAD_PLAY + 200, TRAD_PLAY + 600)) * tradDim;

  /* ═══════════════════════════════════════════════════════════════
     PHASE 5: Transition
     ═══════════════════════════════════════════════════════════════ */
  const transOpa =
    easeOut(prog(timeMs, TRANS_START + 200, TRANS_START + 600)) *
    (1 - easeOut(prog(timeMs, TRANS_END - 300, TRANS_END)));

  /* ═══════════════════════════════════════════════════════════════
     PHASE 6: JIT setup
     ═══════════════════════════════════════════════════════════════ */
  const jitSourceOpa = easeOut(prog(timeMs, JIT_SETUP_START, JIT_SETUP_START + 600));
  const jitGhostOpa = easeOut(prog(timeMs, JIT_GHOST_IN, JIT_GHOST_IN + 800));
  const jitPlayerOpa = easeOut(prog(timeMs, JIT_PLAYER_IN, JIT_PLAYER_IN + 500));

  const jitSetupCaptionOpa =
    easeOut(prog(timeMs, JIT_SETUP_CAPTION_IN, JIT_SETUP_CAPTION_IN + 500)) *
    (1 - easeOut(prog(timeMs, JIT_SETUP_CAPTION_OUT, JIT_SETUP_CAPTION_OUT + 500)));

  /* ═══════════════════════════════════════════════════════════════
     PHASE 7: JIT cycles
     Request line: player → ghost segment → source bar.
     Line persists until chunk arrives. Chunk travels source → player.
     ═══════════════════════════════════════════════════════════════ */
  type JitCycle = { start: number; arrive: number; end: number; seg: number };
  const jitCycles: JitCycle[] = [
    { start: JIT_CYC1_START, arrive: JIT_CYC1_ARRIVE, end: JIT_CYC1_END, seg: 0 },
    { start: JIT_CYC2_START, arrive: JIT_CYC2_ARRIVE, end: JIT_CYC2_END, seg: 4 },
    { start: JIT_CYC3_START, arrive: JIT_CYC3_ARRIVE, end: JIT_CYC3_END, seg: 2 },
  ];

  const jitFilledSegs = jitCycles.filter(c => timeMs >= c.arrive).map(c => c.seg);
  const jitPlaying = easeOut(prog(timeMs, JIT_PLAY, JIT_PLAY + 500));

  /* ═══════════════════════════════════════════════════════════════
     PHASE 8: Punchline
     ═══════════════════════════════════════════════════════════════ */
  const punchOpa = easeOut(prog(timeMs, P8_START + 200, P8_START + 600));
  const tagOpa = easeOut(prog(timeMs, P8_START + 800, P8_START + 1200));

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      <CameraController timeMs={timeMs} />
      <Lighting timeMs={timeMs} />
      <Floor />

      {/* ── Phase 1: Hero — solid bar ── */}
      <SolidBar
        opacity={heroOpa * heroFade}
        position={[0, SIDE_Y, SOURCE_Z]}
        label="video.mp4"
      />
      <SceneLabel position={[0, 0.65, SOURCE_Z + 0.2]} opacity={titleOpa} fontSize={0.18} bold>
        A video on a remote URL.
      </SceneLabel>

      {/* ── Phase 2: Transfer caption ── */}
      <SceneLabel position={[TRAD_X, 0.65, PIPELINE_Z - 0.5]} opacity={transferCaptionOpa * tradDim} color="#cccccc" fontSize={0.12}>
        File must be transferred into a processing pipeline
      </SceneLabel>

      {/* Source bar (traditional) — segments disappear as they peel off */}
      {timeMs >= TRAD_TRANSFER_START && (
        <FilmstripBar
          opacity={tradDim}
          position={[TRAD_X, SIDE_Y, SOURCE_Z]}
          label="source"
          missingSegs={tradTransferred}
        />
      )}

      {/* Chunks in flight: source → pipeline */}
      {tradChunkProgs.map((p, i) => {
        if (p <= 0 || p >= 1) return null;
        return (
          <Chunk key={`xfer-${i}`} opacity={0.85 * tradDim} color={COL_TRAD}
            position={[
              TRAD_X + segX(i),
              SIDE_Y + Math.sin(p * Math.PI) * 0.3,
              lerp(SOURCE_Z, PIPELINE_Z, p),
            ]} />
        );
      })}

      {/* Pipeline copy — orange bar at PIPELINE_Z */}
      {pipelineOpa > 0.01 && (
        <FilmstripBar
          opacity={pipelineOpa * tradDim}
          position={[TRAD_X, SIDE_Y, PIPELINE_Z]}
          label="copy on service"
          color={COL_TRAD}
          scale={0.9}
        />
      )}

      {/* ── Phase 3: Transcode caption ── */}
      <SceneLabel position={[TRAD_X, 0.65, VARIANT_Z - 0.5]} opacity={transcodeCaptionOpa * tradDim} color="#cccccc" fontSize={0.12}>
        Different streaming bitrates are generated
      </SceneLabel>

      {/* Variant bars — fade in row by row, fill segment by segment */}
      {VARIANT_ROWS.map((row, ri) => (
        <VariantBar
          key={ri}
          opacity={variantRowOpa[ri] * tradDim}
          color={row.color}
          position={[TRAD_X, SIDE_Y + row.yOff, VARIANT_Z]}
          label={row.label}
          scale={0.75}
          filledSegs={variantFilled[ri]}
        />
      ))}

      {/* Transcode chunks in flight: pipeline → variant rows */}
      {transcodeChunks.map(({ row, seg, p }) => {
        if (p <= 0 || p >= 1) return null;
        const rowData = VARIANT_ROWS[row];
        return (
          <Chunk
            key={`tc-${row}-${seg}`}
            opacity={0.7 * tradDim}
            color={rowData.color}
            position={[
              TRAD_X + segX(seg) * 0.75,
              SIDE_Y + lerp(0, rowData.yOff, p) + Math.sin(p * Math.PI) * 0.15,
              lerp(PIPELINE_Z, VARIANT_Z, p),
            ]}
          />
        );
      })}

      {/* ── Phase 4: Client requests caption ── */}
      <SceneLabel position={[TRAD_X, 0.65, PLAYER_Z - 0.5]} opacity={requestCaptionOpa * tradDim} color="#cccccc" fontSize={0.12}>
        Finally, the client can request segments
      </SceneLabel>

      {/* Traditional player */}
      <VideoPlayer
        opacity={tradPlayerOpa * tradDim}
        playing={tradPlaying}
        position={[TRAD_X, -0.35, PLAYER_Z]}
        bufferedSegs={tradBufferedSegs}
        bufferColor={COL_1080}
      />

      {/* Traditional request beams + chunks */}
      {tradRequests.map((req, i) => {
        const { seg, reqP, chunkP, delivered } = req;
        // Beam from player → 1080p variant segment
        const varSegX = TRAD_X + segX(seg) * 0.75;
        const varSegY = SIDE_Y + VARIANT_ROWS[0].yOff;
        const beamOpa = reqP > 0.01 ? (delivered ? Math.max(0, 1 - (chunkP - 0.98) * 50) : 1) * 0.5 * tradDim : 0;

        return (
          <React.Fragment key={`treq-${i}`}>
            {beamOpa > 0.01 && (
              <RequestBeam
                from={[TRAD_X, -0.35, PLAYER_Z]}
                to={[varSegX, varSegY, VARIANT_Z]}
                progress={reqP}
                opacity={beamOpa}
                color={COL_1080}
              />
            )}
            {chunkP > 0 && !delivered && (
              <Chunk
                opacity={0.85 * tradDim}
                color={COL_1080}
                position={[
                  lerp(varSegX, TRAD_X, chunkP),
                  lerp(varSegY, -0.35, chunkP) + Math.sin(chunkP * Math.PI) * 0.15,
                  lerp(VARIANT_Z, PLAYER_Z, chunkP),
                ]}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Traditional summary */}
      <SceneLabel position={[TRAD_X, -0.75, PLAYER_Z + 0.5]} opacity={tradSummaryOpa} color="#888888" fontSize={0.10}>
        Upload. Transcode. Store. Then play.
      </SceneLabel>

      {/* ── Phase 5: Transition ── */}
      <SceneLabel position={[0, 0.65, PIPELINE_Z + 1]} opacity={transOpa} fontSize={0.22} bold>
        What if you didn't need all that?
      </SceneLabel>

      {/* ═══ JIT SIDE ═══════════════════════════════════════════════ */}

      {/* JIT source bar — stays whole, highlights active segment */}
      {timeMs >= JIT_SETUP_START && (
        <FilmstripBar
          opacity={jitSourceOpa}
          position={[JIT_X, SIDE_Y, SOURCE_Z]}
          label="video.mp4 — same URL"
        />
      )}

      {/* Ghost variant grid */}
      {jitGhostOpa > 0.01 && (
        <group position={[JIT_X, SIDE_Y, VARIANT_Z]}>
          <GhostVariantBar opacity={jitGhostOpa} color={COL_1080} position={[0, 0.28, 0]} label="1080p" scale={0.75} filledSegs={jitFilledSegs} />
          <GhostVariantBar opacity={jitGhostOpa * 0.7} color={COL_720} position={[0, 0, 0]} label="720p" scale={0.75} />
          <GhostVariantBar opacity={jitGhostOpa * 0.5} color={COL_480} position={[0, -0.28, 0]} label="480p" scale={0.75} />
        </group>
      )}

      {/* JIT player */}
      <VideoPlayer
        opacity={jitPlayerOpa}
        playing={jitPlaying}
        position={[JIT_X, -0.35, PLAYER_Z]}
        bufferedSegs={jitFilledSegs}
        bufferColor={COL_1080}
      />

      {/* JIT setup caption */}
      <SceneLabel position={[JIT_X, 0.65, VARIANT_Z - 0.5]} opacity={jitSetupCaptionOpa} color={COL_EF} fontSize={0.12}>
        Client requests before content is processed
      </SceneLabel>

      {/* JIT cycles: request beam + chunk delivery */}
      {jitCycles.map((c, ci) => {
        const active = timeMs >= c.start;
        if (!active) return null;

        // Request beam draw-in: player → ghost → source
        const beamDrawP = easeInOut(prog(timeMs, c.start, c.start + 600));
        // Beam stays visible until chunk arrives, then fades
        const fadeAfterArrive = easeOut(prog(timeMs, c.arrive, c.end));
        const beamOpa = beamDrawP > 0 ? (1 - fadeAfterArrive) * 0.6 : 0;

        // Ghost segment position (1080p row)
        const ghostSegX = JIT_X + segX(c.seg) * 0.75;
        const ghostSegY = SIDE_Y + 0.28;

        // Source segment position
        const sourceSegX = JIT_X + segX(c.seg);
        const sourceSegY = SIDE_Y;

        // Chunk travels from source → player along the line
        const chunkP = easeInOut(prog(timeMs, c.start + 500, c.arrive));
        const chunkInFlight = chunkP > 0 && chunkP < 1;
        const delivered = timeMs >= c.arrive;

        return (
          <React.Fragment key={`jcyc-${ci}`}>
            {/* Beam: player → source (through ghost) */}
            {beamOpa > 0.01 && (
              <RequestBeam
                from={[JIT_X, -0.35, PLAYER_Z]}
                to={[sourceSegX, sourceSegY, SOURCE_Z]}
                progress={beamDrawP}
                opacity={beamOpa}
                color={COL_EF}
              />
            )}

            {/* Pulse at ghost segment when beam passes through */}
            {beamDrawP > 0.3 && beamDrawP < 0.8 && (
              <pointLight
                position={[ghostSegX, ghostSegY, VARIANT_Z]}
                color={COL_EF}
                intensity={3 * (1 - Math.abs(beamDrawP - 0.5) * 4)}
                distance={2}
              />
            )}

            {/* Chunk in flight: source → player */}
            {chunkInFlight && (
              <Chunk
                opacity={0.9}
                color={COL_1080}
                position={[
                  lerp(sourceSegX, JIT_X, chunkP),
                  lerp(sourceSegY, -0.35, chunkP) + Math.sin(chunkP * Math.PI) * 0.2,
                  lerp(SOURCE_Z, PLAYER_Z, chunkP),
                ]}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* JIT summary */}
      <SceneLabel position={[JIT_X, -0.75, PLAYER_Z + 0.5]} opacity={easeOut(prog(timeMs, JIT_PLAY + 200, JIT_PLAY + 600))} color={COL_EF} fontSize={0.10}>
        Already playing.
      </SceneLabel>

      {/* ── Phase 8: Punchline ── */}
      <SceneLabel
        position={[JIT_X + 0.3, -0.15, PLAYER_Z + 1.5 + punchOpa * 0.4]}
        opacity={punchOpa} color={COL_DONE} fontSize={0.30} bold
      >
        Instant playback
      </SceneLabel>
      <SceneLabel
        position={[JIT_X + 0.3, -0.42, PLAYER_Z + 1.5 + tagOpa * 0.4]}
        opacity={tagOpa} color="#aaaaaa" fontSize={0.11}
      >
        No upload. No transcoding queue. Just the chunks you need.
      </SceneLabel>
    </>
  );
}
