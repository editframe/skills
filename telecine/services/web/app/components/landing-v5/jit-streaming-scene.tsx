// @ts-nocheck - React Three Fiber JSX intrinsics
import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

/* ━━ Visual Thinking Design ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TWO ANALOGIES sharing a common internal component:

   ANALOGY A — Traditional Platform (left side)
   ─────────────────────────────────────────────
   Step 1: "You have a file" — media block appears
   Step 2: "Upload the whole thing" — block travels through a pipe
           (the pipe has a bottleneck — it narrows)
   Step 3: "Ingest" — the TRANSCODE MACHINE chews through it
           (torus rings spin, the full block feeds in, variants come out)
   Step 4: "Store variants" — 3 variant blocks (1080/720/480) stack up
   Step 5: "Now you can play" — player screen lights up (finally)

   ANALOGY B — Editframe JIT (right side)
   ─────────────────────────────────────────────
   Step 1: "You have a URL" — same media block, but with a link icon
   Step 2: "Player asks for a frame" — player screen pulses (request)
   Step 3: "JIT fetches a byte range" — a thin slice peels off the
           media block and travels to…
   Step 4: "The SAME transcode machine" — REUSED from Analogy A,
           but smaller, processing just the slice (not the whole file)
   Step 5: "Stream to player" — the transcoded slice flies to the
           screen, which lights up immediately
   Step 6: "More slices follow" — additional slices peel and flow,
           each for a different bitrate, building up a cache

   THE SHARED ELEMENT: The "transcode machine" (torus rings)
   appears in both paths. In A it's large and grinds the whole file.
   In B it's compact and processes slivers instantly. Same work,
   radically different scale and timing.

   STRUCTURAL INSIGHT: "The transcode work is the same — but done
   lazily on tiny pieces, proxied from the source."

   ARC: Show A first (3-8s), then B (8-16s), then compare (16-20s)
   Total: ~20s. Not a race — a sequential reveal where B's
   efficiency is understood because you already saw what A requires.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ━━ Timing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
// Act 1: Traditional platform
const A_START = 0;
const A_FILE_IN = 500;       // Media block appears
const A_UPLOAD_START = 1500;  // Block enters upload pipe
const A_UPLOAD_END = 4000;    // Block exits pipe
const A_INGEST_START = 4000;  // Transcode machine starts
const A_INGEST_END = 7000;    // Variants emerge
const A_STORE = 7000;         // Variants stack up
const A_PLAY = 8000;          // Player lights up
const A_END = 9000;

// Transition: camera shifts right
const TRANSITION_START = 9000;
const TRANSITION_END = 10500;

// Act 2: Editframe JIT
const B_START = 10500;
const B_URL_IN = 10500;       // Media block (with URL) appears
const B_REQUEST = 11500;      // Player pulses — "give me a frame"
const B_SLICE_START = 12000;  // Slice peels off
const B_TRANSCODE = 12800;    // Slice enters mini transcode machine
const B_TRANSCODE_END = 13800; // Transcoded slice emerges
const B_STREAM = 14000;       // Slice flies to player
const B_PLAY = 14500;         // Player lights up (fast!)
const B_MORE_SLICES = 15000;  // Additional slices for other bitrates
const B_END = 17000;

// Act 3: Side-by-side reveal
const C_START = 17000;
const C_END = 20000;
const DURATION = 20000;

/* ━━ Layout ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TRAD_X = 0;      // Traditional (centered during Act 1, then shifts left)
const EF_X = 0;        // Editframe (centered during Act 2, then shifts right)
const SIDE_OFFSET = 4;  // How far apart in Act 3

/* ━━ Colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_FILE = 0x9575cd;      // Purple — source media
const COL_TRAD = 0xff8a65;      // Warm amber — traditional pipeline
const COL_PIPE = 0x78909c;      // Gray — upload pipe
const COL_MACHINE = 0xffab91;   // Salmon — transcode rings
const COL_VARIANT_HI = 0x448aff; // Blue — 1080p
const COL_VARIANT_MD = 0x64b5f6; // Light blue — 720p
const COL_VARIANT_LO = 0x90caf9; // Pale blue — 480p
const COL_EF = 0x82b1ff;        // Cool blue — editframe
const COL_JIT = 0xff5252;       // Red — JIT accent
const COL_SLICE = 0x69f0ae;     // Green — byte-range slice
const COL_SCREEN = 0x37474f;    // Dark — player frame
const COL_SCREEN_ON = 0x82b1ff; // Blue — screen playing

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
   SHARED REUSABLE COMPONENTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const SEGMENT_COUNT = 6;
const FILE_W = 2.0;
const FILE_H = 1.0;
const FILE_D = 0.18;
const SEG_W = FILE_W / SEGMENT_COUNT;
const SEG_GAP = 0.02;

/** 3D label — wraps drei Text with scene-appropriate defaults */
function Label({ text, position, color, fontSize, opacity, anchorX, anchorY }: {
  text: string;
  position: [number, number, number];
  color?: string;
  fontSize?: number;
  opacity?: number;
  anchorX?: "left" | "center" | "right";
  anchorY?: "top" | "middle" | "bottom";
}) {
  return (
    <Text
      position={position}
      fontSize={fontSize ?? 0.1}
      color={color ?? "#ffffff"}
      anchorX={anchorX ?? "center"}
      anchorY={anchorY ?? "middle"}
      fillOpacity={opacity ?? 1}
      font={undefined}
    >
      {text}
    </Text>
  );
}

