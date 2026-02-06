// @ts-nocheck - React Three Fiber JSX intrinsics
/**
 * React Three Fiber version of the parallel fragments 3D scene.
 * Componentized for easier iteration.
 */

import { Suspense, useRef, useMemo, useState, useLayoutEffect, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { flushSync } from "react-dom";
import { Timegroup } from "@editframe/react";
import * as THREE from "three";
import { GLSync, InvalidateOnTimeChange, flushR3F } from "./r3f-sync";

/* ━━ Easing & helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }
function prog(ms: number, s: number, e: number) { return clamp01((ms - s) / (e - s)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* ━━ Constants (shared with vanilla scene) ━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_VIDEO = "#448aff";
const COL_AUDIO = "#1de9b6";
const COL_TEXT_TRACK = "#ffd740";
const COL_BLUE_LT = "#82b1ff";
const COL_DONE = "#69f0ae";
const COL_SEQ_FILL = "#ff8a65";

const NUM_SEGS = 4;
const SEG_W = 1.1;
const SEG_GAP = 0.06;
const TRACK_D = 0.35;
const TRACK_H = [0.16, 0.10, 0.06] as const;
const TRACK_COLOR = [COL_VIDEO, COL_AUDIO, COL_TEXT_TRACK] as const;
const TRACK_Y = [0.15, 0.0, -0.09] as const;
const TOTAL_W = SEG_W * NUM_SEGS + SEG_GAP * (NUM_SEGS - 1);

const UNIFIED_CLIPS = [
  { track: 0, startPct: 0, endPct: 1.0 },
  { track: 1, startPct: 0.02, endPct: 0.68 },
  { track: 1, startPct: 0.74, endPct: 0.98 },
  { track: 2, startPct: 0.05, endPct: 0.22 },
  { track: 2, startPct: 0.38, endPct: 0.58 },
  { track: 2, startPct: 0.72, endPct: 0.92 },
] as const;

const CLIP_LAYOUTS = [
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.85, xPct: 0.05 }, { wPct: 0.35, xPct: 0.32 }],
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.65, xPct: 0.20 }, { wPct: 0.50, xPct: 0.05 }],
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.90, xPct: 0 },    { wPct: 0.30, xPct: 0.55 }],
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.55, xPct: 0.25 }, { wPct: 0.45, xPct: 0.28 }],
] as const;

const NODE_SIZE = 0.45;
const LANE_SPREAD = 1.0;
const PROG_H = 0.16;

const P1_END = 2200;
const P_PULLBACK_START = 1800;
const P_PULLBACK_END = 3500;
const P2_START = 3000;
const P2_END = 5000;
const P3_START = 4500;
const P3_END = 6200;
const P4_START = 6200;
const P4_PAR_DONE = 8800;
const P5_START = 9200;
const P5_END = 14000;

const SEQ_X = -2.8;
const PAR_X = 2.8;
const NODE_Z = 2.2;

/* ━━ Reusable Components ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TrackClip({ width, height, depth, x, y, color, opacity, emissive, castShadow: cs }: {
  width: number; height: number; depth: number;
  x: number; y: number;
  color: string; opacity: number; emissive: number;
  castShadow?: boolean;
}) {
  return (
    <mesh position={[x, y, 0]} castShadow={cs && opacity > 0.1}>
      <boxGeometry args={[width, height, depth]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.12}
        metalness={0.15}
        clearcoat={1.0}
        clearcoatRoughness={0.15}
        transparent
        opacity={opacity}
        emissive={color}
        emissiveIntensity={emissive}
      />
    </mesh>
  );
}

function TrackBackdrop({ width, opacity }: { width: number; opacity: number }) {
  return (
    <mesh position={[0, 0.02, 0]} receiveShadow>
      <boxGeometry args={[width, 0.40, TRACK_D + 0.02]} />
      <meshStandardMaterial color="#3d4158" roughness={0.8} transparent opacity={opacity} />
    </mesh>
  );
}

function UnifiedTimeline({ opacity, emissive, y }: {
  opacity: number; emissive: number; y: number;
}) {
  const totalTight = SEG_W * NUM_SEGS;
  return (
    <group position={[0, y, 0]} visible={opacity > 0.01}>
      <TrackBackdrop width={totalTight} opacity={opacity * 0.6} />
      {UNIFIED_CLIPS.map((clip, i) => {
        const clipW = totalTight * (clip.endPct - clip.startPct);
        const clipX = -totalTight / 2 + totalTight * clip.startPct + clipW / 2;
        return (
          <TrackClip
            key={i}
            width={clipW} height={TRACK_H[clip.track]!} depth={TRACK_D}
            x={clipX} y={TRACK_Y[clip.track]!}
            color={TRACK_COLOR[clip.track]!} opacity={opacity} emissive={emissive}
            castShadow
          />
        );
      })}
    </group>
  );
}

function SegmentGroup({ segIndex, position, scale, opacity, emissive, visible }: {
  segIndex: number;
  position: [number, number, number];
  scale: number;
  opacity: number;
  emissive: number;
  visible: boolean;
}) {
  const layout = CLIP_LAYOUTS[segIndex]!;
  return (
    <group position={position} scale={scale} visible={visible}>
      <TrackBackdrop width={SEG_W} opacity={opacity * 0.6} />
      {layout.map((clip, t) => {
        const clipW = SEG_W * clip.wPct;
        const clipX = -SEG_W / 2 + SEG_W * clip.xPct + clipW / 2;
        return (
          <TrackClip
            key={t}
            width={clipW} height={TRACK_H[t]!} depth={TRACK_D}
            x={clipX} y={TRACK_Y[t]!}
            color={TRACK_COLOR[t]!} opacity={opacity} emissive={emissive}
            castShadow
          />
        );
      })}
    </group>
  );
}

function RenderNode({ position, opacity, edgeOpacity, emissive, rotation }: {
  position: [number, number, number];
  opacity: number;
  edgeOpacity: number;
  emissive: number;
  rotation: number;
}) {
  return (
    <group position={position}>
      <mesh castShadow={opacity > 0.1} rotation={[0, rotation, 0]}>
        <boxGeometry args={[NODE_SIZE, NODE_SIZE, NODE_SIZE]} />
        <meshPhysicalMaterial
          color="#505870"
          roughness={0.2}
          metalness={0.4}
          clearcoat={0.7}
          clearcoatRoughness={0.2}
          transparent
          opacity={opacity}
          emissive={COL_BLUE_LT}
          emissiveIntensity={emissive}
        />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(NODE_SIZE, NODE_SIZE, NODE_SIZE)]} />
          <lineBasicMaterial color={COL_BLUE_LT} transparent opacity={edgeOpacity} />
        </lineSegments>
      </mesh>
    </group>
  );
}

function ProgressBar({ x, z, width, fillProgress, fillColor, emitColor, bgOpacity, fillOpacity }: {
  x: number; z: number; width: number;
  fillProgress: number;
  fillColor: string; emitColor: string;
  bgOpacity: number; fillOpacity: number;
}) {
  const fillX = x - width / 2 * (1 - fillProgress);
  return (
    <group>
      <mesh position={[x, -0.68, z]}>
        <boxGeometry args={[width, PROG_H, 0.15]} />
        <meshStandardMaterial color="#555555" roughness={0.8} transparent opacity={bgOpacity} />
      </mesh>
      <mesh position={[fillX, -0.68, z]} scale={[fillProgress, 1, 1]}>
        <boxGeometry args={[width, PROG_H + 0.02, 0.16]} />
        <meshPhysicalMaterial
          color={fillColor}
          roughness={0.2}
          metalness={0.3}
          clearcoat={0.5}
          transparent
          opacity={fillOpacity}
          emissive={emitColor}
          emissiveIntensity={0.25}
        />
      </mesh>
    </group>
  );
}

function LaserCutLine({ x, y, opacity }: { x: number; y: number; opacity: number }) {
  return (
    <mesh position={[x, y, 0.01]}>
      <planeGeometry args={[0.04, 1.5]} />
      <meshBasicMaterial
        color="white"
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Particles({ timeMs, visible }: { timeMs: number; visible: boolean }) {
  const count = 500;
  const { speeds, lanes } = useMemo(() => {
    const s = new Float32Array(count);
    const l = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = 0.4 + Math.random() * 1.2;
      l[i] = Math.floor(Math.random() * NUM_SEGS);
    }
    return { speeds: s, lanes: l };
  }, []);

  const ref = useRef<THREE.Points>(null);

  useFrame(() => {
    if (!ref.current || !visible) return;
    const positions = (ref.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let p = 0; p < count; p++) {
      const lane = lanes[p]!;
      const speed = speeds[p]!;
      const lx = PAR_X + (lane - 1.5) * LANE_SPREAD;
      const t = ((timeMs - P4_START) * speed * 0.001 + p * 0.1) % 3.5 - 1.75;
      positions[p * 3] = lx + (Math.random() - 0.5) * 0.4;
      positions[p * 3 + 1] = -0.7 + Math.sin(t * 2) * 0.25 + (Math.random() - 0.5) * 0.12;
      positions[p * 3 + 2] = NODE_Z + t * 0.5;
    }
    ref.current.geometry.attributes.position!.needsUpdate = true;
  });

  const positions = useMemo(() => new Float32Array(count * 3), []);

  return (
    <points ref={ref} visible={visible}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color={COL_BLUE_LT}
        size={0.08}
        transparent
        opacity={visible ? 0.85 : 0}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function CompleteBlock({ opacity, emissive, scaleY, position, castShadow: cs }: {
  opacity: number; emissive: number; scaleY: number;
  position: [number, number, number];
  castShadow: boolean;
}) {
  return (
    <mesh position={position} scale={[1, scaleY, 1]} castShadow={cs}>
      <boxGeometry args={[TOTAL_W * 0.7, 0.25, 0.35]} />
      <meshPhysicalMaterial
        color={COL_DONE}
        roughness={0.2}
        metalness={0.3}
        clearcoat={0.8}
        transparent
        opacity={opacity}
        emissive={COL_DONE}
        emissiveIntensity={emissive}
      />
    </mesh>
  );
}

/* ━━ Camera Controller ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function CameraController({ timeMs }: { timeMs: number }) {
  const { camera } = useThree();

  useFrame(() => {
    const camPullBack = easeInOut(prog(timeMs, P_PULLBACK_START, P_PULLBACK_END));
    const camOrbit = easeOut(prog(timeMs, P5_START, P5_END));

    let cx = lerp(0, 0, camPullBack);
    let cy = lerp(0.8, 3.8, camPullBack);
    let cz = lerp(2.8, 10, camPullBack);
    let tx = lerp(0, 0, camPullBack);
    let ty = lerp(0.25, -0.1, camPullBack);
    let tz = lerp(0, 1.2, camPullBack);

    if (camOrbit > 0) {
      cx = lerp(cx, 2.0, camOrbit);
      cy = lerp(cy, 3.0, camOrbit);
      cz = lerp(cz, 8, camOrbit);
      tx = lerp(tx, 1.5, camOrbit);
      ty = lerp(ty, 0, camOrbit);
      tz = lerp(tz, 2.0, camOrbit);
    }

    // Snap zoom
    const snapProg = prog(timeMs, P5_START, P5_START + 300);
    if (snapProg > 0 && snapProg < 1) {
      cz -= Math.sin(snapProg * Math.PI) * 0.3;
    }

    // Subtle shake
    if (timeMs >= P4_START && timeMs < P4_PAR_DONE) {
      cx += Math.sin(timeMs * 0.007) * 0.015;
      cy += Math.cos(timeMs * 0.011) * 0.015;
    }

    camera.position.set(cx, cy, cz);
    camera.lookAt(tx, ty, tz);
  });

  return null;
}

/* ━━ Lighting ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Lighting({ timeMs }: { timeMs: number }) {
  const rimRef = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (rimRef.current) rimRef.current.intensity = 0.9 + Math.sin(timeMs * 0.0015) * 0.15;
  });

  return (
    <>
      <ambientLight color="#d0d8f0" intensity={0.9} />
      <directionalLight
        position={[3, 8, 5]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-3, 4, -2]} color="#aaccff" intensity={0.6} />
      <pointLight ref={rimRef} position={[0, 2, -3]} color={COL_BLUE_LT} intensity={0.9} distance={25} />
      <spotLight position={[0, 6, 5]} intensity={2.0} distance={25} angle={Math.PI / 5} penumbra={0.4} decay={1} />
    </>
  );
}

/* ━━ Floor + Grid ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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

/* ━━ 3D Text Labels (drei Text) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SceneLabel({ children, position, opacity, color = "white", fontSize = 0.18, bold, anchorX = "center" }: {
  children: string;
  position: [number, number, number];
  opacity: number;
  color?: string;
  fontSize?: number;
  bold?: boolean;
  anchorX?: "left" | "center" | "right";
}) {
  if (opacity < 0.01) return null;
  return (
    <Text
      position={position}
      fontSize={fontSize}
      color={color}
      anchorX={anchorX}
      anchorY="middle"
      fontWeight={bold ? "bold" : "normal"}
      fillOpacity={opacity}
      outlineWidth={fontSize * 0.08}
      outlineColor="#000000"
      outlineOpacity={opacity * 0.6}
    >
      {children}
    </Text>
  );
}

function DurationLabel({ x, y, z, opacity, text }: {
  x: number; y: number; z: number; opacity: number; text: string;
}) {
  if (opacity < 0.01) return null;
  return (
    <Text
      position={[x, y, z]}
      fontSize={0.12}
      color={COL_BLUE_LT}
      anchorX="center"
      anchorY="middle"
      fillOpacity={opacity}
      outlineWidth={0.008}
      outlineColor="#000000"
      outlineOpacity={opacity * 0.5}
    >
      {text}
    </Text>
  );
}

/* ━━ Main Scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function ParallelFragmentsR3FScene({ currentTimeMs: timeMs }: { currentTimeMs: number }) {

  // ── Compute all animation state from timeMs ──────────────────
  const p1 = easeOut(prog(timeMs, 0, P1_END));
  const p2 = easeInOut(prog(timeMs, P2_START, P2_END));
  const crossfade = easeOut(prog(timeMs, P2_START + 200, P2_START + 600));
  const nodeFade = easeOut(prog(timeMs, P3_START + 300, P3_END));
  const flyIn = easeOut(prog(timeMs, P4_START, P4_START + 700));
  const processing = prog(timeMs, P4_START + 700, P4_PAR_DONE);
  const p5 = easeOut(prog(timeMs, P5_START, P5_END));

  const inP2 = timeMs >= P2_START;
  const inP3 = timeMs >= P3_START;
  const inP4 = timeMs >= P4_START;
  const inP5 = timeMs >= P5_START;
  const parDone = timeMs >= P4_PAR_DONE;

  const segTightX = (i: number) => {
    const totalTight = SEG_W * NUM_SEGS;
    return -totalTight / 2 + SEG_W / 2 + i * SEG_W;
  };
  const segJoinedX = (i: number) => -TOTAL_W / 2 + SEG_W / 2 + i * (SEG_W + SEG_GAP);

  // ── Unified timeline state ──
  const unifiedOpacity = inP2 ? (1 - crossfade) : p1;
  const unifiedY = lerp(1.0, 0.3, p1);

  // ── Sequential state ──
  const seqAppear = inP2 ? easeOut(prog(timeMs, P2_START + 300, P2_END)) : 0;
  const seqX = inP4 ? SEQ_X : lerp(0, SEQ_X, seqAppear);
  const seqY = inP4 ? lerp(0.3, 0, flyIn) : 0.3;
  const seqZ = inP4 ? lerp(0.5, NODE_Z - 0.3, flyIn) : lerp(0, 0.5, seqAppear);
  const seqScale = inP5 ? lerp(0.50, 0.35, p5) : inP4 ? lerp(1, 0.50, flyIn) : 1;
  const seqOpacity = inP5 ? lerp(0.3, 0.12, p5) : inP4 ? lerp(0.55, 0.3, processing) : seqAppear * 0.55;

  // ── Segment positions ──
  const gapOpen = inP2 ? easeOut(prog(timeMs, P2_START + 200, P2_START + 700)) : 0;
  const slideRight = inP2 ? easeInOut(prog(timeMs, P2_START + 500, P2_END)) : 0;

  // ── Sequential progress ──
  const seqElapsed = Math.max(0, timeMs - P4_START);
  const seqTotalTime = P5_END - P4_START;
  const seqFill = easeOut(clamp01(seqElapsed / seqTotalTime));

  // ── Laser cuts ──
  const cutBrightness = (c: number) => {
    if (!inP2) return 0;
    const delay = c * 120;
    const cp = prog(timeMs, P2_START + delay, P2_START + delay + 200);
    const cf = prog(timeMs, P2_START + delay + 150, P2_START + delay + 600);
    return cp * (1 - cf);
  };

  const barJitter = [0, 0.06, -0.04, 0.03] as const;

  // ── 3D text opacity calculations ──
  const titleOpacity = easeOut(prog(timeMs, 300, 800)) * (1 - easeOut(prog(timeMs, 1800, 2200)));
  const questionOpacity = easeOut(prog(timeMs, 2200, 2600)) * (1 - easeOut(prog(timeMs, 2900, 3200)));
  const sideLabelsOpacity = easeOut(prog(timeMs, P2_START + 400, P2_START + 800));
  const subLabelsOpacity = easeOut(prog(timeMs, P2_START + 700, P2_START + 1100));
  const segDurationOpacity = inP2 ? easeOut(prog(timeMs, P2_START + 600, P2_START + 1000)) : 0;
  const processingOpacity = easeOut(prog(timeMs, P4_START + 1000, P4_START + 1400)) * (1 - easeOut(prog(timeMs, P4_PAR_DONE - 500, P4_PAR_DONE)));
  const punchlineOpacity = easeOut(prog(timeMs, P5_START + 200, P5_START + 600));
  const taglineOpacity = easeOut(prog(timeMs, P5_START + 800, P5_START + 1200));

  return (
    <>
      <CameraController timeMs={timeMs} />
      <Lighting timeMs={timeMs} />
      <Floor />

      {/* ── 3D Text Labels ──────────────────────────────────────── */}
      {/* Phase 1: Hero title */}
      <SceneLabel position={[0, 0.7, 0.2]} opacity={titleOpacity} fontSize={0.22} bold>
        A 60-second video composition
      </SceneLabel>

      {/* Phase 2 intro: The question */}
      <SceneLabel position={[0, 0.7, 0.2]} opacity={questionOpacity} fontSize={0.22} bold>
        How do you render it?
      </SceneLabel>

      {/* Side labels: Traditional vs Editframe */}
      <SceneLabel position={[SEQ_X, 0.7, 0.5]} opacity={sideLabelsOpacity * (inP5 ? lerp(1, 0.2, p5) : 1)} color="#888888" fontSize={0.2} bold>
        Traditional
      </SceneLabel>
      <SceneLabel position={[SEQ_X, 0.55, 0.5]} opacity={subLabelsOpacity * (inP5 ? lerp(1, 0.15, p5) : 1)} color="#777777" fontSize={0.11}>
        One worker, start to finish
      </SceneLabel>

      <SceneLabel position={[PAR_X, 0.7, 0.5]} opacity={sideLabelsOpacity} color={COL_BLUE_LT} fontSize={0.2} bold>
        Editframe
      </SceneLabel>
      <SceneLabel position={[PAR_X, 0.55, 0.5]} opacity={subLabelsOpacity} color="#aaaaaa" fontSize={0.11}>
        Split into fragments, render in parallel
      </SceneLabel>

      {/* Duration labels on each segment after split */}
      {Array.from({ length: NUM_SEGS }, (_, s) => {
        const parLaneX = PAR_X + (s - 1.5) * LANE_SPREAD;
        const segZ = inP4 ? lerp(0.5, NODE_Z, flyIn) : lerp(0, 0.5, p2);
        return (
          <DurationLabel
            key={`dur-${s}`}
            x={inP4 ? parLaneX : lerp(lerp(segTightX(s), segJoinedX(s), gapOpen), parLaneX, slideRight)}
            y={-0.15}
            z={segZ + 0.2}
            opacity={segDurationOpacity * (inP4 ? lerp(1, 0.5, flyIn) : 1)}
            text="15s"
          />
        );
      })}

      {/* Processing narration */}
      <SceneLabel position={[PAR_X, -1.1, NODE_Z + 1.2]} opacity={processingOpacity} color="#aaaaaa" fontSize={0.12}>
        All workers process simultaneously
      </SceneLabel>

      {/* Punchline */}
      <SceneLabel position={[PAR_X + 0.3, -0.2, NODE_Z + 2.0 + (inP5 ? p5 * 0.6 : 0)]} opacity={punchlineOpacity} color={COL_BLUE_LT} fontSize={0.35} bold>
        {"4\u00d7 faster"}
      </SceneLabel>
      <SceneLabel position={[PAR_X + 0.3, -0.5, NODE_Z + 2.0 + (inP5 ? p5 * 0.6 : 0)]} opacity={taglineOpacity} color="#aaaaaa" fontSize={0.12}>
        Same quality. A fraction of the time.
      </SceneLabel>

      {/* Phase 1: Unified timeline */}
      <UnifiedTimeline opacity={unifiedOpacity} emissive={lerp(0, 0.1, p1)} y={unifiedY} />

      {/* Sequential copy (unified look) */}
      <group position={[seqX, seqY, seqZ]} scale={seqScale} visible={inP2}>
        <UnifiedTimeline opacity={seqOpacity} emissive={0.02} y={0} />
      </group>

      {/* Laser cut lines */}
      {[0, 1, 2].map((c) => (
        <LaserCutLine key={c} x={segTightX(c) + SEG_W / 2} y={0.3} opacity={cutBrightness(c)} />
      ))}
      {inP2 && (
        <pointLight
          position={[0, 0.8, 0.5]}
          intensity={prog(timeMs, P2_START, P2_START + 200) * (1 - prog(timeMs, P2_START + 150, P2_START + 500)) * 8}
          distance={8}
        />
      )}

      {/* Parallel segments */}
      {Array.from({ length: NUM_SEGS }, (_, s) => {
        const tightX = segTightX(s);
        const gappedX = segJoinedX(s);
        const parLaneX = PAR_X + (s - 1.5) * LANE_SPREAD;
        const currentX = inP4 ? parLaneX : lerp(lerp(tightX, gappedX, gapOpen), parLaneX, slideRight);
        const segY = inP4 ? lerp(0.3, -0.15, flyIn) : 0.3;
        const segZ = inP4 ? lerp(0.5, NODE_Z + (inP5 ? p5 * 0.6 : 0), flyIn) : lerp(0, 0.5, p2);
        const segScale = inP4 ? lerp(1, 0.60, flyIn) : 1;
        const segOpacity = inP2 ? crossfade : 0;
        const pulse = Math.sin(processing * Math.PI * 6 + s * 1.5) * 0.12;
        const segEmissive = inP4 ? 0.2 + pulse * 0.5 : lerp(0.1, 0.2, p2);

        return (
          <SegmentGroup
            key={s}
            segIndex={s}
            position={[currentX, segY, segZ]}
            scale={segScale}
            opacity={segOpacity}
            emissive={segEmissive}
            visible={inP2}
          />
        );
      })}

      {/* Sequential render node */}
      <RenderNode
        position={[SEQ_X, -0.7, inP5 ? NODE_Z - p5 * 1.5 : NODE_Z]}
        opacity={inP5 ? lerp(0.6, 0.15, p5) : inP3 ? nodeFade * 0.6 : 0}
        edgeOpacity={inP3 ? nodeFade * 0.3 : 0}
        emissive={inP4 ? 0.05 + Math.sin(processing * Math.PI * 3) * 0.03 : 0}
        rotation={inP4 ? Math.sin(processing * Math.PI * 2) * 0.02 : 0}
      />

      {/* Parallel render nodes */}
      {Array.from({ length: NUM_SEGS }, (_, s) => {
        const laneX = PAR_X + (s - 1.5) * LANE_SPREAD;
        const pulse = Math.sin(processing * Math.PI * 6 + s * 1.5) * 0.1;
        return (
          <RenderNode
            key={s}
            position={[laneX, -0.7, inP5 ? NODE_Z + p5 * 0.6 : NODE_Z]}
            opacity={inP3 ? nodeFade * 0.8 : 0}
            edgeOpacity={inP4 ? 0.5 + processing * 0.4 : inP3 ? nodeFade * 0.5 : 0}
            emissive={inP4 && processing > 0 ? 0.3 + pulse : 0}
            rotation={inP4 ? Math.sin(processing * Math.PI * 4 + s) * 0.08 : 0}
          />
        );
      })}

      {/* Sequential progress bar */}
      <ProgressBar
        x={SEQ_X} z={NODE_Z + 0.8} width={TOTAL_W * 0.7}
        fillProgress={inP4 ? seqFill : 0}
        fillColor={COL_SEQ_FILL} emitColor={COL_SEQ_FILL}
        bgOpacity={inP3 ? nodeFade * 0.3 : 0}
        fillOpacity={inP4 ? flyIn * 0.8 : 0}
      />

      {/* Parallel progress bars */}
      {Array.from({ length: NUM_SEGS }, (_, s) => {
        const laneX = PAR_X + (s - 1.5) * LANE_SPREAD;
        const barProg = clamp01(processing + barJitter[s]! * Math.sin(processing * Math.PI));
        return (
          <ProgressBar
            key={s}
            x={laneX} z={NODE_Z + 0.8} width={SEG_W * 0.9}
            fillProgress={inP4 ? easeOut(barProg) : 0}
            fillColor={COL_VIDEO} emitColor={COL_BLUE_LT}
            bgOpacity={inP3 ? nodeFade * 0.3 : 0}
            fillOpacity={inP4 ? flyIn * 0.95 : 0}
          />
        );
      })}

      {/* Particles */}
      <Particles timeMs={timeMs} visible={inP4 && processing > 0 && processing < 1} />

      {/* Complete block */}
      <CompleteBlock
        opacity={parDone ? easeOut(prog(timeMs, P4_PAR_DONE, P4_PAR_DONE + 400)) * 0.95 : 0}
        emissive={parDone ? (inP5 ? 0.6 + Math.sin(p5 * Math.PI * 3) * 0.2 : easeOut(prog(timeMs, P4_PAR_DONE, P4_PAR_DONE + 400)) * 0.6) : 0}
        scaleY={parDone ? lerp(0.2, 1, easeOut(prog(timeMs, P4_PAR_DONE, P4_PAR_DONE + 400))) : 0.2}
        position={[PAR_X, -0.65, inP5 ? NODE_Z + 1.4 + p5 * 0.6 : NODE_Z + 1.4]}
        castShadow={parDone}
      />
    </>
  );
}

