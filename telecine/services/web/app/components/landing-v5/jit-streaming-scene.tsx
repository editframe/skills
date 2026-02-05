// @ts-nocheck - React Three Fiber JSX intrinsics
import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ━━ Visual Thinking Diagnostic ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CORE STRUCTURE:
     Traditional: Upload → Ingest → Multi-bitrate transcode → Store → Serve
     Editframe:   URL → JIT service → Adaptive streams (done)
   
   QUESTION TYPE: WHY (comparison/causation)
   IMAGE SCHEMA: PATH (two diverging routes) + FORCE (bottleneck vs flow)
   
   PATTERN: The Race (5.3) — side-by-side, same start, different paths
   
   COLOR CODING (5.3):
     Traditional: warm amber (#ff8a65) — slow, heavy, dim
     Editframe:   cool blue (#82b1ff) — fast, light, bright
   
   5-BEAT ARC (14s total):
     P1 (0-2s):     Hero — A video URL, close-up
     P2 (2-3.5s):   Question — "What happens when you hit play?"
     P3 (3.5-5s):   Split — Flash-fork into two paths
     P4 (5-10s):    Race — Traditional grinds through 5 steps;
                     Editframe streams through JIT prism into 3 quality ribbons
     P5 (10-14s):   Punchline — Editframe playing; Traditional still ingesting
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ━━ Timing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const P1_END = 2000;
const P2_START = 2000;
const P2_END = 3500;
const P_SPLIT_START = 3500;
const P_SPLIT_END = 5000;
const P4_START = 5000;
const P4_END = 10000;
const P5_START = 10000;
const DURATION = 14000;

/* ━━ Layout ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TRAD_X = -3.2;   // Traditional path (left, recedes)
const EF_X = 3.2;      // Editframe path (right, advances)
const PIPELINE_Z = 1.5; // Depth where pipelines run

/* ━━ Colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_TRAD = 0xff8a65;     // Warm amber — traditional
const COL_EF = 0x82b1ff;       // Cool blue — editframe
const COL_JIT = 0xff5252;      // Poster red — JIT prism
const COL_STREAM_HI = 0x448aff; // 1080p stream
const COL_STREAM_MD = 0x64b5f6; // 720p stream
const COL_STREAM_LO = 0x90caf9; // 480p stream
const COL_DONE = 0x69f0ae;     // Green — complete
const COL_MEDIA = 0x9575cd;    // Purple — source media

/* ━━ Easing & helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }
function prog(ms: number, s: number, e: number) { return clamp01((ms - s) / (e - s)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REUSABLE COMPONENTS — distinct shapes for distinct concepts
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** Media card — rounded box with play triangle inset. Represents any video URL. */
function MediaCard({ opacity, emissiveIntensity, position }: {
  opacity: number;
  emissiveIntensity: number;
  position: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const triRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!bodyRef.current || !triRef.current) return;
    const bMat = bodyRef.current.material as THREE.MeshPhysicalMaterial;
    const tMat = triRef.current.material as THREE.MeshBasicMaterial;
    bMat.opacity = opacity;
    bMat.emissiveIntensity = emissiveIntensity;
    bodyRef.current.castShadow = opacity > 0.1;
    tMat.opacity = opacity * 0.9;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Card body — tall like a video thumbnail */}
      <mesh ref={bodyRef} castShadow>
        <boxGeometry args={[1.6, 1.0, 0.15]} />
        <meshPhysicalMaterial
          color={COL_MEDIA}
          roughness={0.2}
          metalness={0.15}
          clearcoat={0.8}
          clearcoatRoughness={0.15}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_MEDIA)}
          emissiveIntensity={0}
        />
      </mesh>
      {/* Play triangle */}
      <mesh ref={triRef} position={[0, 0, 0.08]}>
        <coneGeometry args={[0.22, 0.35, 3]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0}
        />
      </mesh>
      <pointLight color={COL_MEDIA} intensity={emissiveIntensity * 4} distance={4} />
    </group>
  );
}

