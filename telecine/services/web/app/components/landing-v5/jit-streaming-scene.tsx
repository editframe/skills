// @ts-nocheck - React Three Fiber JSX intrinsics
import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

/* ━━ Design: Whiteboard first, then 3D ━━━━━━━━━━━━━━━━━━━━━━━━━━
   Everything here starts from what you'd draw on a whiteboard:
   flat horizontal bars, arrows, highlighted regions. The 3D adds
   camera, lighting, and depth — it doesn't replace legibility.

   TRADITIONAL:
   [████████████████████████████]  "video.mp4"
                |  upload whole file
   [████████████████████████████]  copy on server
                |  transcode all of it
   [████████████] 1080p
   [████████]     720p
   [█████]        480p
                |  store, then serve
           [ PLAYER ]

   EDITFRAME JIT:
   [░░░░██████░░░░░░░░░░░░░░░░]  file stays on YOUR server
          ↑ fetch bytes 0:10–0:20
          |
      [transcode]  just this piece
          |
      [ PLAYER ]  already playing
          next: 0:20–0:30 ...

   The shapes are flat bars. The highlight is transparency.
   The 3D adds polish. Nothing requires interpretation.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ━━ Sizing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const BAR_W = 4.5;        // Total width of the filmstrip bar
const BAR_H = 0.25;       // Height of each bar
const BAR_D = 0.15;       // Depth (thin — this is fundamentally 2D)
const NUM_SEGS = 6;        // Visible segments in the bar
const SEG_W = BAR_W / NUM_SEGS;

/* ━━ Timing — narration pace ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Each beat gets 2-3s to land + breathe before the next one.
   Imagined narration in comments.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ACT 1: Traditional
// "You have a video file."
const A_IN = 500;
//                              ... let it sit for a beat ...
// "To use it, you upload the entire thing to their servers."
const A_UPLOAD_START = 3000;
const A_UPLOAD_END = 6500;      // 3.5s of slow upload flow
//                              ... copy appears ...
// "Then they transcode it — every frame, every bitrate."
const A_TRANSCODE_START = 8000;
const A_TRANSCODE_END = 12000;  // 4s of grinding
//                              ... variants land one by one ...
// "1080p. 720p. 480p. Three complete copies, stored."
const A_VARIANTS_START = 12500;
//                              ... breathe ...
// "Only now can someone press play."
const A_PLAY = 15000;
const A_END = 17000;

// TRANSITION
// "What if you could skip all of that?"
const TRANSITION_START = 17000;
const TRANSITION_END = 19500;

// ACT 2: Editframe JIT
// "Same file. But it stays where it is — on your server."
const B_IN = 19500;
//                              ... let the URL bar sit ...
// "When the player needs a frame..."
const B_PLAYER_IN = 21500;
// "...it highlights just the bytes it needs."
const B_HIGHLIGHT = 23000;
//                              ... hold the highlight ...
// "A byte-range request fetches just that slice."
const B_FETCH_START = 24500;
const B_FETCH_END = 26500;      // 2s travel
// "Same transcode — but just this piece."
const B_TRANSCODE_START = 27000;
const B_TRANSCODE_END = 29000;  // 2s processing
//                              ... output streams to player ...
// "Already playing."
const B_PLAY = 30000;
//                              ... let it breathe ...
// "Next segment. Different bitrate. Streamed on demand."
const B_NEXT_START = 32000;
const B_NEXT_END = 35000;       // 3s staggered flow
const B_END = 36000;

// ACT 3: Side-by-side comparison
// "Same transcode work. No upload. No ingest delay."
const C_START = 37000;
const DURATION = 42000;

/* ━━ Colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_BAR = 0x7e57c2;       // Purple — file segments
const COL_BAR_DIM = 0x5c3d99;   // Darker purple — dimmed segments
const COL_HIGHLIGHT = 0x69f0ae; // Green — highlighted byte range
const COL_TRAD = 0xff8a65;      // Amber — traditional accent
const COL_1080 = 0x448aff;      // Blue — 1080p
const COL_720 = 0x64b5f6;       // Light blue — 720p
const COL_480 = 0x90caf9;       // Pale blue — 480p
const COL_MACHINE = 0xffab91;   // Salmon — transcode machine
const COL_EF = 0x82b1ff;        // Editframe blue
const COL_BG = 0x3d4158;        // Background bar
const COL_PLAYER_ON = 0x82b1ff; // Player screen glow

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
   COMPONENTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** 3D label using drei Text */
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
      fontSize={fontSize ?? 0.12}
      color={color ?? "#aaaacc"}
      anchorX={anchorX ?? "center"}
      anchorY="middle"
      fillOpacity={opacity ?? 1}
    >
      {children}
    </Text>
  );
}

