// @ts-nocheck - React Three Fiber JSX intrinsics
import * as React from "react";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

/* ━━ Sizing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const BAR_W = 4.5;
const BAR_H = 0.25;
const BAR_D = 0.15;
const NUM_SEGS = 6;
const SEG_W = BAR_W / NUM_SEGS;

/* ━━ Timing — compressed Act 1, expanded Act 2 ━━━━━━━━━━━━━━━━━━
   Act 1 (0-6s): Quick traditional pipeline — establish the pain fast.
   Transition (6-8s): "What if you could skip all of that?"
   Act 2 (8-30s): Editframe JIT — the main event.
   Act 3 (30-36s): Gantt comparison — visual proof.
   Outro (36-42s): Closing statement.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ACT 1: Traditional (compressed to ~6s)
const A_IN = 200;
const A_UPLOAD_START = 1200;
const A_UPLOAD_END = 2800;
const A_TRANSCODE_START = 3200;
const A_TRANSCODE_END = 4400;
const A_VARIANTS_START = 4500;
const A_PLAY = 5200;
const A_END = 6000;

// TRANSITION
const TRANSITION_START = 6000;
const TRANSITION_END = 8000;

// ACT 2: Editframe JIT (expanded — 8s to 30s)
const B_IN = 8000;
const B_PLAYER_IN = 9500;
const B_HIGHLIGHT = 11000;
const B_FETCH_START = 12500;
const B_FETCH_END = 14500;
const B_TRANSCODE_START = 15000;
const B_TRANSCODE_END = 17000;
const B_PLAY = 18000;
const B_NEXT_START = 20000;
const B_NEXT_END = 23000;
// Cache-hit beat
const B_CACHE_START = 24000;
const B_CACHE_END = 27500;
const B_END = 28000;

// ACT 3: Gantt comparison
const C_START = 30000;
const C_END = 36000;

// OUTRO
const OUTRO_START = 36000;
const DURATION = 42000;

/* ━━ Colors — increased contrast ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_BAR = 0x9575cd;       // Brighter purple — file segments
const COL_BAR_DIM = 0x5c3d99;   // Darker purple — dimmed segments
const COL_HIGHLIGHT = 0x69f0ae; // Green — highlighted byte range
const COL_TRAD = 0xff8a65;      // Amber — traditional accent
const COL_1080 = 0x448aff;      // Blue — 1080p
const COL_720 = 0x64b5f6;       // Light blue — 720p
const COL_480 = 0x90caf9;       // Pale blue — 480p
const COL_MACHINE = 0x80cbc4;   // Teal — transcode compute
const COL_EF = 0x82b1ff;        // Editframe blue
const COL_BG = 0x2d3148;        // Darker background bar
const COL_PLAYER_ON = 0x82b1ff; // Player screen glow
const COL_CACHE = 0x69f0ae;     // Green — cache hit

/* ━━ Easing & helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }
function prog(ms: number, s: number, e: number) { return clamp01((ms - s) / (e - s)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function snapEaseOut(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const overshoot = 1.0 + Math.sin(t * Math.PI) * 0.08;
  return overshoot * (1 - Math.pow(1 - t, 4));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COMPONENTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function Label({ children, position, color, fontSize, opacity, anchorX }: {
  children: string;
  position: [number, number, number];
  color?: string;
  fontSize?: number;
  opacity?: number;
  anchorX?: "left" | "center" | "right";
}) {
  return (
    <Text
      position={position}
      fontSize={fontSize ?? 0.16}
      color={color ?? "#aaaacc"}
      anchorX={anchorX ?? "center"}
      anchorY="middle"
      fillOpacity={opacity ?? 1}
    >
      {children}
    </Text>
  );
}

function FilmstripBar({ opacity, position, label, dimSegments, highlightRange }: {
  opacity: number;
  position: [number, number, number];
  label?: string;
  dimSegments?: boolean;
  highlightRange?: [number, number];
}) {
  const segRefs = useRef<(THREE.Mesh | null)[]>([]);
  const hlStart = highlightRange?.[0] ?? -1;
  const hlEnd = highlightRange?.[1] ?? -1;
  const dim = dimSegments ?? false;

  useFrame(() => {
    for (let i = 0; i < NUM_SEGS; i++) {
      const mesh = segRefs.current[i];
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const highlighted = i >= hlStart && i <= hlEnd;

      if (highlighted) {
        mat.color.setHex(COL_HIGHLIGHT);
        mat.emissive.setHex(COL_HIGHLIGHT);
        mat.opacity = opacity;
        mat.emissiveIntensity = 0.4;
      } else {
        mat.color.setHex(dim ? COL_BAR_DIM : COL_BAR);
        mat.emissive.setHex(COL_BAR);
        mat.opacity = dim ? opacity * 0.35 : opacity * 0.95;
        mat.emissiveIntensity = 0.08;
      }
      mesh.castShadow = opacity > 0.1;
    }
  });

  const segGap = 0.03;

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[BAR_W + 0.06, BAR_H + 0.06, BAR_D * 0.5]} />
        <meshStandardMaterial color={COL_BG} roughness={0.8} transparent opacity={opacity * 0.4} />
      </mesh>

      {Array.from({ length: NUM_SEGS }, (_, i) => {
        const x = -BAR_W / 2 + SEG_W / 2 + i * SEG_W;
        return (
          <mesh
            key={i}
            ref={(el) => { segRefs.current[i] = el; }}
            position={[x, 0, BAR_D * 0.3]}
          >
            <boxGeometry args={[SEG_W - segGap, BAR_H, BAR_D]} />
            <meshPhysicalMaterial
              color={COL_BAR}
              roughness={0.15}
              metalness={0.15}
              clearcoat={0.7}
              transparent
              opacity={0}
              emissive={new THREE.Color(COL_BAR)}
              emissiveIntensity={0.08}
            />
          </mesh>
        );
      })}

      <Label position={[-BAR_W / 2, -BAR_H / 2 - 0.14, BAR_D]} fontSize={0.10} opacity={opacity * 0.5}>
        0:00
      </Label>
      <Label position={[0, -BAR_H / 2 - 0.14, BAR_D]} fontSize={0.10} opacity={opacity * 0.5}>
        0:30
      </Label>
      <Label position={[BAR_W / 2, -BAR_H / 2 - 0.14, BAR_D]} fontSize={0.10} opacity={opacity * 0.5}>
        1:00
      </Label>

      {label && (
        <Label position={[0, BAR_H / 2 + 0.16, BAR_D]} fontSize={0.13} opacity={opacity * 0.85}>
          {label}
        </Label>
      )}
    </group>
  );
}

function Segment({ opacity, color, position, label }: {
  opacity: number;
  color: number;
  position: [number, number, number];
  label?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = opacity;
    mat.emissiveIntensity = opacity > 0 ? 0.3 : 0;
    meshRef.current.castShadow = opacity > 0.1;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[SEG_W * 0.9, BAR_H, BAR_D]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.15}
          metalness={0.15}
          clearcoat={0.7}
          transparent
          opacity={0}
          emissive={new THREE.Color(color)}
          emissiveIntensity={0}
        />
      </mesh>
      {label && (
        <Label position={[0, -BAR_H / 2 - 0.12, BAR_D * 0.5]} fontSize={0.10} color="#88ddaa" opacity={opacity * 0.8}>
          {label}
        </Label>
      )}
    </group>
  );
}

function VariantBar({ opacity, color, width, position, label }: {
  opacity: number;
  color: number;
  width: number;
  position: [number, number, number];
  label: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = opacity;
    mat.emissiveIntensity = opacity * 0.15;
    meshRef.current.castShadow = opacity > 0.1;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[width, BAR_H * 0.8, BAR_D]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.15}
          metalness={0.2}
          clearcoat={0.6}
          transparent
          opacity={0}
          emissive={new THREE.Color(color)}
          emissiveIntensity={0}
        />
      </mesh>
      <Label position={[width / 2 + 0.15, 0, BAR_D * 0.5]} fontSize={0.11} color="#ccddff" opacity={opacity * 0.8} anchorX="left">
        {label}
      </Label>
    </group>
  );
}

/** Transcode process — wireframe-style with internal glow when active */
function TranscodeBox({ opacity, active, scale, position }: {
  opacity: number;
  active: boolean;
  scale: number;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = active ? opacity * 0.4 : opacity * 0.15;
    mat.emissiveIntensity = active ? 0.5 : opacity * 0.05;
    meshRef.current.castShadow = opacity > 0.1;

    if (edgesRef.current) {
      (edgesRef.current.material as THREE.LineBasicMaterial).opacity = opacity * 0.6;
    }
  });

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1.2, 0.5, 0.3]} />
        <meshPhysicalMaterial
          color={COL_MACHINE}
          roughness={0.2}
          metalness={0.3}
          clearcoat={0.5}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_MACHINE)}
          emissiveIntensity={0.05}
        />
      </mesh>
      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.22, 0.52, 0.32)]} />
        <lineBasicMaterial color={COL_MACHINE} transparent opacity={0} />
      </lineSegments>
      <Label position={[0, 0, 0.16]} fontSize={0.12 * (1 / scale)} color="#ffffff" opacity={opacity * 0.9}>
        transcode
      </Label>
      <pointLight color={COL_MACHINE} intensity={active ? 4 : 0} distance={4} />
    </group>
  );
}