/** Upload funnel — cone that narrows, representing bandwidth bottleneck */
function UploadFunnel({ opacity, active, position }: {
  opacity: number;
  active: boolean;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = opacity;
    mat.emissiveIntensity = active ? 0.3 : 0.05;
    meshRef.current.castShadow = opacity > 0.1;
    if (active) {
      meshRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} rotation={[0, 0, Math.PI / 2]} castShadow>
        <coneGeometry args={[0.5, 0.8, 6]} />
        <meshPhysicalMaterial
          color={COL_TRAD}
          roughness={0.3}
          metalness={0.2}
          clearcoat={0.5}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_TRAD)}
          emissiveIntensity={0.05}
        />
      </mesh>
    </group>
  );
}

/** Ingest machine — torus (grinding ring) that spins during processing.
    Represents the heavy multi-bitrate transcode pipeline. */
function IngestMachine({ opacity, processing, position }: {
  opacity: number;
  processing: number; // 0-1 progress
  position: [number, number, number];
}) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!outerRef.current || !innerRef.current) return;
    const oMat = outerRef.current.material as THREE.MeshPhysicalMaterial;
    const iMat = innerRef.current.material as THREE.MeshPhysicalMaterial;
    oMat.opacity = opacity;
    iMat.opacity = opacity * 0.8;
    outerRef.current.castShadow = opacity > 0.1;

    // Spin proportional to processing — deterministic
    const spin = processing * Math.PI * 6;
    outerRef.current.rotation.x = spin;
    outerRef.current.rotation.z = spin * 0.7;
    innerRef.current.rotation.y = -spin * 1.3;
    innerRef.current.rotation.x = spin * 0.5;

    oMat.emissiveIntensity = processing > 0 ? 0.15 + Math.sin(processing * Math.PI * 4) * 0.1 : 0.02;
    iMat.emissiveIntensity = processing > 0 ? 0.2 + Math.sin(processing * Math.PI * 6) * 0.12 : 0.02;
  });

  return (
    <group position={position}>
      {/* Outer grinding ring */}
      <mesh ref={outerRef} castShadow>
        <torusGeometry args={[0.55, 0.12, 12, 24]} />
        <meshPhysicalMaterial
          color={COL_TRAD}
          roughness={0.25}
          metalness={0.5}
          clearcoat={0.6}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_TRAD)}
          emissiveIntensity={0.02}
        />
      </mesh>
      {/* Inner counter-ring */}
      <mesh ref={innerRef}>
        <torusGeometry args={[0.35, 0.08, 8, 18]} />
        <meshPhysicalMaterial
          color={0xffab91}
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={0}
          emissive={new THREE.Color(0xffab91)}
          emissiveIntensity={0.02}
        />
      </mesh>
    </group>
  );
}

/** Storage silo — stacked cylinders like a database. Where transcoded variants sit. */
function StorageSilo({ opacity, fillLevel, position }: {
  opacity: number;
  fillLevel: number; // 0-1
  position: [number, number, number];
}) {
  const baseRef = useRef<THREE.Mesh>(null);
  const fillRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!baseRef.current || !fillRef.current) return;
    const bMat = baseRef.current.material as THREE.MeshPhysicalMaterial;
    const fMat = fillRef.current.material as THREE.MeshPhysicalMaterial;
    bMat.opacity = opacity * 0.5;
    baseRef.current.castShadow = opacity > 0.1;
    fMat.opacity = opacity * fillLevel;
    fillRef.current.scale.y = Math.max(0.01, fillLevel);
    fillRef.current.position.y = -0.35 + fillLevel * 0.35;
    fMat.emissiveIntensity = fillLevel * 0.15;
  });

  return (
    <group position={position}>
      {/* Outer shell */}
      <mesh ref={baseRef} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.7, 16]} />
        <meshPhysicalMaterial
          color={0x78909c}
          roughness={0.4}
          metalness={0.3}
          transparent
          opacity={0}
        />
      </mesh>
      {/* Fill level */}
      <mesh ref={fillRef}>
        <cylinderGeometry args={[0.35, 0.35, 0.65, 16]} />
        <meshPhysicalMaterial
          color={COL_TRAD}
          roughness={0.3}
          metalness={0.2}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_TRAD)}
          emissiveIntensity={0}
        />
      </mesh>
    </group>
  );
}

