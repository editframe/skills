// @ts-nocheck - React Three Fiber types installed with --legacy-peer-deps
import { useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Box, Line } from "@react-three/drei";
import * as THREE from "three";

/* ━━ Visual Thinking Analysis ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CORE STRUCTURE: Remote URL → Byte-range → JIT → Transcode → Stream
   QUESTION TYPE: HOW (process/mechanism)
   IMAGE SCHEMA: PATH + FORCE (data flows through transformation)
   
   NARRATIVE ARC:
   P1 (0-2s):   Hero - Remote video file highlighted
   P2 (2-3s):   Question - "How do you play it instantly?"
   P3 (3-7s):   Mechanism - Byte-range chunks flow through JIT
   P4 (7-9s):   Punchline - Instant playback, comparison text
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ━━ Timing constants ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const P1_END = 2000;
const P2_START = 2000;
const P2_END = 3000;
const P3_START = 3000;
const P4_START = 7000;
const P4_END = 12000;

/* ━━ Colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_URL = 0x9575cd;      // Purple for remote URL
const COL_JIT = 0xff5252;      // Red for JIT service (poster-red)
const COL_CHUNK = 0x82b1ff;    // Blue for streaming chunks

/* ━━ Easing & helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }
function prog(ms: number, s: number, e: number) { return clamp01((ms - s) / (e - s)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* ━━ Seeded pseudo-random number generator ━━━━━━━━━━━━━━━━━━━━━━━ */
// Simple hash function for deterministic "random" numbers
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/* ━━ Camera animation controller ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function CameraRig({ currentTimeMs }: { currentTimeMs: number }) {
  const { camera } = useThree();

  useFrame(() => {
    // Phase 1: Close on URL (hero moment)
    const closePos = new THREE.Vector3(-4, 1, 3);
    const closeTar = new THREE.Vector3(-4, 0.5, 0);

    // Phase 3: Pull back to reveal full pipeline
    const pullBack = easeInOut(prog(currentTimeMs, P3_START - 500, P3_START + 1000));
    const widePos = new THREE.Vector3(0, 3, 8);
    const wideTar = new THREE.Vector3(0, 0, 0);

    // Phase 4: Orbit toward renderer (the winner)
    const orbit = easeOut(prog(currentTimeMs, P4_START, P4_END));
    const winPos = new THREE.Vector3(3, 2.5, 6);
    const winTar = new THREE.Vector3(3, 0, 0);

    // Interpolate camera position
    const pos = closePos.clone();
    const tar = closeTar.clone();

    if (pullBack > 0) {
      pos.lerp(widePos, pullBack);
      tar.lerp(wideTar, pullBack);
    }

    if (orbit > 0) {
      pos.lerp(winPos, orbit);
      tar.lerp(winTar, orbit);
    }

    // Snap zoom on punchline
    const snapProg = prog(currentTimeMs, P4_START, P4_START + 300);
    if (snapProg > 0 && snapProg < 1) {
      const snap = Math.sin(snapProg * Math.PI) * 0.5;
      pos.z -= snap;
    }

    camera.position.copy(pos);
    camera.lookAt(tar);
  });

  return null;
}

/* ━━ Remote URL node ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function RemoteURL({ currentTimeMs }: { currentTimeMs: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (!meshRef.current) return;

    // Fade in during phase 1
    const p1 = easeOut(prog(currentTimeMs, 0, P1_END));
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = p1;
    mat.emissiveIntensity = lerp(0, 0.4, p1);
    meshRef.current.castShadow = p1 > 0.1;

    // Pulse during active phase with seeded variation
    if (currentTimeMs >= P3_START && currentTimeMs < P4_END) {
      const phase = (currentTimeMs - P3_START) * 0.003;
      const pulse = Math.sin(phase) * 0.15;
      // Add subtle deterministic variation
      const variation = seededRandom(Math.floor(phase * 10) + 100) * 0.05;
      mat.emissiveIntensity = 0.4 + pulse + variation;
      if (glowRef.current) {
        glowRef.current.intensity = 2 + pulse * 3 + variation * 2;
      }
    }
  });

  return (
    <group position={[-4, 0.5, 0]}>
      <Box ref={meshRef} args={[1.2, 0.6, 0.4]} castShadow>
        <meshPhysicalMaterial
          color={COL_URL}
          roughness={0.15}
          metalness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_URL)}
          emissiveIntensity={0}
        />
      </Box>
      <pointLight ref={glowRef} color={COL_URL} intensity={0} distance={5} />
    </group>
  );
}

/* ━━ JIT Service node ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function JITService({ currentTimeMs }: { currentTimeMs: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (!meshRef.current) return;

    // Appear during phase 2
    const appear = easeOut(prog(currentTimeMs, P2_START, P2_END));
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = appear;
    mat.emissiveIntensity = lerp(0, 0.6, appear);
    meshRef.current.castShadow = appear > 0.1;

    // Heavy pulse during processing (phase 3-4) with seeded variation
    if (currentTimeMs >= P3_START && currentTimeMs < P4_END) {
      const processing = prog(currentTimeMs, P3_START, P4_END);
      const pulse = Math.sin(processing * Math.PI * 8) * 0.25;
      // Add organic variation to the pulse
      const variation = seededRandom(Math.floor(processing * 100) + 200) * 0.08;
      mat.emissiveIntensity = 0.6 + pulse + variation;
      meshRef.current.rotation.y = Math.sin(processing * Math.PI * 4) * 0.1;

      if (glowRef.current) {
        glowRef.current.intensity = 4 + pulse * 4 + variation * 3;
      }
    }
  });

  return (
    <group position={[0, 0.5, 0]}>
      <Box ref={meshRef} args={[1.4, 0.7, 0.5]} castShadow>
        <meshPhysicalMaterial
          color={COL_JIT}
          roughness={0.1}
          metalness={0.3}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_JIT)}
          emissiveIntensity={0}
        />
      </Box>
      <pointLight ref={glowRef} color={COL_JIT} intensity={0} distance={6} />
    </group>
  );
}

/* ━━ Renderer/Player node ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Renderer({ currentTimeMs }: { currentTimeMs: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const screenRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || !screenRef.current) return;

    // Appear during phase 2
    const appear = easeOut(prog(currentTimeMs, P2_START + 200, P2_END + 200));
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    const screenMat = screenRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = appear;
    screenMat.opacity = appear * 0.9;
    meshRef.current.castShadow = appear > 0.1;

    // Screen lights up during playback
    if (currentTimeMs >= P4_START) {
      const playback = easeOut(prog(currentTimeMs, P4_START, P4_START + 800));
      screenMat.emissiveIntensity = lerp(0, 0.8, playback);
    }
  });

  return (
    <group position={[4, 0.5, 0]}>
      {/* Monitor body */}
      <Box ref={meshRef} args={[1.0, 0.6, 0.3]} castShadow>
        <meshPhysicalMaterial
          color={0x505870}
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={0}
        />
      </Box>
      {/* Screen */}
      <Box ref={screenRef} args={[0.85, 0.5, 0.02]} position={[0, 0, 0.16]}>
        <meshStandardMaterial
          color={COL_CHUNK}
          transparent
          opacity={0}
          emissive={new THREE.Color(COL_CHUNK)}
          emissiveIntensity={0}
        />
      </Box>
    </group>
  );
}