/** Edge proxy — thin, pipeline-style. Visually distinct from a storage server. */
function ProxyBox({ opacity, active, position, showPipeline, cached }: {
  opacity: number;
  active: boolean;
  position: [number, number, number];
  showPipeline?: number;
  cached?: boolean;
}) {
  const frameRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  useFrame(() => {
    if (!frameRef.current) return;
    const mat = frameRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = opacity * 0.5;
    mat.emissiveIntensity = active ? 0.2 : (cached ? 0.25 : opacity * 0.05);
    frameRef.current.castShadow = opacity > 0.1;

    if (edgesRef.current) {
      (edgesRef.current.material as THREE.LineBasicMaterial).opacity = opacity * 0.5;
    }
  });

  const pipeOpa = showPipeline ?? 0;

  return (
    <group position={position}>
      <mesh ref={frameRef} castShadow>
        <boxGeometry args={[2.6, 1.4, 0.15]} />
        <meshPhysicalMaterial
          color={cached ? COL_CACHE : COL_EF}
          roughness={0.3}
          metalness={0.2}
          clearcoat={0.4}
          transparent
          opacity={0}
          emissive={new THREE.Color(cached ? COL_CACHE : COL_EF)}
          emissiveIntensity={0.05}
        />
      </mesh>
      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(2.62, 1.42, 0.17)]} />
        <lineBasicMaterial color={cached ? COL_CACHE : COL_EF} transparent opacity={0} />
      </lineSegments>

      <Label position={[0, 0.55, 0.1]} fontSize={0.11} color="#82b1ff" opacity={opacity * 0.9}>
        editframe edge proxy
      </Label>

      {pipeOpa > 0 && !cached && (
        <group position={[0, 0.25, 0.1]}>
          <Label position={[-0.7, 0, 0]} fontSize={0.08} color="#69f0ae" opacity={pipeOpa * 0.7}>
            moov
          </Label>
          <Label position={[-0.2, 0, 0]} fontSize={0.08} color="#69f0ae" opacity={pipeOpa * 0.6}>
            sidx
          </Label>
          <Label position={[0.4, 0, 0]} fontSize={0.08} color="#69f0ae" opacity={pipeOpa * 0.5}>
            byte offset
          </Label>
        </group>
      )}

      {cached && (
        <Label position={[0, 0.2, 0.1]} fontSize={0.14} color="#69f0ae" opacity={opacity * 0.9}>
          cached
        </Label>
      )}

      {!cached && (
        <TranscodeBox opacity={opacity} active={active} scale={0.65} position={[0, -0.15, 0.05]} />
      )}
    </group>
  );
}