/** JIT Prism — octahedron that refracts incoming data into multiple quality streams.
    Represents instant, on-demand transformation without storage. */
function JITPrism({ opacity, active, position }: {
  opacity: number;
  active: boolean;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = opacity;
    meshRef.current.castShadow = opacity > 0.1;

    if (active) {
      mat.emissiveIntensity = 0.5 + Math.sin(clock.getElapsedTime() * 3) * 0.15;
      meshRef.current.rotation.y += 0.008;
      if (glowRef.current) glowRef.current.intensity = 5;
    } else {
      mat.emissiveIntensity = opacity * 0.2;
      if (glowRef.current) glowRef.current.intensity = opacity * 2;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <octahedronGeometry args={[0.55, 0]} />
        <meshPhysicalMaterial
          color={COL_JIT}
          roughness={0.05}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_JIT)}
          emissiveIntensity={0.2}
        />
      </mesh>
      <pointLight ref={glowRef} color={COL_JIT} intensity={0} distance={6} />
    </group>
  );
}

/** Quality ribbon — a flat, elongated bar representing a specific bitrate stream.
    Width encodes quality level: thicker = higher bitrate. */
function QualityRibbon({ color, height, width, opacity, position, fillProgress }: {
  color: number;
  height: number;
  width: number;
  opacity: number;
  position: [number, number, number];
  fillProgress: number; // 0-1, how far the ribbon has grown
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = opacity;
    meshRef.current.castShadow = opacity > 0.1;
    mat.emissiveIntensity = fillProgress > 0 ? 0.25 : 0;
    // Grow from left to right
    meshRef.current.scale.x = Math.max(0.01, fillProgress);
    meshRef.current.position.x = position[0] + width * 0.5 * (fillProgress - 1);
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={[width, height, 0.2]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.15}
        metalness={0.2}
        clearcoat={0.7}
        transparent
        opacity={0}
        emissive={new THREE.Color(color)}
        emissiveIntensity={0}
      />
    </mesh>
  );
}

/** Progress bar — reusable horizontal bar with fill + background */
function ProgressBar({ x, z, width, fillColor, fillProgress, opacity, position }: {
  x?: number;
  z?: number;
  width: number;
  fillColor: number;
  fillProgress: number;
  opacity: number;
  position: [number, number, number];
}) {
  const bgRef = useRef<THREE.Mesh>(null);
  const fillRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!bgRef.current || !fillRef.current) return;
    const bgMat = bgRef.current.material as THREE.MeshStandardMaterial;
    const fMat = fillRef.current.material as THREE.MeshPhysicalMaterial;
    bgMat.opacity = opacity * 0.3;
    fMat.opacity = opacity * 0.9;
    fillRef.current.scale.x = Math.max(0.001, fillProgress);
    fillRef.current.position.x = -width * 0.5 * (1 - fillProgress);
    fMat.emissiveIntensity = fillProgress > 0 ? 0.3 : 0;
  });

  return (
    <group position={position}>
      <mesh ref={bgRef}>
        <boxGeometry args={[width, 0.12, 0.1]} />
        <meshStandardMaterial color={0x555555} roughness={0.8} transparent opacity={0} />
      </mesh>
      <mesh ref={fillRef}>
        <boxGeometry args={[width, 0.14, 0.12]} />
        <meshPhysicalMaterial
          color={fillColor}
          roughness={0.2}
          metalness={0.3}
          clearcoat={0.5}
          transparent
          opacity={0}
          emissive={new THREE.Color(fillColor)}
          emissiveIntensity={0}
        />
      </mesh>
    </group>
  );
}