/* ━━ Canvas wrapper — just configure and drop in ━━━━━━━━━━━━━━━━━━ */
export function ParallelFragmentsCanvas({ children }: { children?: ReactNode }) {
  const timegroupRef = useRef(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [timeMs, setTimeMs] = useState(0);

  useLayoutEffect(() => {
    const tg = timegroupRef.current;
    if (!tg?.addFrameTask) return;

    return tg.addFrameTask(({ currentTimeMs }: { currentTimeMs: number }) => {
      flushSync(() => {
        setTimeMs(currentTimeMs);
      });

      flushR3F(canvasContainerRef.current);
    });
  }, []);

  return (
    <Timegroup
      ref={timegroupRef}
      mode="fixed"
      duration="14s"
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "16/10", background: "#1e2233" }}
    >
      <div ref={canvasContainerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <Canvas
          shadows
          frameloop="demand"
          dpr={[1, 2]}
          gl={{
            preserveDrawingBuffer: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.8,
          }}
          camera={{ fov: 50, near: 0.1, far: 100 }}
          scene={{ background: new THREE.Color(0x1e2233), fog: new THREE.Fog(0x1e2233, 16, 35) }}
          style={{ width: "100%", height: "100%" }}
        >
          <Suspense fallback={null}>
            <GLSync />
            <InvalidateOnTimeChange timeMs={timeMs} />
            <ParallelFragmentsR3FScene currentTimeMs={timeMs} />
            {children}
          </Suspense>
        </Canvas>
      </div>
    </Timegroup>
  );
}