/** The video file — a multi-segment bar representing actual file structure.
    Each segment is a visible block. Can highlight a region with a glow
    overlay to show which byte range is being accessed.
    
    Used in both analogies:
    - Traditional: the whole file, shown in full opacity
    - JIT: same file, with a highlighted region showing the byte range */
function VideoFile({ opacity, position, scale, highlightSegment, label }: {
  opacity: number;
  position: [number, number, number];
  scale?: number;
  highlightSegment?: number; // -1 = none, 0-5 = which segment to glow
  label?: string;
}) {
  const segRefs = useRef<(THREE.Mesh | null)[]>([]);
  const glowRef = useRef<THREE.Mesh>(null);
  const s = scale ?? 1;
  const hl = highlightSegment ?? -1;

  useFrame(() => {
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const mesh = segRefs.current[i];
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const isHighlighted = i === hl;
      mat.opacity = isHighlighted ? opacity : opacity * 0.6;
      mat.emissiveIntensity = isHighlighted ? 0.5 : 0.08;
      mesh.castShadow = opacity > 0.1;
    }
    // Highlight glow overlay
    if (glowRef.current) {
      const gMat = glowRef.current.material as THREE.MeshBasicMaterial;
      gMat.opacity = hl >= 0 ? opacity * 0.35 : 0;
      // Position the glow over the highlighted segment
      if (hl >= 0) {
        const segX = -FILE_W / 2 + SEG_W / 2 + hl * SEG_W;
        glowRef.current.position.x = segX;
      }
    }
  });

  // Segment colors alternate slightly for visual rhythm
  const segColors = [0x7e57c2, 0x9575cd, 0x7e57c2, 0x9575cd, 0x7e57c2, 0x9575cd];

  return (
    <group position={position} scale={[s, s, s]}>
      {/* File segments */}
      {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
        const segX = -FILE_W / 2 + SEG_W / 2 + i * SEG_W;
        return (
          <mesh
            key={i}
            ref={(el) => { segRefs.current[i] = el; }}
            position={[segX, 0, 0]}
            castShadow
          >
            <boxGeometry args={[SEG_W - SEG_GAP, FILE_H, FILE_D]} />
            <meshPhysicalMaterial
              color={segColors[i]}
              roughness={0.2}
              metalness={0.15}
              clearcoat={0.7}
              clearcoatRoughness={0.15}
              transparent
              opacity={0}
              emissive={new THREE.Color(segColors[i]!)}
              emissiveIntensity={0.08}
            />
          </mesh>
        );
      })}

      {/* Highlight glow overlay (additive) */}
      <mesh ref={glowRef} position={[0, 0, FILE_D / 2 + 0.01]}>
        <boxGeometry args={[SEG_W + 0.04, FILE_H + 0.04, 0.01]} />
        <meshBasicMaterial
          color={COL_SLICE}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Time markers along the bottom */}
      {Array.from({ length: SEGMENT_COUNT + 1 }, (_, i) => {
        const x = -FILE_W / 2 + i * SEG_W;
        const sec = i * 10;
        return (
          <Label
            key={`t${i}`}
            text={`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`}
            position={[x, -FILE_H / 2 - 0.12, FILE_D / 2 + 0.01]}
            fontSize={0.06}
            color="#8888aa"
            opacity={opacity * 0.7}
          />
        );
      })}

      {/* File label */}
      {label && (
        <Label
          text={label}
          position={[0, FILE_H / 2 + 0.14, FILE_D / 2 + 0.01]}
          fontSize={0.09}
          color="#bbbbdd"
          opacity={opacity * 0.85}
        />
      )}
    </group>
  );
}