/** Particle stream — deterministic flow between two 3D points */
function ParticleStream({ from, to, count, color, size, opacity, timeMs, seed }: {
  from: [number, number, number];
  to: [number, number, number];
  count: number;
  color: number;
  size: number;
  opacity: number;
  timeMs: number;
  seed: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const speedsRef = useRef<Float32Array>(
    new Float32Array(count).map((_, i) => 0.3 + seededRandom(seed + i * 100) * 0.7)
  );

  useFrame(() => {
    if (!pointsRef.current) return;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = opacity;
    if (opacity <= 0) return;

    const positions = pointsRef.current.geometry.attributes.position!.array as Float32Array;
    const speeds = speedsRef.current;

    for (let i = 0; i < count; i++) {
      const t = (timeMs * speeds[i]! * 0.0006 + i * 0.07) % 1;
      const wobbleX = (seededRandom(seed + i * 1000 + timeMs * 0.002) - 0.5) * 0.15;
      const wobbleY = (seededRandom(seed + i * 2000 + timeMs * 0.002) - 0.5) * 0.15;

      positions[i * 3] = lerp(from[0], to[0], t) + wobbleX;
      positions[i * 3 + 1] = lerp(from[1], to[1], t) + wobbleY + Math.sin(t * Math.PI) * 0.2;
      positions[i * 3 + 2] = lerp(from[2], to[2], t);
    }
    pointsRef.current.geometry.attributes.position!.needsUpdate = true;
  });

  const positions = new Float32Array(count * 3);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={0}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/** Player screen — the destination. Screen glows when playback begins. */
function PlayerScreen({ opacity, playing, position }: {
  opacity: number;
  playing: number; // 0-1
  position: [number, number, number];
}) {
  const frameRef = useRef<THREE.Mesh>(null);
  const screenRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!frameRef.current || !screenRef.current) return;
    const fMat = frameRef.current.material as THREE.MeshPhysicalMaterial;
    const sMat = screenRef.current.material as THREE.MeshStandardMaterial;
    fMat.opacity = opacity;
    frameRef.current.castShadow = opacity > 0.1;
    sMat.opacity = opacity * 0.9;
    sMat.emissiveIntensity = playing * 0.8;
  });

  return (
    <group position={position}>
      {/* Frame */}
      <mesh ref={frameRef} castShadow>
        <boxGeometry args={[1.4, 0.9, 0.08]} />
        <meshPhysicalMaterial
          color={0x37474f}
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={0}
        />
      </mesh>
      {/* Screen surface */}
      <mesh ref={screenRef} position={[0, 0, 0.05]}>
        <boxGeometry args={[1.25, 0.75, 0.02]} />
        <meshStandardMaterial
          color={COL_EF}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_EF)}
          emissiveIntensity={0}
        />
      </mesh>
      {/* Stand */}
      <mesh position={[0, -0.55, -0.02]}>
        <cylinderGeometry args={[0.06, 0.12, 0.2, 8]} />
        <meshStandardMaterial color={0x546e7a} roughness={0.5} transparent opacity={opacity * 0.6} />
      </mesh>
    </group>
  );
}