/** The filmstrip bar — a horizontal bar divided into visible segments.
    This is THE core visual: a video file represented as a segmented bar.
    
    `dimSegments` makes non-highlighted segments translucent.
    `highlightRange` glows a range of segments green.
    `label` floats above. */
function FilmstripBar({ opacity, position, label, dimSegments, highlightRange }: {
  opacity: number;
  position: [number, number, number];
  label?: string;
  dimSegments?: boolean;
  highlightRange?: [number, number]; // [startSeg, endSeg] inclusive
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
        mat.opacity = dim ? opacity * 0.35 : opacity * 0.85;
        mat.emissiveIntensity = 0.06;
      }
      mesh.castShadow = opacity > 0.1;
    }
  });

  const segGap = 0.03;

  return (
    <group position={position}>
      {/* Background bar */}
      <mesh>
        <boxGeometry args={[BAR_W + 0.06, BAR_H + 0.06, BAR_D * 0.5]} />
        <meshStandardMaterial color={COL_BG} roughness={0.8} transparent opacity={opacity * 0.4} />
      </mesh>

      {/* Segments */}
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
              emissiveIntensity={0.06}
            />
          </mesh>
        );
      })}

      {/* Time labels below */}
      <Label position={[-BAR_W / 2, -BAR_H / 2 - 0.12, BAR_D]} fontSize={0.07} opacity={opacity * 0.5}>
        0:00
      </Label>
      <Label position={[0, -BAR_H / 2 - 0.12, BAR_D]} fontSize={0.07} opacity={opacity * 0.5}>
        0:30
      </Label>
      <Label position={[BAR_W / 2, -BAR_H / 2 - 0.12, BAR_D]} fontSize={0.07} opacity={opacity * 0.5}>
        1:00
      </Label>

      {/* Label above */}
      {label && (
        <Label position={[0, BAR_H / 2 + 0.14, BAR_D]} fontSize={0.1} opacity={opacity * 0.8}>
          {label}
        </Label>
      )}
    </group>
  );
}

/** A single segment that has been extracted from a filmstrip bar.
    Used to show a byte-range chunk traveling through the pipeline.
    Visually identical to one segment of the FilmstripBar. */
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
        <Label position={[0, -BAR_H / 2 - 0.1, BAR_D * 0.5]} fontSize={0.08} color="#88ddaa" opacity={opacity * 0.8}>
          {label}
        </Label>
      )}
    </group>
  );
}

/** Output variant bar — a shorter filmstrip bar for a single bitrate.
    Width encodes that it's a complete transcode of the full file. */
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
      <Label position={[width / 2 + 0.15, 0, BAR_D * 0.5]} fontSize={0.09} color="#ccddff" opacity={opacity * 0.8} anchorX="left">
        {label}
      </Label>
    </group>
  );
}

/** The transcode process — shown as a labeled box.
    REUSED in both analogies at different scales.
    Not a spinning torus — just a clear labeled box with a glow. */
function TranscodeBox({ opacity, active, scale, position }: {
  opacity: number;
  active: boolean;
  scale: number;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = opacity;
    mat.emissiveIntensity = active ? 0.35 : opacity * 0.05;
    meshRef.current.castShadow = opacity > 0.1;
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
      <Label position={[0, 0, 0.16]} fontSize={0.12 * (1 / scale)} color="#ffffff" opacity={opacity * 0.9}>
        transcode
      </Label>
      <pointLight color={COL_MACHINE} intensity={active ? 3 : 0} distance={4} />
    </group>
  );
}

/** Arrow — a flat arrow shape pointing down (positive Y to negative Y).
    Represents data flow direction. The most basic whiteboard element. */
function Arrow({ opacity, position, length, color }: {
  opacity: number;
  position: [number, number, number];
  length?: number;
  color?: number;
}) {
  const shaftRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const len = length ?? 0.6;
  const col = color ?? 0x666688;

  useFrame(() => {
    if (!shaftRef.current || !headRef.current) return;
    (shaftRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.5;
    (headRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.5;
  });

  return (
    <group position={position}>
      <mesh ref={shaftRef}>
        <boxGeometry args={[0.04, len, 0.02]} />
        <meshBasicMaterial color={col} transparent opacity={0} />
      </mesh>
      <mesh ref={headRef} position={[0, -len / 2 - 0.06, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.07, 0.12, 3]} />
        <meshBasicMaterial color={col} transparent opacity={0} />
      </mesh>
    </group>
  );
}

/** Player screen */
function PlayerScreen({ opacity, playing, position }: {
  opacity: number;
  playing: number;
  position: [number, number, number];
}) {
  const frameRef = useRef<THREE.Mesh>(null);
  const screenRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!frameRef.current || !screenRef.current) return;
    (frameRef.current.material as THREE.MeshPhysicalMaterial).opacity = opacity;
    frameRef.current.castShadow = opacity > 0.1;
    const sMat = screenRef.current.material as THREE.MeshStandardMaterial;
    sMat.opacity = opacity * 0.9;
    sMat.emissiveIntensity = playing * 0.7;
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
    </group>
  );
}