/** A single segment extracted from the file — represents a byte-range fragment.
    Visually matches a single segment from VideoFile but can be positioned
    independently (it "peels off" and travels). */
function FileSegment({ opacity, emissive, color, position, scale, label }: {
  opacity: number;
  emissive: number;
  color?: number;
  position: [number, number, number];
  scale?: number;
  label?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const s = scale ?? 1;
  const c = color ?? COL_SLICE;

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = opacity;
    mat.emissiveIntensity = emissive;
    meshRef.current.castShadow = opacity > 0.1;
  });

  return (
    <group position={position} scale={[s, s, s]}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[SEG_W - SEG_GAP, FILE_H, FILE_D]} />
        <meshPhysicalMaterial
          color={c}
          roughness={0.15}
          metalness={0.2}
          clearcoat={0.6}
          transparent
          opacity={0}
          emissive={new THREE.Color(c)}
          emissiveIntensity={0}
        />
      </mesh>
      {label && (
        <Label
          text={label}
          position={[0, -FILE_H / 2 - 0.12, FILE_D / 2 + 0.01]}
          fontSize={0.07}
          color="#aaddaa"
          opacity={opacity * 0.8}
        />
      )}
    </group>
  );
}

/** The transcode machine — spinning torus rings.
    REUSED in both analogies at different scales.
    In traditional: large, grinds through the whole file.
    In JIT: compact, processes a single slice instantly. */
function TranscodeMachine({ opacity, processing, scale, position }: {
  opacity: number;
  processing: number; // 0-1, drives spin and glow
  scale: number;      // 1.0 for traditional, ~0.6 for JIT
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

    // Spin is deterministic from processing progress
    const spin = processing * Math.PI * 8;
    outerRef.current.rotation.x = spin;
    outerRef.current.rotation.z = spin * 0.6;
    innerRef.current.rotation.y = -spin * 1.4;
    innerRef.current.rotation.x = spin * 0.3;

    const active = processing > 0 && processing < 1;
    oMat.emissiveIntensity = active ? 0.2 + Math.sin(processing * Math.PI * 6) * 0.1 : opacity * 0.03;
    iMat.emissiveIntensity = active ? 0.25 + Math.sin(processing * Math.PI * 8) * 0.12 : opacity * 0.03;
  });

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh ref={outerRef} castShadow>
        <torusGeometry args={[0.55, 0.1, 12, 24]} />
        <meshPhysicalMaterial
          color={COL_MACHINE}
          roughness={0.25}
          metalness={0.5}
          clearcoat={0.6}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_MACHINE)}
          emissiveIntensity={0.03}
        />
      </mesh>
      <mesh ref={innerRef}>
        <torusGeometry args={[0.35, 0.07, 8, 18]} />
        <meshPhysicalMaterial
          color={COL_TRAD}
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_TRAD)}
          emissiveIntensity={0.03}
        />
      </mesh>
    </group>
  );
}

/** Upload pipe — a cylinder representing the upload channel.
    Has a visible bottleneck (narrowing). */
function UploadPipe({ opacity, position }: {
  opacity: number;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = opacity * 0.4;
    meshRef.current.castShadow = opacity > 0.1;
  });

  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.15, 0.35, 2.5, 12]} />
        <meshPhysicalMaterial
          color={COL_PIPE}
          roughness={0.5}
          metalness={0.3}
          transparent
          opacity={0}
        />
      </mesh>
    </group>
  );
}