/* ━━ Environment ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Floor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[40, 25]} />
        <meshStandardMaterial color={0x2a2e42} roughness={0.75} metalness={0.1} />
      </mesh>
      <gridHelper
        args={[25, 25, 0x3a3f58, 0x3a3f58]}
        position={[0, -1.19, 0]}
        material-transparent
        material-opacity={0.2}
      />
    </>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.9} color={0xd0d8f0} />
      <directionalLight
        position={[4, 10, 6]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
      />
      <directionalLight position={[-4, 5, -3]} intensity={0.5} color={0xaaccff} />
      <pointLight position={[0, 3, -4]} intensity={0.7} color={COL_EF} distance={20} />
    </>
  );
}

/** Split flash — bright line + flash when the paths diverge */
function SplitFlash({ opacity }: { opacity: number }) {
  const lineRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!lineRef.current) return;
    const mat = lineRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity;
  });

  return (
    <group position={[0, 0.3, 0]}>
      <mesh ref={lineRef}>
        <planeGeometry args={[0.03, 2.5]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight color={0xffffff} intensity={opacity * 10} distance={8} />
    </group>
  );
}

/* ━━ SCENE ORCHESTRATOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Scene({ currentTimeMs }: { currentTimeMs: number }) {
  const { camera } = useThree();

  // ── Derived animation state (pure functions of time) ──
  const p1 = easeOut(prog(currentTimeMs, 0, P1_END));

  // Camera pull-back before the split
  const camPullBack = easeInOut(prog(currentTimeMs, P2_START, P_SPLIT_END));
  // Camera orbit toward editframe side during punchline
  const camOrbit = easeOut(prog(currentTimeMs, P5_START, DURATION));

  // Split flash
  const splitFlashIn = prog(currentTimeMs, P_SPLIT_START, P_SPLIT_START + 150);
  const splitFlashOut = prog(currentTimeMs, P_SPLIT_START + 150, P_SPLIT_START + 500);
  const splitFlash = splitFlashIn * (1 - splitFlashOut);

  // Element appearance during split
  const splitReveal = easeOut(prog(currentTimeMs, P_SPLIT_START + 200, P_SPLIT_END));

  // Media card positions — starts centered, then forks
  const mediaStartPos: [number, number, number] = [0, 0.3, 0];
  const mediaTradPos: [number, number, number] = [TRAD_X, 0.3, 0];
  const mediaEfPos: [number, number, number] = [EF_X, 0.3, 0];

  // Processing progress (phase 4)
  const raceTime = currentTimeMs >= P4_START ? currentTimeMs - P4_START : 0;
  const raceDuration = P4_END - P4_START;

  // Traditional is SLOW — uploads, then ingests, then stores — only 40% done by race end
  const tradUploadProg = easeOut(clamp01(raceTime / (raceDuration * 0.35)));
  const tradIngestProg = easeOut(clamp01((raceTime - raceDuration * 0.3) / (raceDuration * 0.45)));
  const tradStoreProg = clamp01((raceTime - raceDuration * 0.7) / (raceDuration * 0.3));
  const tradOverallProg = clamp01(raceTime / (raceDuration * 2.5)); // Won't finish during the scene

  // Editframe is FAST — JIT starts immediately, streams are flowing in < 1 second
  const efJitActive = currentTimeMs >= P4_START + 200;
  const efStreamProg = easeOut(clamp01((raceTime - 200) / (raceDuration * 0.3)));
  const efPlaying = easeOut(prog(currentTimeMs, P4_START + 1500, P4_START + 2500));
  const efOverallProg = easeOut(clamp01(raceTime / (raceDuration * 0.35)));

  // Phase 5: Punchline
  const p5 = easeOut(prog(currentTimeMs, P5_START, DURATION));

  // ── Camera choreography ──
  useFrame(() => {
    const closePos = new THREE.Vector3(0, 0.8, 2.5);
    const closeTar = new THREE.Vector3(0, 0.3, 0);
    const widePos = new THREE.Vector3(0, 4, 11);
    const wideTar = new THREE.Vector3(0, -0.2, 1);
    const winPos = new THREE.Vector3(2.5, 3, 9);
    const winTar = new THREE.Vector3(2, -0.1, 1.5);

    const pos = closePos.clone().lerp(widePos, camPullBack);
    const tar = closeTar.clone().lerp(wideTar, camPullBack);

    if (camOrbit > 0) {
      pos.lerp(winPos, camOrbit);
      tar.lerp(winTar, camOrbit);
    }

    // Snap zoom on punchline
    const snapProg = prog(currentTimeMs, P5_START, P5_START + 300);
    if (snapProg > 0 && snapProg < 1) {
      pos.z -= Math.sin(snapProg * Math.PI) * 0.4;
    }

    // Subtle shake during race
    if (currentTimeMs >= P4_START && currentTimeMs < P5_START) {
      const shake = 0.012;
      pos.x += Math.sin(currentTimeMs * 0.007) * shake;
      pos.y += Math.cos(currentTimeMs * 0.011) * shake;
    }

    camera.position.copy(pos);
    camera.lookAt(tar);
  });

  // ── Compute opacity states ──
  const tradPathOpa = splitReveal;
  const efPathOpa = splitReveal;

  // Traditional side dims heavily in phase 5 (loser recedes)
  const tradDim = currentTimeMs >= P5_START ? lerp(1, 0.35, p5) : 1;
  // Editframe side brightens in phase 5 (winner advances)
  const efBright = currentTimeMs >= P5_START ? lerp(1, 1, p5) : 1;

  // Media card: visible in P1, then splits into two copies
  const heroMediaOpa = currentTimeMs < P_SPLIT_START + 300 ? p1 : lerp(p1, 0, prog(currentTimeMs, P_SPLIT_START, P_SPLIT_START + 300));
  const tradMediaOpa = tradPathOpa * tradDim;
  const efMediaOpa = efPathOpa * efBright;

  // Traditional pipeline elements
  const tradUploadOpa = tradPathOpa * tradDim;
  const tradIngestOpa = tradPathOpa * tradDim;
  const tradStoreOpa = tradPathOpa * tradDim;

  // Editframe elements
  const efPrismOpa = efPathOpa * efBright;

  // Particle opacity
  const raceActive = currentTimeMs >= P4_START && currentTimeMs < DURATION;
  const tradParticleOpa = raceActive ? tradPathOpa * tradDim * 0.7 : 0;
  const efParticleOpa = raceActive ? efPathOpa * efBright * 0.8 : 0;

  return (
    <>
      <Lights />
      <Floor />

      {/* ── HERO: Unified media card (phase 1) ── */}
      <MediaCard opacity={heroMediaOpa} emissiveIntensity={p1 * 0.4} position={mediaStartPos} />

      {/* ── SPLIT FLASH (phase 2→3 transition) ── */}
      <SplitFlash opacity={splitFlash} />

      {/* ━━ TRADITIONAL PATH (left, warm amber) ━━━━━━━━━━━━━━━━━━ */}

      {/* Media card copy (dims) */}
      <MediaCard opacity={tradMediaOpa * 0.6} emissiveIntensity={0.1} position={[TRAD_X, 0.3, 0]} />

      {/* Upload funnel */}
      <UploadFunnel opacity={tradUploadOpa} active={tradUploadProg > 0 && tradUploadProg < 1} position={[TRAD_X, 0, PIPELINE_Z * 0.5]} />

      {/* Ingest machine */}
      <IngestMachine opacity={tradIngestOpa} processing={tradIngestProg} position={[TRAD_X, 0, PIPELINE_Z]} />

      {/* Storage silo */}
      <StorageSilo opacity={tradStoreOpa} fillLevel={tradStoreProg} position={[TRAD_X, -0.5, PIPELINE_Z * 1.5]} />

      {/* Traditional progress bar — barely moves */}
      <ProgressBar
        width={2.0}
        fillColor={COL_TRAD}
        fillProgress={tradOverallProg}
        opacity={tradPathOpa * tradDim}
        position={[TRAD_X, -1.0, PIPELINE_Z * 1.8]}
      />

      {/* Traditional particle flow (slow, chunky) */}
      <ParticleStream
        from={[TRAD_X, 0.3, 0]}
        to={[TRAD_X, -0.5, PIPELINE_Z * 1.5]}
        count={80}
        color={COL_TRAD}
        size={0.06}
        opacity={tradParticleOpa}
        timeMs={raceTime}
        seed={5000}
      />

      {/* ━━ EDITFRAME PATH (right, cool blue) ━━━━━━━━━━━━━━━━━━━ */}

      {/* Media card copy (stays bright) */}
      <MediaCard opacity={efMediaOpa} emissiveIntensity={0.35} position={[EF_X, 0.3, 0]} />

      {/* JIT Prism */}
      <JITPrism opacity={efPrismOpa} active={efJitActive} position={[EF_X, 0, PIPELINE_Z * 0.6]} />

      {/* Quality ribbons — three bitrate streams fanning out from prism */}
      <QualityRibbon
        color={COL_STREAM_HI}
        height={0.18}
        width={2.0}
        opacity={efPathOpa * efBright * efStreamProg}
        position={[EF_X + 0.2, 0.25, PIPELINE_Z * 1.2]}
        fillProgress={efStreamProg}
      />
      <QualityRibbon
        color={COL_STREAM_MD}
        height={0.12}
        width={2.0}
        opacity={efPathOpa * efBright * efStreamProg}
        position={[EF_X + 0.2, 0, PIPELINE_Z * 1.2]}
        fillProgress={easeOut(clamp01((efStreamProg - 0.1) / 0.9))}
      />
      <QualityRibbon
        color={COL_STREAM_LO}
        height={0.07}
        width={2.0}
        opacity={efPathOpa * efBright * efStreamProg}
        position={[EF_X + 0.2, -0.2, PIPELINE_Z * 1.2]}
        fillProgress={easeOut(clamp01((efStreamProg - 0.2) / 0.8))}
      />

      {/* Player screen — lights up fast */}
      <PlayerScreen
        opacity={efPathOpa * efBright}
        playing={efPlaying}
        position={[EF_X, 0, PIPELINE_Z * 2]}
      />

      {/* Editframe progress bar — fills quickly */}
      <ProgressBar
        width={2.0}
        fillColor={COL_EF}
        fillProgress={efOverallProg}
        opacity={efPathOpa * efBright}
        position={[EF_X, -1.0, PIPELINE_Z * 2.3]}
      />

      {/* Editframe particle flow (fast, many, bright) */}
      <ParticleStream
        from={[EF_X, 0.3, 0]}
        to={[EF_X, 0, PIPELINE_Z * 2]}
        count={150}
        color={COL_EF}
        size={0.07}
        opacity={efParticleOpa}
        timeMs={raceTime}
        seed={9000}
      />

      {/* ── Phase 5: "Done" indicator on Editframe side ── */}
      {currentTimeMs >= P5_START && (
        <group position={[EF_X, -0.6, PIPELINE_Z * 2.5]}>
          <mesh castShadow>
            <boxGeometry args={[1.8, 0.22, 0.25]} />
            <meshPhysicalMaterial
              color={COL_DONE}
              roughness={0.2}
              metalness={0.3}
              clearcoat={0.8}
              transparent
              opacity={p5 * 0.95}
              emissive={new THREE.Color(COL_DONE)}
              emissiveIntensity={p5 * 0.5}
            />
          </mesh>
        </group>
      )}
    </>
  );
}

/* ━━ Canvas wrapper ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function JITStreamingCanvas({ currentTimeMs }: { currentTimeMs: number }) {
  return (
    <Canvas
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      camera={{ position: [0, 3, 8], fov: 50 }}
      style={{ background: "#1e2233", width: "100%", height: "100%" }}
      onCreated={({ gl }: { gl: THREE.WebGLRenderer }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.8;
      }}
    >
      <fog attach="fog" args={[0x1e2233, 18, 40]} />
      <Scene currentTimeMs={currentTimeMs} />
    </Canvas>
  );
}