/** Particle stream */
function ParticleStream({ from, to, count, color, opacity, timeMs, seed }: {
  from: [number, number, number];
  to: [number, number, number];
  count: number;
  color: number;
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
    (pointsRef.current.material as THREE.PointsMaterial).opacity = opacity;
    if (opacity <= 0) return;

    const positions = pointsRef.current.geometry.attributes.position!.array as Float32Array;
    const speeds = speedsRef.current;

    for (let i = 0; i < count; i++) {
      const t = (timeMs * speeds[i]! * 0.0005 + i * 0.07) % 1;
      const wx = (seededRandom(seed + i * 1000 + timeMs * 0.002) - 0.5) * 0.08;
      const wy = (seededRandom(seed + i * 2000 + timeMs * 0.002) - 0.5) * 0.08;
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
      <pointsMaterial color={color} size={0.06} transparent opacity={0} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

/* ━━ Environment ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Floor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]} receiveShadow>
        <planeGeometry args={[50, 30]} />
        <meshStandardMaterial color={0x2a2e42} roughness={0.75} metalness={0.1} />
      </mesh>
      <gridHelper args={[30, 30, 0x3a3f58, 0x3a3f58]} position={[0, -3.49, 0]} material-transparent material-opacity={0.15} />
    </>
  );
}

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
function Scene({ currentTimeMs }: { currentTimeMs: number }) {
  const { camera } = useThree();

  /* ── Layout is vertical: each step flows downward ── 
     Y positions (top to bottom):
     y=2    source file
     y=1    arrow
     y=0    server copy / transcode box
     y=-1   arrow
     y=-2   variant bars / player
  */

  // ── Camera ──
  useFrame(() => {
    // Acts 1 & 2: looking at the vertical flow, slightly angled
    const basePos = new THREE.Vector3(0, 0, 6);
    const baseTar = new THREE.Vector3(0, -0.5, 0);

    // Act 3: pull back to see both side by side
    const widePos = new THREE.Vector3(0, 0.5, 9);
    const wideTar = new THREE.Vector3(0, -0.5, 0);

    const compareProg = easeInOut(prog(currentTimeMs, C_START, C_START + 1500));

    const pos = basePos.clone().lerp(widePos, compareProg);
    const tar = baseTar.clone().lerp(wideTar, compareProg);

    camera.position.copy(pos);
    camera.lookAt(tar);
  });

  // ── Act 1: Traditional ──

  // "You have a video file."
  const aBarOpa = easeOut(prog(currentTimeMs, A_IN, A_IN + 1000));

  // "You upload the entire thing."
  const aUploadArrow = easeOut(prog(currentTimeMs, A_UPLOAD_START - 500, A_UPLOAD_START));
  const aUploadParticles = currentTimeMs >= A_UPLOAD_START && currentTimeMs < A_UPLOAD_END;
  const aUploadTime = currentTimeMs - A_UPLOAD_START;

  // Server copy materializes as upload completes
  const aCopyOpa = easeOut(prog(currentTimeMs, A_UPLOAD_END - 800, A_UPLOAD_END));

  // "Then they transcode it."
  const aTransArrow = easeOut(prog(currentTimeMs, A_TRANSCODE_START - 600, A_TRANSCODE_START));
  const aTransBoxOpa = easeOut(prog(currentTimeMs, A_TRANSCODE_START - 800, A_TRANSCODE_START));
  const aTransActive = currentTimeMs >= A_TRANSCODE_START && currentTimeMs < A_TRANSCODE_END;

  // "1080p. 720p. 480p." — staggered, each lands individually
  const aVar1080 = easeOut(prog(currentTimeMs, A_VARIANTS_START, A_VARIANTS_START + 600));
  const aVar720 = easeOut(prog(currentTimeMs, A_VARIANTS_START + 800, A_VARIANTS_START + 1400));
  const aVar480 = easeOut(prog(currentTimeMs, A_VARIANTS_START + 1600, A_VARIANTS_START + 2200));

  // "Only now can someone press play."
  const aServeArrow = easeOut(prog(currentTimeMs, A_PLAY - 800, A_PLAY - 200));
  const aPlayerOpa = easeOut(prog(currentTimeMs, A_PLAY - 600, A_PLAY));
  const aPlaying = easeOut(prog(currentTimeMs, A_PLAY, A_PLAY + 800));

  // ── Act 2: Editframe JIT ──

  // "Same file. But it stays on your server."
  const bBarOpa = easeOut(prog(currentTimeMs, B_IN, B_IN + 1000));

  // "When the player needs a frame..."
  const bPlayerOpa = easeOut(prog(currentTimeMs, B_PLAYER_IN, B_PLAYER_IN + 800));

  // "...it highlights just the bytes it needs."
  const bHighlightOn = currentTimeMs >= B_HIGHLIGHT;

  // "A byte-range request fetches just that slice."
  const bFetchArrow = easeOut(prog(currentTimeMs, B_FETCH_START - 500, B_FETCH_START));
  const bSegOpa = easeOut(prog(currentTimeMs, B_FETCH_START, B_FETCH_START + 400));
  const bSegTravel = easeInOut(prog(currentTimeMs, B_FETCH_START, B_FETCH_END));

  // "Same transcode — but just this piece."
  const bTransBoxOpa = easeOut(prog(currentTimeMs, B_TRANSCODE_START - 600, B_TRANSCODE_START));
  const bTransActive = currentTimeMs >= B_TRANSCODE_START && currentTimeMs < B_TRANSCODE_END;

  // Output segment streams to player
  const bOutputOpa = easeOut(prog(currentTimeMs, B_TRANSCODE_END - 300, B_TRANSCODE_END + 300));
  const bOutputTravel = easeInOut(prog(currentTimeMs, B_TRANSCODE_END, B_PLAY - 200));
  const bServeArrow = easeOut(prog(currentTimeMs, B_TRANSCODE_END - 300, B_TRANSCODE_END));

  // "Already playing."
  const bPlaying = easeOut(prog(currentTimeMs, B_PLAY, B_PLAY + 600));

  // "Next segment. Different bitrate."
  const bNext1Opa = easeOut(prog(currentTimeMs, B_NEXT_START, B_NEXT_START + 400));
  const bNext1Travel = easeInOut(prog(currentTimeMs, B_NEXT_START, B_NEXT_END));
  const bNext2Opa = easeOut(prog(currentTimeMs, B_NEXT_START + 1000, B_NEXT_START + 1400));
  const bNext2Travel = easeInOut(prog(currentTimeMs, B_NEXT_START + 1000, B_NEXT_END + 500));

  // Particles
  const bParticlesActive = currentTimeMs >= B_FETCH_START && currentTimeMs < B_END;
  const bParticleTime = currentTimeMs - B_FETCH_START;

  // ── Act 3: Side-by-side ──
  const sideProg = easeInOut(prog(currentTimeMs, C_START, C_START + 1500));
  const tradShift = -3.2 * sideProg;
  const efShift = 3.2 * sideProg;

  const tradVisible = currentTimeMs < TRANSITION_END || currentTimeMs >= C_START;
  const efVisible = currentTimeMs >= B_IN;

  // Fade traditional out during transition, back in during comparison
  const tradFadeOut = currentTimeMs >= TRANSITION_START && currentTimeMs < C_START
    ? 1 - easeOut(prog(currentTimeMs, TRANSITION_START, TRANSITION_END))
    : 1;
  const tradFadeIn = currentTimeMs >= C_START
    ? easeOut(prog(currentTimeMs, C_START, C_START + 800)) * lerp(1, 0.4, sideProg)
    : tradFadeOut;

  return (
    <>
      <Lights />
      <Floor />

      {/* ━━ ACT 1: TRADITIONAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {tradVisible && (
        <group position={[tradShift, 0, 0]}>

          {/* Source file */}
          <FilmstripBar opacity={aBarOpa * tradFadeIn} position={[0, 2, 0]} label="video.mp4" />

          {/* ↓ Upload */}
          <Arrow opacity={aUploadArrow * tradFadeIn} position={[0, 1.35, 0.1]} color={COL_TRAD} />
          <Label position={[0.4, 1.35, 0.1]} fontSize={0.09} color="#ff8a65" opacity={aUploadArrow * tradFadeIn * 0.7} anchorX="left">
            upload entire file
          </Label>
          {aUploadParticles && (
            <ParticleStream from={[0, 1.9, 0.1]} to={[0, 0.6, 0.1]} count={40} color={COL_TRAD} opacity={0.5 * tradFadeIn} timeMs={aUploadTime} seed={1000} />
          )}

          {/* Copy on server */}
          <FilmstripBar opacity={aCopyOpa * tradFadeIn} position={[0, 0.5, 0]} label="copy on server" />

          {/* ↓ Transcode */}
          <Arrow opacity={aTransArrow * tradFadeIn} position={[0, -0.15, 0.1]} color={COL_MACHINE} />
          <TranscodeBox opacity={aTransBoxOpa * tradFadeIn} active={aTransActive} scale={1} position={[0, -0.8, 0]} />

          {/* Output variants — staggered, each lands individually */}
          <group position={[0, -1.6, 0]}>
            <VariantBar opacity={aVar1080 * tradFadeIn} color={COL_1080} width={BAR_W * 0.95} position={[0, 0.25, 0]} label="1080p" />
            <VariantBar opacity={aVar720 * tradFadeIn} color={COL_720} width={BAR_W * 0.7} position={[0, 0, 0]} label="720p" />
            <VariantBar opacity={aVar480 * tradFadeIn} color={COL_480} width={BAR_W * 0.45} position={[0, -0.25, 0]} label="480p" />
          </group>

          {/* ↓ Serve */}
          <Arrow opacity={aServeArrow * tradFadeIn} position={[0, -2.2, 0.1]} />

          {/* Player */}
          <PlayerScreen opacity={aPlayerOpa * tradFadeIn} playing={aPlaying * tradFadeIn} position={[0, -2.8, 0]} />
        </group>
      )}

      {/* ━━ ACT 2: EDITFRAME JIT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {efVisible && (
        <group position={[efShift, 0, 0]}>

          {/* Source file — stays on YOUR server, with highlighted region */}
          <FilmstripBar
            opacity={bBarOpa}
            position={[0, 2, 0]}
            label="https://your-cdn.com/video.mp4"
            dimSegments={bHighlightOn}
            highlightRange={bHighlightOn ? [1, 1] : undefined}
          />

          {/* ↓ Fetch byte range */}
          <Arrow opacity={bFetchArrow} position={[0, 1.35, 0.1]} color={COL_HIGHLIGHT} />
          <Label position={[0.4, 1.35, 0.1]} fontSize={0.09} color="#69f0ae" opacity={bFetchArrow * 0.7} anchorX="left">
            fetch bytes 0:10–0:20
          </Label>

          {/* The segment traveling down */}
          <Segment
            opacity={bSegOpa}
            color={COL_HIGHLIGHT}
            label="0:10–0:20"
            position={[0, lerp(1.6, 0.6, bSegTravel), 0.1]}
          />

          {/* Transcode box — same component, smaller */}
          <TranscodeBox opacity={bTransBoxOpa} active={bTransActive} scale={0.7} position={[0, -0.1, 0]} />

          {/* ↓ Output */}
          <Arrow opacity={bServeArrow} position={[0, -0.7, 0.1]} color={COL_EF} />

          {/* Transcoded segment traveling to player */}
          <Segment
            opacity={bOutputOpa * (1 - bPlaying)}
            color={COL_EF}
            label="1080p"
            position={[0, lerp(-0.5, -1.5, bOutputTravel), 0.1]}
          />

          {/* Particles flowing */}
          {bParticlesActive && (
            <ParticleStream from={[0, 1.6, 0.1]} to={[0, -1.8, 0.1]} count={60} color={COL_EF} opacity={0.5} timeMs={bParticleTime} seed={5000} />
          )}

          {/* Player */}
          <PlayerScreen opacity={bPlayerOpa} playing={bPlaying} position={[0, -2.0, 0]} />

          {/* "Next" segments — additional fetches staggered */}
          <Segment
            opacity={bNext1Opa * 0.6}
            color={COL_720}
            label="720p"
            position={[0.4, lerp(1.6, -1.8, bNext1Travel), 0.1]}
          />
          <Segment
            opacity={bNext2Opa * 0.5}
            color={COL_480}
            label="480p"
            position={[-0.4, lerp(1.6, -1.8, bNext2Travel), 0.1]}
          />
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
      camera={{ position: [0, 0, 6], fov: 50 }}
      style={{ background: "#1e2233", width: "100%", height: "100%" }}
      onCreated={({ gl }: { gl: THREE.WebGLRenderer }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.8;
      }}
    >
      <fog attach="fog" args={[0x1e2233, 20, 45]} />
      <Scene currentTimeMs={currentTimeMs} />
    </Canvas>
  );
}