/** Variant block — one of the output bitrate variants.
    Height encodes quality level. Label shows resolution. */
function VariantBlock({ opacity, color, height, position, label }: {
  opacity: number;
  color: number;
  height: number;
  position: [number, number, number];
  label: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = opacity;
    mat.emissiveIntensity = opacity * 0.2;
    meshRef.current.castShadow = opacity > 0.1;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[0.9, height, 0.15]} />
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
      <Label
        text={label}
        position={[0.55, 0, 0.01]}
        fontSize={0.08}
        color="#ccddff"
        opacity={opacity * 0.8}
        anchorX="left"
      />
    </group>
  );
}

/** Player screen — the destination display. Screen glows when content arrives. */
function PlayerScreen({ opacity, playing, position, scale }: {
  opacity: number;
  playing: number; // 0-1
  position: [number, number, number];
  scale?: number;
}) {
  const frameRef = useRef<THREE.Mesh>(null);
  const screenRef = useRef<THREE.Mesh>(null);
  const s = scale ?? 1;

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
    <group position={position} scale={[s, s, s]}>
      <mesh ref={frameRef} castShadow>
        <boxGeometry args={[1.6, 1.0, 0.08]} />
        <meshPhysicalMaterial
          color={COL_SCREEN}
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={0}
        />
      </mesh>
      <mesh ref={screenRef} position={[0, 0, 0.05]}>
        <boxGeometry args={[1.45, 0.85, 0.02]} />
        <meshStandardMaterial
          color={COL_SCREEN_ON}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_SCREEN_ON)}
          emissiveIntensity={0}
        />
      </mesh>
      {/* Stand */}
      <mesh position={[0, -0.6, -0.02]}>
        <cylinderGeometry args={[0.05, 0.15, 0.2, 8]} />
        <meshStandardMaterial color={0x546e7a} roughness={0.5} transparent opacity={opacity * 0.5} />
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
      const t = (timeMs * speeds[i]! * 0.0005 + i * 0.07) % 1;
      const wobbleX = (seededRandom(seed + i * 1000 + timeMs * 0.002) - 0.5) * 0.12;
      const wobbleY = (seededRandom(seed + i * 2000 + timeMs * 0.002) - 0.5) * 0.12;

      positions[i * 3] = lerp(from[0], to[0], t) + wobbleX;
      positions[i * 3 + 1] = lerp(from[1], to[1], t) + wobbleY + Math.sin(t * Math.PI) * 0.15;
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