/* ━━ Data flow particles ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function DataFlow({ currentTimeMs }: { currentTimeMs: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const PARTICLE_COUNT = 200;

  // Initialize particle speeds (only need to generate once)
  const particleSpeeds = useRef<Float32Array>(
    new Float32Array(PARTICLE_COUNT).map((_, i) => 0.3 + seededRandom(i * 100) * 0.7)
  );

  useFrame(() => {
    if (!pointsRef.current) return;

    // Only show particles during processing
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    if (currentTimeMs >= P3_START && currentTimeMs < P4_END) {
      mat.opacity = 0.8;

      const positions = pointsRef.current.geometry.attributes.position!.array as Float32Array;
      const speeds = particleSpeeds.current;

      // Two paths: URL → JIT and JIT → Renderer
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const speed = speeds[i]!;
        const isFirstPath = i < PARTICLE_COUNT / 2;

        // Progress along path - purely deterministic based on currentTimeMs
        const t = ((currentTimeMs - P3_START) * speed * 0.0008 + i * 0.05) % 1;

        // Deterministic offsets using seeded random based on particle index and time
        // Use different seeds for different axes to avoid correlation
        const wobbleFreq = 0.002; // How fast the wobble changes
        const offsetX = (seededRandom(i * 1000 + currentTimeMs * wobbleFreq) - 0.5) * 0.2;
        const offsetZ = (seededRandom(i * 2000 + currentTimeMs * wobbleFreq) - 0.5) * 0.3;

        if (isFirstPath) {
          // URL (-4, 0.5) → JIT (0, 0.5)
          positions[i * 3] = lerp(-4, 0, t) + offsetX;
          positions[i * 3 + 1] = 0.5 + Math.sin(t * Math.PI * 2) * 0.3;
          positions[i * 3 + 2] = offsetZ;
        } else {
          // JIT (0, 0.5) → Renderer (4, 0.5)
          positions[i * 3] = lerp(0, 4, t) + offsetX;
          positions[i * 3 + 1] = 0.5 + Math.sin(t * Math.PI * 2) * 0.3;
          positions[i * 3 + 2] = offsetZ;
        }
      }

      pointsRef.current.geometry.attributes.position!.needsUpdate = true;
    } else {
      mat.opacity = lerp(mat.opacity, 0, 0.1);
    }
  });

  const positions = new Float32Array(PARTICLE_COUNT * 3);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={COL_CHUNK}
        size={0.08}
        transparent
        opacity={0}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ━━ Connection lines ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Connections({ currentTimeMs }: { currentTimeMs: number }) {
  const [line1Opacity, setLine1Opacity] = useState(0);
  const [line2Opacity, setLine2Opacity] = useState(0);

  useFrame(() => {
    // Lines appear with nodes
    const appear = prog(currentTimeMs, P2_START, P2_END);
    setLine1Opacity(appear * 0.3);
    setLine2Opacity(appear * 0.3);
  });

  return (
    <>
      {/* URL → JIT */}
      <Line
        points={[
          [-3.4, 0.5, 0],
          [-0.7, 0.5, 0],
        ]}
        color={0x666666}
        lineWidth={2}
        transparent
        opacity={line1Opacity}
      />
      {/* JIT → Renderer */}
      <Line
        points={[
          [0.7, 0.5, 0],
          [3.5, 0.5, 0],
        ]}
        color={0x666666}
        lineWidth={2}
        transparent
        opacity={line2Opacity}
      />
    </>
  );
}