function Arrow({ opacity, position, length, color, up }: {
  opacity: number;
  position: [number, number, number];
  length?: number;
  color?: number;
  up?: boolean;
}) {
  const shaftRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const len = length ?? 0.6;
  const col = color ?? 0x666688;
  const dir = up ? 1 : -1;

  useFrame(() => {
    if (!shaftRef.current || !headRef.current) return;
    (shaftRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.6;
    (headRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.6;
  });

  return (
    <group position={position}>
      <mesh ref={shaftRef}>
        <boxGeometry args={[0.04, len, 0.02]} />
        <meshBasicMaterial color={col} transparent opacity={0} />
      </mesh>
      <mesh ref={headRef} position={[0, dir * (len / 2 + 0.06), 0]} rotation={[0, 0, up ? 0 : Math.PI]}>
        <coneGeometry args={[0.07, 0.12, 3]} />
        <meshBasicMaterial color={col} transparent opacity={0} />
      </mesh>
    </group>
  );
}

function PlayerScreen({ opacity, playing, position }: {
  opacity: number;
  playing: number;
  position: [number, number, number];
}) {
  const frameRef = useRef<THREE.Mesh>(null);
  const screenRef = useRef<THREE.Mesh>(null);
  const btnRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!frameRef.current || !screenRef.current) return;
    (frameRef.current.material as THREE.MeshPhysicalMaterial).opacity = opacity;
    frameRef.current.castShadow = opacity > 0.1;
    const sMat = screenRef.current.material as THREE.MeshStandardMaterial;
    sMat.opacity = opacity * 0.9;
    sMat.emissiveIntensity = playing * 0.7;

    if (btnRef.current) {
      (btnRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * (1 - playing) * 0.6;
    }
  });

  return (
    <group position={position}>
      <mesh ref={frameRef} castShadow>
        <boxGeometry args={[1.4, 0.85, 0.06]} />
        <meshPhysicalMaterial color={0x37474f} roughness={0.3} metalness={0.6} transparent opacity={0} />
      </mesh>
      <mesh ref={screenRef} position={[0, 0, 0.04]}>
        <boxGeometry args={[1.25, 0.7, 0.02]} />
        <meshStandardMaterial
          color={COL_PLAYER_ON}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_PLAYER_ON)}
          emissiveIntensity={0}
        />
      </mesh>
      {/* Play button triangle */}
      <mesh ref={btnRef} position={[0, 0, 0.06]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.12, 0.2, 3]} />
        <meshBasicMaterial color={0xffffff} transparent opacity={0} />
      </mesh>
      {/* Progress bar */}
      <mesh position={[0, -0.3, 0.04]}>
        <boxGeometry args={[1.1, 0.03, 0.01]} />
        <meshBasicMaterial color={0x556677} transparent opacity={opacity * 0.4} />
      </mesh>
    </group>
  );
}