/* ━━ Environment ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Floor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[50, 30]} />
        <meshStandardMaterial color={0x2a2e42} roughness={0.75} metalness={0.1} />
      </mesh>
      <gridHelper
        args={[30, 30, 0x3a3f58, 0x3a3f58]}
        position={[0, -1.49, 0]}
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
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-4, 5, -3]} intensity={0.5} color={0xaaccff} />
      <pointLight position={[0, 3, -4]} intensity={0.7} color={COL_EF} distance={20} />
    </>
  );
}

/* ━━ SCENE ORCHESTRATOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Scene({ currentTimeMs }: { currentTimeMs: number }) {
  const { camera } = useThree();

  // ── Camera choreography ──
  useFrame(() => {
    // Act 1: Traditional — centered, medium close
    const actAPos = new THREE.Vector3(0, 1.5, 5.5);
    const actATar = new THREE.Vector3(0, 0, 1);

    // Transition: pull back and prepare to shift right
    const actBPos = new THREE.Vector3(0, 1.5, 5.5);
    const actBTar = new THREE.Vector3(0, 0, 1);

    // Act 3: Wide shot showing both side by side
    const actCPos = new THREE.Vector3(0, 3.5, 10);
    const actCTar = new THREE.Vector3(0, 0, 1.5);

    const transitionProg = easeInOut(prog(currentTimeMs, TRANSITION_START, TRANSITION_END));
    const compareProg = easeInOut(prog(currentTimeMs, C_START, C_START + 1500));

    let pos = actAPos.clone();
    let tar = actATar.clone();

    // During transition, the camera stays centered
    if (transitionProg > 0) {
      pos.lerp(actBPos, transitionProg);
      tar.lerp(actBTar, transitionProg);
    }

    // During comparison, pull back to wide
    if (compareProg > 0) {
      pos.lerp(actCPos, compareProg);
      tar.lerp(actCTar, compareProg);
    }

    // Subtle shake during ingest processing
    if (currentTimeMs >= A_INGEST_START && currentTimeMs < A_INGEST_END) {
      const shake = 0.01;
      pos.x += Math.sin(currentTimeMs * 0.007) * shake;
      pos.y += Math.cos(currentTimeMs * 0.011) * shake;
    }

    camera.position.copy(pos);
    camera.lookAt(tar);
  });

  // ── Derived state: Act 1 — Traditional ──

  // File appearance
  const aFileOpa = easeOut(prog(currentTimeMs, A_FILE_IN, A_FILE_IN + 800));

  // Upload: file travels through pipe
  const aUploadPipeOpa = easeOut(prog(currentTimeMs, A_UPLOAD_START - 300, A_UPLOAD_START + 200));
  // File fades out as it enters the pipe, reappears at the machine
  const aFileInPipeOpa = currentTimeMs >= A_UPLOAD_START
    ? lerp(aFileOpa, 0, easeOut(prog(currentTimeMs, A_UPLOAD_START, A_UPLOAD_START + 600)))
    : aFileOpa;
  const aFileAtMachineOpa = easeOut(prog(currentTimeMs, A_UPLOAD_END - 400, A_UPLOAD_END));
  // File shrinks into machine
  const aFileIntoMachine = easeInOut(prog(currentTimeMs, A_INGEST_START, A_INGEST_START + 800));

  // Ingest: transcode machine processes
  const aMachineOpa = easeOut(prog(currentTimeMs, A_UPLOAD_END - 500, A_UPLOAD_END));
  const aIngestProg = prog(currentTimeMs, A_INGEST_START, A_INGEST_END);

  // Variants emerge
  const aVariantHiOpa = easeOut(prog(currentTimeMs, A_INGEST_END - 500, A_INGEST_END + 200));
  const aVariantMdOpa = easeOut(prog(currentTimeMs, A_INGEST_END - 200, A_INGEST_END + 400));
  const aVariantLoOpa = easeOut(prog(currentTimeMs, A_INGEST_END + 100, A_INGEST_END + 600));

  // Player lights up (finally)
  const aPlayerOpa = easeOut(prog(currentTimeMs, A_STORE - 500, A_STORE + 200));
  const aPlaying = easeOut(prog(currentTimeMs, A_PLAY, A_PLAY + 800));

  // Upload particles
  const aUploadParticles = currentTimeMs >= A_UPLOAD_START && currentTimeMs < A_UPLOAD_END;

  // ── Derived state: Act 2 — Editframe JIT ──

  const bUrlOpa = easeOut(prog(currentTimeMs, B_URL_IN, B_URL_IN + 800));

  // Player request pulse
  const bRequestPulse = easeOut(prog(currentTimeMs, B_REQUEST, B_REQUEST + 400)) *
    (1 - easeOut(prog(currentTimeMs, B_REQUEST + 400, B_REQUEST + 800)));

  // Slice peels off
  const bSliceOpa = easeOut(prog(currentTimeMs, B_SLICE_START, B_SLICE_START + 300));
  const bSliceTravel = easeInOut(prog(currentTimeMs, B_SLICE_START, B_TRANSCODE));

  // Mini transcode machine
  const bMachineOpa = easeOut(prog(currentTimeMs, B_SLICE_START - 200, B_SLICE_START + 300));
  const bTranscodeProg = prog(currentTimeMs, B_TRANSCODE, B_TRANSCODE_END);

  // Transcoded slice to player
  const bStreamProg = easeInOut(prog(currentTimeMs, B_STREAM, B_STREAM + 400));
  const bStreamOpa = easeOut(prog(currentTimeMs, B_STREAM, B_STREAM + 200)) *
    (1 - easeOut(prog(currentTimeMs, B_PLAY, B_PLAY + 300)));

  // Player lights up (immediately!)
  const bPlayerOpa = easeOut(prog(currentTimeMs, B_REQUEST - 300, B_REQUEST + 200));
  const bPlaying = easeOut(prog(currentTimeMs, B_PLAY, B_PLAY + 500));

  // More slices — show 2 additional slices for different bitrates
  const bSlice2Prog = easeInOut(prog(currentTimeMs, B_MORE_SLICES, B_MORE_SLICES + 1200));
  const bSlice2Opa = easeOut(prog(currentTimeMs, B_MORE_SLICES, B_MORE_SLICES + 300));
  const bSlice3Prog = easeInOut(prog(currentTimeMs, B_MORE_SLICES + 400, B_MORE_SLICES + 1600));
  const bSlice3Opa = easeOut(prog(currentTimeMs, B_MORE_SLICES + 400, B_MORE_SLICES + 700));

  // Stream particles
  const bParticlesActive = currentTimeMs >= B_STREAM && currentTimeMs < B_END;
  const bParticleTime = currentTimeMs >= B_STREAM ? currentTimeMs - B_STREAM : 0;

  // ── Act 3: Side-by-side shift ──
  const sideProg = easeInOut(prog(currentTimeMs, C_START, C_START + 1500));
  const tradShift = -SIDE_OFFSET * sideProg;
  const efShift = SIDE_OFFSET * sideProg;

  // During act 3, dim traditional, brighten editframe
  const tradDim = currentTimeMs >= C_START ? lerp(1, 0.4, sideProg) : 1;
  const efBright = 1;

  // Which act are we in? (for positioning)
  // Acts 1 & 3: traditional visible. Acts 2 & 3: editframe visible.
  const tradVisible = currentTimeMs < TRANSITION_END || currentTimeMs >= C_START;
  const efVisible = currentTimeMs >= B_START;

  // Act 1 fade-out during transition
  const tradActFade = currentTimeMs >= TRANSITION_START && currentTimeMs < C_START
    ? 1 - easeOut(prog(currentTimeMs, TRANSITION_START, TRANSITION_END))
    : (currentTimeMs >= C_START ? 1 : 1);

  // Act 3 traditional re-appearance
  const tradAct3Opa = currentTimeMs >= C_START ? easeOut(prog(currentTimeMs, C_START, C_START + 800)) : 0;
  const tradFinalOpa = currentTimeMs >= C_START ? tradAct3Opa * tradDim : tradActFade;

  return (
    <>
      <Lights />
      <Floor />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ACT 1: TRADITIONAL PLATFORM
          Shown centered, then fades during transition, reappears
          shifted left in Act 3.
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {tradVisible && (
        <group position={[tradShift, 0, 0]}>
          {/* Step 1: "You have a file" — multi-segment video file */}
          <VideoFile
            opacity={aFileInPipeOpa * tradFinalOpa}
            position={[0, 0.3, 0]}
            label="source.mp4 — 1080p, 60s"
          />

          {/* Step 2: Upload pipe (bottleneck shape) */}
          <UploadPipe
            opacity={aUploadPipeOpa * tradFinalOpa}
            position={[0, 0.3, 1.25]}
          />

          {/* Upload particles */}
          {aUploadParticles && (
            <ParticleStream
              from={[0, 0.3, 0.2]}
              to={[0, 0.3, 2.3]}
              count={60}
              color={COL_TRAD}
              size={0.05}
              opacity={0.6 * tradFinalOpa}
              timeMs={currentTimeMs - A_UPLOAD_START}
              seed={1000}
            />
          )}

          {/* File arriving at transcode machine (shrinks into it) */}
          <VideoFile
            opacity={aFileAtMachineOpa * (1 - aFileIntoMachine) * tradFinalOpa}
            scale={lerp(1, 0.3, aFileIntoMachine)}
            position={[0, 0.3, 2.5]}
          />

          {/* Step 3: Transcode machine (THE SHARED COMPONENT — large scale) */}
          <TranscodeMachine
            opacity={aMachineOpa * tradFinalOpa}
            processing={aIngestProg}
            scale={1.0}
            position={[0, 0.3, 3.2]}
          />
          {/* Machine label */}
          <Label
            text="Transcode"
            position={[0, -0.5, 3.2]}
            fontSize={0.1}
            color="#ffab91"
            opacity={aMachineOpa * tradFinalOpa * 0.7}
          />

          {/* Step 4: Variant blocks emerge with resolution labels */}
          <group position={[0, 0, 4.2]}>
            <VariantBlock opacity={aVariantHiOpa * tradFinalOpa} color={COL_VARIANT_HI} height={0.5} position={[0, 0.55, 0]} label="1080p" />
            <VariantBlock opacity={aVariantMdOpa * tradFinalOpa} color={COL_VARIANT_MD} height={0.35} position={[0, 0.15, 0]} label="720p" />
            <VariantBlock opacity={aVariantLoOpa * tradFinalOpa} color={COL_VARIANT_LO} height={0.2} position={[0, -0.15, 0]} label="480p" />
          </group>

          {/* Step 5: Player screen */}
          <PlayerScreen
            opacity={aPlayerOpa * tradFinalOpa}
            playing={aPlaying * tradFinalOpa}
            position={[0, 0.2, 5.2]}
          />
        </group>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ACT 2: EDITFRAME JIT
          Shown centered, then shifts right in Act 3.
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {efVisible && (
        <group position={[efShift, 0, 0]}>
          {/* Step 1: "You have a URL" — same VideoFile with highlight */}
          <VideoFile
            opacity={bUrlOpa * efBright}
            position={[0, 0.3, 0]}
            label="https://cdn.example.com/video.mp4"
            highlightSegment={currentTimeMs >= B_SLICE_START ? 1 : -1}
          />

          {/* Step 2: Player requests a frame — screen pulses */}
          <PlayerScreen
            opacity={bPlayerOpa * efBright}
            playing={bPlaying}
            position={[0, 0.2, 4.5]}
          />

          {/* Request pulse glow */}
          <pointLight
            position={[0, 0.2, 4.5]}
            color={COL_SCREEN_ON}
            intensity={bRequestPulse * 8}
            distance={4}
          />

          {/* Step 3: Byte-range segment peels off and travels to machine */}
          <FileSegment
            opacity={bSliceOpa}
            emissive={0.4}
            color={COL_SLICE}
            label="0:10–0:20"
            position={[
              0,
              0.3,
              lerp(0.3, 2.0, bSliceTravel)
            ]}
          />

          {/* Step 4: THE SAME TRANSCODE MACHINE — but smaller (compact) */}
          <TranscodeMachine
            opacity={bMachineOpa * efBright}
            processing={bTranscodeProg}
            scale={0.6}
            position={[0, 0.3, 2.2]}
          />
          <Label
            text="Transcode"
            position={[0, -0.25, 2.2]}
            fontSize={0.08}
            color="#ffab91"
            opacity={bMachineOpa * efBright * 0.7}
          />

          {/* Step 5: Transcoded segment streams to player */}
          <FileSegment
            opacity={bStreamOpa}
            emissive={0.5}
            color={COL_EF}
            label="1080p"
            position={[
              0,
              0.3,
              lerp(2.6, 4.3, bStreamProg)
            ]}
          />

          {/* Streaming particles */}
          {bParticlesActive && (
            <ParticleStream
              from={[0, 0.3, 2.5]}
              to={[0, 0.2, 4.3]}
              count={100}
              color={COL_EF}
              size={0.06}
              opacity={0.7 * efBright}
              timeMs={bParticleTime}
              seed={5000}
            />
          )}

          {/* Step 6: More segments for different bitrates (staggered) */}
          <FileSegment
            opacity={bSlice2Opa * 0.7}
            emissive={0.25}
            color={COL_VARIANT_MD}
            label="720p"
            position={[
              0.3,
              0.1,
              lerp(0.3, 4.3, bSlice2Prog)
            ]}
            scale={0.8}
          />
          <FileSegment
            opacity={bSlice3Opa * 0.6}
            emissive={0.2}
            color={COL_VARIANT_LO}
            label="480p"
            position={[
              -0.3,
              -0.1,
              lerp(0.3, 4.3, bSlice3Prog)
            ]}
            scale={0.6}
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
      camera={{ position: [0, 1.5, 5.5], fov: 50 }}
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