/* ━━ Floor with grid ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Floor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color={0x2a2e42} roughness={0.75} metalness={0.1} />
      </mesh>
      <gridHelper
        args={[20, 20, 0x3a3f58, 0x3a3f58]}
        position={[0, -0.69, 0]}
        material-transparent
        material-opacity={0.25}
      />
    </>
  );
}

/* ━━ Lighting ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.9} color={0xd0d8f0} />
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
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.6} color={0xaaccff} />
      <pointLight position={[0, 2, -3]} intensity={0.9} color={COL_CHUNK} distance={15} />
    </>
  );
}

/* ━━ Main Scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Scene({ currentTimeMs }: { currentTimeMs: number }) {
  return (
    <>
      <CameraRig currentTimeMs={currentTimeMs} />
      <Lights />
      <Floor />
      <RemoteURL currentTimeMs={currentTimeMs} />
      <JITService currentTimeMs={currentTimeMs} />
      <Renderer currentTimeMs={currentTimeMs} />
      <Connections currentTimeMs={currentTimeMs} />
      <DataFlow currentTimeMs={currentTimeMs} />
    </>
  );
}

/* ━━ Canvas wrapper for Editframe integration ━━━━━━━━━━━━━━━━━━ */
export function JITStreamingCanvas({ 
  currentTimeMs
}: { 
  currentTimeMs: number;
}) {
  return (
    <Canvas
      shadows
      gl={{ 
        preserveDrawingBuffer: true,
        antialias: true,
        alpha: true,
      }}
      camera={{ position: [0, 3, 8], fov: 50 }}
      style={{ 
        background: "#1e2233",
        width: "100%",
        height: "100%",
      }}
      onCreated={({ gl }: { gl: THREE.WebGLRenderer }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.8;
      }}
    >
      <Scene currentTimeMs={currentTimeMs} />
    </Canvas>
  );
}