function ParticleStream({ from, to, count, color, opacity, timeMs, seed, size, wobble }: {
  from: [number, number, number];
  to: [number, number, number];
  count: number;
  color: number;
  opacity: number;
  timeMs: number;
  seed: number;
  size?: number;
  wobble?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const speedsRef = useRef<Float32Array>(
    new Float32Array(count).map((_, i) => 0.3 + seededRandom(seed + i * 100) * 0.7)
  );

  const particleSize = size ?? 0.06;
  const wobbleAmount = wobble ?? 0.08;

  useFrame(() => {
    if (!pointsRef.current) return;
    (pointsRef.current.material as THREE.PointsMaterial).opacity = opacity;
    if (opacity <= 0) return;

    const positions = pointsRef.current.geometry.attributes.position!.array as Float32Array;
    const speeds = speedsRef.current;

    for (let i = 0; i < count; i++) {
      const t = (timeMs * speeds[i]! * 0.0005 + i * 0.07) % 1;
      const wx = (seededRandom(seed + i * 1000 + timeMs * 0.002) - 0.5) * wobbleAmount;
      const wy = (seededRandom(seed + i * 2000 + timeMs * 0.002) - 0.5) * wobbleAmount;
      positions[i * 3] = lerp(from[0], to[0], t) + wx;
      positions[i * 3 + 1] = lerp(from[1], to[1], t) + wy;
      positions[i * 3 + 2] = lerp(from[2], to[2], t);
    }
    pointsRef.current.geometry.attributes.position!.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={new Float32Array(count * 3)} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={particleSize} transparent opacity={0} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

/** Gantt-style comparison bar for Act 3 */
function GanttBar({ opacity, position, label, segments, totalWidth }: {
  opacity: number;
  position: [number, number, number];
  label: string;
  segments: Array<{ width: number; color: number; label: string; opacity: number }>;
  totalWidth: number;
}) {
  return (
    <group position={position}>
      {/* Background track */}
      <mesh>
        <boxGeometry args={[totalWidth, 0.35, 0.05]} />
        <meshStandardMaterial color={COL_BG} roughness={0.8} transparent opacity={opacity * 0.3} />
      </mesh>
      {/* Label on left */}
      <Label position={[-totalWidth / 2 - 0.2, 0, 0.05]} fontSize={0.13} color="#aaaacc" opacity={opacity * 0.9} anchorX="right">
        {label}
      </Label>
      {/* Segments */}
      {segments.map((seg, i) => {
        let x = -totalWidth / 2;
        for (let j = 0; j < i; j++) x += segments[j].width;
        x += seg.width / 2;
        return (
          <group key={i} position={[x, 0, 0.03]}>
            <mesh>
              <boxGeometry args={[seg.width, 0.3, 0.06]} />
              <meshPhysicalMaterial
                color={seg.color}
                roughness={0.2}
                metalness={0.2}
                clearcoat={0.5}
                transparent
                opacity={opacity * seg.opacity}
                emissive={new THREE.Color(seg.color)}
                emissiveIntensity={0.15}
              />
            </mesh>
            <Label position={[0, 0, 0.04]} fontSize={0.09} color="#ffffff" opacity={opacity * seg.opacity * 0.9}>
              {seg.label}
            </Label>
          </group>
        );
      })}
    </group>
  );
}

/* ━━ Narration captions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type CaptionDef = {
  text: string;
  inMs: number;
  outMs: number;
  position: [number, number, number];
  fontSize: number;
  color: string;
  bold?: boolean;
};

const CAPTIONS: CaptionDef[] = [
  // ACT 1 title
  { text: "The traditional way", inMs: 100, outMs: 1000, position: [0, 3.2, 0], fontSize: 0.18, color: "rgba(255,255,255,0.4)" },
  // Step: You have a file
  { text: "You have a video file.", inMs: 200, outMs: 1100, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },
  // Step: Upload
  { text: "Upload. Transcode. Wait.", inMs: 1200, outMs: 3000, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },
  // Step: Variants
  { text: "Three complete copies, stored.", inMs: 3200, outMs: 4800, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },
  // Step: Play
  { text: "Only now can someone press play.", inMs: 5000, outMs: 5900, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },

  // TRANSITION
  { text: "What if you could skip all of that?", inMs: 6200, outMs: 7800, position: [0, 0, 1], fontSize: 0.26, color: "#ffffff", bold: true },

  // ACT 2 title
  { text: "Editframe JIT", inMs: 8000, outMs: 9300, position: [0, 3.2, 0], fontSize: 0.22, color: "#ff5252", bold: true },
  // Step: Same file, your server
  { text: "Same file. But it stays on your server.", inMs: 8200, outMs: 9300, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },
  // Step: Player needs a frame
  { text: "When the player needs a frame...", inMs: 9500, outMs: 10800, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },
  // Step: Highlight bytes
  { text: "...it highlights just the bytes it needs.", inMs: 11000, outMs: 12300, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },
  // Step: Byte-range request
  { text: "A byte-range request fetches just that slice.", inMs: 12500, outMs: 14300, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },
  // Step: Transcode piece
  { text: "Same transcode — but just this piece.", inMs: 15000, outMs: 16800, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },
  // Step: Already playing
  { text: "Already playing.", inMs: 18000, outMs: 19500, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },
  // Step: Next segment
  { text: "Next segment. Different bitrate. On demand.", inMs: 20000, outMs: 23000, position: [0, -3.2, 0], fontSize: 0.15, color: "rgba(255,255,255,0.55)" },
  // Step: Cache hit
  { text: "Second viewer? Already cached.", inMs: 24200, outMs: 27000, position: [0, -3.2, 0], fontSize: 0.15, color: "#69f0ae" },

  // ACT 3: Gantt comparison
  { text: "Time to first frame", inMs: 30500, outMs: 35500, position: [0, 2.2, 1], fontSize: 0.2, color: "#ffffff", bold: true },

  // OUTRO
  { text: "Same transcode work.", inMs: 36500, outMs: 41000, position: [0, 1.0, 1], fontSize: 0.3, color: "#ff5252", bold: true },
  { text: "No upload. No ingest delay.", inMs: 37000, outMs: 41000, position: [0, 0.2, 1], fontSize: 0.3, color: "#ff5252", bold: true },
  { text: "Zero infrastructure to maintain.", inMs: 37500, outMs: 41000, position: [0, -0.6, 1], fontSize: 0.22, color: "rgba(255,255,255,0.6)" },
];

const CAPTION_FADE_IN_MS = 400;
const CAPTION_FADE_OUT_MS = 400;

function Captions({ currentTimeMs }: { currentTimeMs: number }) {
  return (
    <>
      {CAPTIONS.map((c, i) => {
        const fadeIn = easeOut(prog(currentTimeMs, c.inMs, c.inMs + CAPTION_FADE_IN_MS));
        const fadeOut = 1 - easeOut(prog(currentTimeMs, c.outMs, c.outMs + CAPTION_FADE_OUT_MS));
        const opacity = Math.min(fadeIn, fadeOut);
        if (opacity <= 0) return null;
        return (
          <Text
            key={i}
            position={c.position}
            fontSize={c.fontSize}
            color={c.color}
            anchorX="center"
            anchorY="middle"
            fillOpacity={opacity}
            fontWeight={c.bold ? 800 : 600}
          >
            {c.text}
          </Text>
        );
      })}
    </>
  );
}

/* ━━ Environment ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Lights() {
  return (
    <>
      <ambientLight intensity={1.0} color={0xd0d8f0} />
      <directionalLight position={[3, 8, 5]} intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-3, 4, -2]} intensity={0.4} color={0xaaccff} />
    </>
  );
}

/* ━━ SCENE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function JITStreamingScene({ currentTimeMs }: { currentTimeMs: number }) {
  const { camera } = useThree();

  // ── Camera with Act 2 moves ──
  useFrame(() => {
    const basePos = new THREE.Vector3(0, 0, 7.5);
    const baseTar = new THREE.Vector3(0, -0.2, 0);

    // Act 2 camera moves: dolly in on highlight, pull back on play
    const dollyIn = snapEaseOut(prog(currentTimeMs, B_HIGHLIGHT, B_HIGHLIGHT + 1500));
    const dollyOut = snapEaseOut(prog(currentTimeMs, B_PLAY - 500, B_PLAY + 1000));
    const dollyZ = 7.5 - dollyIn * 1.0 + dollyOut * 1.0;
    const dollyY = -0.2 + dollyIn * 0.3 - dollyOut * 0.3;

    // Act 3: pull back to see Gantt bars
    const ganttProg = easeInOut(prog(currentTimeMs, C_START, C_START + 1500));
    const ganttPos = new THREE.Vector3(0, 0.5, 9);
    const ganttTar = new THREE.Vector3(0, 0, 0);

    // Outro: center on text
    const outroProg = easeInOut(prog(currentTimeMs, OUTRO_START, OUTRO_START + 1500));
    const outroPos = new THREE.Vector3(0, 0.2, 7);
    const outroTar = new THREE.Vector3(0, 0.2, 0);

    let pos: THREE.Vector3;
    let tar: THREE.Vector3;

    if (currentTimeMs >= OUTRO_START) {
      pos = ganttPos.clone().lerp(outroPos, outroProg);
      tar = ganttTar.clone().lerp(outroTar, outroProg);
    } else if (currentTimeMs >= C_START) {
      const prePos = new THREE.Vector3(0, dollyY, dollyZ);
      pos = prePos.clone().lerp(ganttPos, ganttProg);
      tar = baseTar.clone().lerp(ganttTar, ganttProg);
    } else {
      pos = new THREE.Vector3(0, dollyY, dollyZ);
      tar = new THREE.Vector3(0, dollyY + 0.1, 0);
    }

    camera.position.copy(pos);
    camera.lookAt(tar);
  });

  // ── Act 1: Traditional (compressed) ──
  const aBarOpa = easeOut(prog(currentTimeMs, A_IN, A_IN + 500));
  const aUploadArrow = easeOut(prog(currentTimeMs, A_UPLOAD_START - 300, A_UPLOAD_START));
  const aUploadParticles = currentTimeMs >= A_UPLOAD_START && currentTimeMs < A_UPLOAD_END;
  const aUploadTime = currentTimeMs - A_UPLOAD_START;
  const aCopyOpa = easeOut(prog(currentTimeMs, A_UPLOAD_END - 400, A_UPLOAD_END));
  const aTransArrow = easeOut(prog(currentTimeMs, A_TRANSCODE_START - 300, A_TRANSCODE_START));
  const aTransBoxOpa = easeOut(prog(currentTimeMs, A_TRANSCODE_START - 400, A_TRANSCODE_START));
  const aTransActive = currentTimeMs >= A_TRANSCODE_START && currentTimeMs < A_TRANSCODE_END;
  const aVar1080 = easeOut(prog(currentTimeMs, A_VARIANTS_START, A_VARIANTS_START + 300));
  const aVar720 = easeOut(prog(currentTimeMs, A_VARIANTS_START + 300, A_VARIANTS_START + 600));
  const aVar480 = easeOut(prog(currentTimeMs, A_VARIANTS_START + 600, A_VARIANTS_START + 900));
  const aServeArrow = easeOut(prog(currentTimeMs, A_PLAY - 400, A_PLAY - 100));
  const aPlayerOpa = easeOut(prog(currentTimeMs, A_PLAY - 300, A_PLAY));
  const aPlaying = easeOut(prog(currentTimeMs, A_PLAY, A_PLAY + 400));

  // ── Act 2: Editframe JIT (expanded, with snap easing) ──
  const bBarOpa = snapEaseOut(prog(currentTimeMs, B_IN, B_IN + 800));
  const bPlayerOpa = snapEaseOut(prog(currentTimeMs, B_PLAYER_IN, B_PLAYER_IN + 600));
  const bHighlightOn = currentTimeMs >= B_HIGHLIGHT;
  const bFetchArrow = snapEaseOut(prog(currentTimeMs, B_FETCH_START - 400, B_FETCH_START));
  const bSegOpa = snapEaseOut(prog(currentTimeMs, B_FETCH_START, B_FETCH_START + 300));
  const bSegTravel = easeInOut(prog(currentTimeMs, B_FETCH_START, B_FETCH_END));

  const bProxyOpa = snapEaseOut(prog(currentTimeMs, B_FETCH_START - 200, B_FETCH_START + 400));
  const bPipelineFlash = prog(currentTimeMs, B_FETCH_END - 500, B_FETCH_END + 500);
  const bPipelineOpa = bPipelineFlash > 0 && bPipelineFlash < 1 ? easeOut(bPipelineFlash < 0.5 ? bPipelineFlash * 2 : 2 - bPipelineFlash * 2) : 0;

  const bTransActive = currentTimeMs >= B_TRANSCODE_START && currentTimeMs < B_TRANSCODE_END;
  const bOutputOpa = snapEaseOut(prog(currentTimeMs, B_TRANSCODE_END - 200, B_TRANSCODE_END + 200));
  const bOutputTravel = easeInOut(prog(currentTimeMs, B_TRANSCODE_END, B_PLAY - 200));
  const bServeArrow = snapEaseOut(prog(currentTimeMs, B_TRANSCODE_END - 200, B_TRANSCODE_END));
  const bPlaying = snapEaseOut(prog(currentTimeMs, B_PLAY, B_PLAY + 500));

  const bNext1Opa = snapEaseOut(prog(currentTimeMs, B_NEXT_START, B_NEXT_START + 300));
  const bNext1Travel = easeInOut(prog(currentTimeMs, B_NEXT_START, B_NEXT_END));
  const bNext2Opa = snapEaseOut(prog(currentTimeMs, B_NEXT_START + 800, B_NEXT_START + 1100));
  const bNext2Travel = easeInOut(prog(currentTimeMs, B_NEXT_START + 800, B_NEXT_END + 400));

  // Cache-hit beat
  const bCacheSegOpa = snapEaseOut(prog(currentTimeMs, B_CACHE_START, B_CACHE_START + 300));
  const bCacheTravel = easeInOut(prog(currentTimeMs, B_CACHE_START, B_CACHE_END - 1000));
  const bCacheProxyActive = currentTimeMs >= B_CACHE_START && currentTimeMs < B_CACHE_END;
  const bCachePlaying = snapEaseOut(prog(currentTimeMs, B_CACHE_END - 1000, B_CACHE_END));

  // Particles — differentiated between acts
  const bParticlesActive = currentTimeMs >= B_FETCH_START && currentTimeMs < B_END;
  const bParticleTime = currentTimeMs - B_FETCH_START;

  // ── Visibility & transitions ──
  const tradFadeOut = currentTimeMs >= TRANSITION_START && currentTimeMs < C_START
    ? 1 - easeOut(prog(currentTimeMs, TRANSITION_START, TRANSITION_END))
    : 1;
  const tradVisible = currentTimeMs < TRANSITION_END;
  const efVisible = currentTimeMs >= B_IN && currentTimeMs < C_START;

  // ── Act 3: Gantt comparison ──
  const ganttVisible = currentTimeMs >= C_START && currentTimeMs < OUTRO_START;
  const ganttOpa = easeOut(prog(currentTimeMs, C_START, C_START + 1000));
  const ganttTradFill = easeInOut(prog(currentTimeMs, C_START + 500, C_START + 2500));
  const ganttEfFill = easeInOut(prog(currentTimeMs, C_START + 1500, C_START + 2500));

  // ── Outro ──
  const outroVisible = currentTimeMs >= OUTRO_START;
  const outroFadeGantt = 1 - easeOut(prog(currentTimeMs, OUTRO_START, OUTRO_START + 800));

  return (
    <>
      <Lights />
      <Captions currentTimeMs={currentTimeMs} />

      {/* ━━ ACT 1: TRADITIONAL (compressed) ━━━━━━━━━━━━━━━━━━━━━ */}
      {tradVisible && (
        <group>
          <FilmstripBar opacity={aBarOpa * tradFadeOut} position={[-1.2, -2.2, 0]} label="video.mp4" />

          <Arrow opacity={aUploadArrow * tradFadeOut} position={[-1.2, -1.2, 0.1]} length={1.2} color={COL_TRAD} up />
          <Label position={[-1.2 + BAR_W / 2 + 0.15, -1.2, 0.1]} fontSize={0.13} color="#ff8a65" opacity={aUploadArrow * tradFadeOut * 0.7} anchorX="left">
            upload entire file
          </Label>
          {aUploadParticles && (
            <ParticleStream from={[-1.2, -2.0, 0.1]} to={[-1.2, 0.2, 0.1]} count={80} color={COL_TRAD} opacity={0.5 * tradFadeOut} timeMs={aUploadTime} seed={1000} size={0.08} wobble={0.12} />
          )}

          <FilmstripBar opacity={aCopyOpa * tradFadeOut} position={[0, 1.8, 0]} label="copy on remote server" />
          <Arrow opacity={aTransArrow * tradFadeOut} position={[0, 1.1, 0.1]} color={COL_MACHINE} />
          <TranscodeBox opacity={aTransBoxOpa * tradFadeOut} active={aTransActive} scale={1} position={[0, 0.4, 0]} />

          <group position={[0, -0.5, 0]}>
            <VariantBar opacity={aVar1080 * tradFadeOut} color={COL_1080} width={BAR_W * 0.95} position={[0, 0.25, 0]} label="1080p" />
            <VariantBar opacity={aVar720 * tradFadeOut} color={COL_720} width={BAR_W * 0.7} position={[0, 0, 0]} label="720p" />
            <VariantBar opacity={aVar480 * tradFadeOut} color={COL_480} width={BAR_W * 0.45} position={[0, -0.25, 0]} label="480p" />
          </group>

          <Arrow opacity={aServeArrow * tradFadeOut} position={[1.2, -1.2, 0.1]} length={1.2} color={0x666688} />
          <Label position={[1.2 + BAR_W / 2 + 0.15, -1.2, 0.1]} fontSize={0.13} color="#aaaacc" opacity={aServeArrow * tradFadeOut * 0.7} anchorX="left">
            download for playback
          </Label>

          <PlayerScreen opacity={aPlayerOpa * tradFadeOut} playing={aPlaying * tradFadeOut} position={[1.2, -2.2, 0]} />
        </group>
      )}

      {/* ━━ ACT 2: EDITFRAME JIT (expanded, snappy motion) ━━━━━━━━━━ */}
      {efVisible && (
        <group>
          <FilmstripBar
            opacity={bBarOpa}
            position={[0, 2, 0]}
            label="https://your-cdn.com/video.mp4"
            dimSegments={bHighlightOn}
            highlightRange={bHighlightOn ? [1, 1] : undefined}
          />

          <Arrow opacity={bFetchArrow} position={[0, 1.35, 0.1]} color={COL_HIGHLIGHT} />
          <Label position={[0.4, 1.35, 0.1]} fontSize={0.13} color="#69f0ae" opacity={bFetchArrow * 0.7} anchorX="left">
            byte-range request
          </Label>

          <Segment
            opacity={bSegOpa}
            color={COL_HIGHLIGHT}
            label="0:10-0:20"
            position={[0, lerp(1.6, 0.5, bSegTravel), 0.1]}
          />

          <ProxyBox
            opacity={bProxyOpa}
            active={bTransActive}
            position={[0, 0, 0]}
            showPipeline={bPipelineOpa}
            cached={bCacheProxyActive && currentTimeMs >= B_CACHE_START + 500}
          />

          <Arrow opacity={bServeArrow} position={[0, -1.0, 0.1]} color={COL_EF} />
          <Label position={[0.4, -1.0, 0.1]} fontSize={0.13} color="#82b1ff" opacity={bServeArrow * 0.7} anchorX="left">
            stream to player
          </Label>

          <Segment
            opacity={bOutputOpa * (1 - bPlaying)}
            color={COL_EF}
            label="1080p"
            position={[0, lerp(-0.7, -1.7, bOutputTravel), 0.1]}
          />

          {bParticlesActive && (
            <ParticleStream from={[0, 1.6, 0.1]} to={[0, -2.0, 0.1]} count={30} color={COL_EF} opacity={0.5} timeMs={bParticleTime} seed={5000} size={0.04} wobble={0.03} />
          )}

          <PlayerScreen opacity={bPlayerOpa} playing={bPlaying} position={[0, -2.2, 0]} />

          {/* Next segments */}
          <Segment
            opacity={bNext1Opa * 0.6}
            color={COL_720}
            label="720p"
            position={[0.4, lerp(1.6, -2.0, bNext1Travel), 0.1]}
          />
          <Segment
            opacity={bNext2Opa * 0.5}
            color={COL_480}
            label="480p"
            position={[-0.4, lerp(1.6, -2.0, bNext2Travel), 0.1]}
          />

          {/* Cache-hit segment — bypasses transcode */}
          <Segment
            opacity={bCacheSegOpa * 0.7}
            color={COL_CACHE}
            label="cached"
            position={[0, lerp(1.6, -2.0, bCacheTravel), 0.15]}
          />
        </group>
      )}

      {/* ━━ ACT 3: GANTT COMPARISON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {ganttVisible && (
        <group position={[0, 0, 0]}>
          <GanttBar
            opacity={ganttOpa * (outroVisible ? outroFadeGantt : 1)}
            position={[0, 0.8, 0]}
            label="Traditional"
            totalWidth={6}
            segments={[
              { width: 2.0 * ganttTradFill, color: COL_TRAD, label: "upload", opacity: ganttTradFill },
              { width: 2.5 * ganttTradFill, color: COL_MACHINE, label: "transcode all", opacity: ganttTradFill },
              { width: 1.0 * ganttTradFill, color: 0x666688, label: "deliver", opacity: ganttTradFill },
            ]}
          />
          <GanttBar
            opacity={ganttOpa * (outroVisible ? outroFadeGantt : 1)}
            position={[0, -0.2, 0]}
            label="Editframe"
            totalWidth={6}
            segments={[
              { width: 0.3 * ganttEfFill, color: COL_HIGHLIGHT, label: "fetch", opacity: ganttEfFill },
              { width: 0.4 * ganttEfFill, color: COL_MACHINE, label: "transcode", opacity: ganttEfFill },
              { width: 0.15 * ganttEfFill, color: COL_EF, label: "stream", opacity: ganttEfFill },
            ]}
          />
          {/* Time axis */}
          <Label position={[-3, -1.2, 0]} fontSize={0.10} color="rgba(255,255,255,0.3)" opacity={ganttOpa * (outroVisible ? outroFadeGantt : 1)}>
            0s
          </Label>
          <Label position={[0, -1.2, 0]} fontSize={0.10} color="rgba(255,255,255,0.3)" opacity={ganttOpa * (outroVisible ? outroFadeGantt : 1)}>
            minutes
          </Label>
          <Label position={[3, -1.2, 0]} fontSize={0.10} color="rgba(255,255,255,0.3)" opacity={ganttOpa * (outroVisible ? outroFadeGantt : 1)}>
            15+ min
          </Label>
        </group>
      )}
    </>
  );
}
