import * as THREE from "three";

/* ━━ Easing helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}
function progress(timeMs: number, startMs: number, endMs: number) {
  return clamp01((timeMs - startMs) / (endMs - startMs));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ━━ Constants ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const BLUE = 0x1565c0;
const BLUE_LIGHT = 0x42a5f5;
const GRAY = 0x6b6b6b;
const BLOCK_W = 1.8;
const BLOCK_H = 0.6;
const BLOCK_D = 0.5;
const GAP = 0.12;
const TOTAL_W = BLOCK_W * 4 + GAP * 3;

const PARTICLE_COUNT = 600;

/* ━━ Phase timing (ms) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const P1_START = 0;
const P1_END = 1800;
const P2_START = 1800;
const P2_END = 3200;
const P3_START = 3200;
const P3_END = 5800;
const P4_START = 5800;
const P4_END = 7200;
const P5_START = 7200;
const P5_END = 9500;

/* ━━ Scene factory ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function createParallelFragmentsScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, 2, 0.1, 100);
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);

  /* ── Lighting ──────────────────────────────────────────────────── */
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x88aaff, 0.3);
  fill.position.set(-3, 4, -2);
  scene.add(fill);

  const rim = new THREE.PointLight(0x42a5f5, 0.6, 20);
  rim.position.set(0, 2, -4);
  scene.add(rim);

  /* ── Floor plane ───────────────────────────────────────────────── */
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.85,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.8;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ── Fragment blocks ───────────────────────────────────────────── */
  const blockGeo = new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D);
  const blockOpacities = [1.0, 0.85, 0.7, 0.55];
  const blocks: THREE.Mesh[] = [];
  const blockMats: THREE.MeshStandardMaterial[] = [];

  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: BLUE,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: blockOpacities[i]!,
      emissive: new THREE.Color(BLUE_LIGHT),
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(blockGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    blocks.push(mesh);
    blockMats.push(mat);
  }

  /* ── Edge glow lines on each block ─────────────────────────────── */
  const edgeMat = new THREE.LineBasicMaterial({
    color: BLUE_LIGHT,
    transparent: true,
    opacity: 0,
  });
  const edgeGeo = new THREE.EdgesGeometry(blockGeo);
  const edges: THREE.LineSegments[] = [];
  for (let i = 0; i < 4; i++) {
    const line = new THREE.LineSegments(edgeGeo, edgeMat.clone());
    blocks[i]!.add(line);
    edges.push(line);
  }

  /* ── Particles ─────────────────────────────────────────────────── */
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  const particleSpeeds = new Float32Array(PARTICLE_COUNT);
  const particleLanes = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particlePositions[i * 3] = 0;
    particlePositions[i * 3 + 1] = 0;
    particlePositions[i * 3 + 2] = 0;
    particleSpeeds[i] = 0.5 + Math.random() * 1.5;
    particleLanes[i] = Math.floor(Math.random() * 4);
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: BLUE_LIGHT,
    size: 0.04,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ── Comparison bars ───────────────────────────────────────────── */
  const seqBarGeo = new THREE.BoxGeometry(TOTAL_W, 0.18, 0.25);
  const seqBarMat = new THREE.MeshStandardMaterial({
    color: GRAY,
    roughness: 0.7,
    transparent: true,
    opacity: 0,
  });
  const seqBar = new THREE.Mesh(seqBarGeo, seqBarMat);
  seqBar.position.set(0, -0.8, 1.5);
  seqBar.castShadow = true;
  scene.add(seqBar);

  const parBarGeo = new THREE.BoxGeometry(TOTAL_W / 4, 0.22, 0.3);
  const parBarMat = new THREE.MeshStandardMaterial({
    color: BLUE,
    roughness: 0.3,
    metalness: 0.4,
    emissive: new THREE.Color(BLUE_LIGHT),
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0,
  });
  const parBar = new THREE.Mesh(parBarGeo, parBarMat);
  parBar.position.set(
    -TOTAL_W / 2 + TOTAL_W / 8,
    -0.8,
    2.5,
  );
  parBar.castShadow = true;
  scene.add(parBar);

  /* ── Helper: block rest positions ──────────────────────────────── */
  function joinedX(i: number) {
    return -TOTAL_W / 2 + BLOCK_W / 2 + i * (BLOCK_W + GAP);
  }
  /* ━━ UPDATE — pure function of composition time ━━━━━━━━━━━━━━━━━ */
  function update(timeMs: number, _durationMs: number) {
    /* ── Phase 1: Film strip assembles (blocks fade in joined) ──── */
    const p1 = easeOutCubic(progress(timeMs, P1_START, P1_END));
    for (let i = 0; i < 4; i++) {
      const bx = joinedX(i);
      blocks[i]!.position.set(bx, lerp(2, 0, p1), 0);
      blocks[i]!.rotation.set(0, 0, 0);
      blocks[i]!.scale.setScalar(1);
      blockMats[i]!.opacity = lerp(0, blockOpacities[i]!, p1);
      (edges[i]!.material as THREE.LineBasicMaterial).opacity = 0;
    }

    /* ── Phase 2: Fracture — blocks separate horizontally ──────── */
    if (timeMs >= P2_START) {
      const p2 = easeInOutCubic(progress(timeMs, P2_START, P2_END));
      const spread = 0.5;
      for (let i = 0; i < 4; i++) {
        const offset = (i - 1.5) * spread * p2;
        blocks[i]!.position.x = joinedX(i) + offset;
        blocks[i]!.position.y = lerp(0, -0.15, p2);
        const edgeOpa = p2 * 0.6;
        (edges[i]!.material as THREE.LineBasicMaterial).opacity = edgeOpa;
        blockMats[i]!.emissiveIntensity = p2 * 0.3;
      }
    }

    /* ── Phase 3: Parallel processing — blocks in lanes, particles */
    if (timeMs >= P3_START) {
      const p3enter = easeOutCubic(progress(timeMs, P3_START, P3_START + 800));
      const p3active = progress(timeMs, P3_START + 800, P3_END);

      for (let i = 0; i < 4; i++) {
        const spreadX = joinedX(i) + (i - 1.5) * 0.5;
        const laneX = (i - 1.5) * 2.2;
        blocks[i]!.position.x = lerp(spreadX, laneX, p3enter);
        blocks[i]!.position.y = lerp(-0.15, 0, p3enter);
        blocks[i]!.position.z = lerp(0, 0.5, p3enter);

        const pulse = Math.sin(p3active * Math.PI * 6 + i * 1.5) * 0.04;
        blocks[i]!.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
        blocks[i]!.rotation.y = Math.sin(p3active * Math.PI * 4 + i) * 0.08;

        blockMats[i]!.emissiveIntensity = 0.3 + Math.sin(p3active * Math.PI * 8 + i * 2) * 0.15;
        (edges[i]!.material as THREE.LineBasicMaterial).opacity =
          0.6 + Math.sin(p3active * Math.PI * 6 + i) * 0.3;
      }

      particleMat.opacity = lerp(0, 0.7, p3enter);
      const positions = particleGeo.attributes.position!.array as Float32Array;
      for (let p = 0; p < PARTICLE_COUNT; p++) {
        const lane = particleLanes[p]!;
        const speed = particleSpeeds[p]!;
        const lx = (lane - 1.5) * 2.2;
        const t = ((timeMs - P3_START) * speed * 0.001 + p * 0.1) % 4 - 2;
        positions[p * 3] = lx + (Math.random() - 0.5) * 0.3;
        positions[p * 3 + 1] = Math.sin(t * 2) * 0.3 + (Math.random() - 0.5) * 0.15;
        positions[p * 3 + 2] = t * 0.8 + 0.5;
      }
      particleGeo.attributes.position!.needsUpdate = true;
    } else {
      particleMat.opacity = 0;
    }

    /* ── Phase 4: Reassembly — blocks converge, flash ──────────── */
    if (timeMs >= P4_START) {
      const p4 = easeInOutCubic(progress(timeMs, P4_START, P4_END));
      for (let i = 0; i < 4; i++) {
        const laneX = (i - 1.5) * 2.2;
        blocks[i]!.position.x = lerp(laneX, joinedX(i), p4);
        blocks[i]!.position.y = lerp(0, 0.1, p4);
        blocks[i]!.position.z = lerp(0.5, 0, p4);
        blocks[i]!.rotation.y = 0;
        blocks[i]!.scale.setScalar(lerp(1, 1.05, p4));

        const flash = Math.max(0, 1 - progress(timeMs, P4_END - 400, P4_END) * 2);
        blockMats[i]!.emissiveIntensity = lerp(0.3, 0.8, p4) * (0.5 + flash * 0.5);
        (edges[i]!.material as THREE.LineBasicMaterial).opacity = lerp(0.6, 0.9, p4) * (0.5 + flash * 0.5);
      }
      particleMat.opacity = lerp(0.7, 0, progress(timeMs, P4_START, P4_START + 600));
    }

    /* ── Phase 5: Punchline — camera shifts, comparison bars ───── */
    if (timeMs >= P5_START) {
      const p5 = easeOutCubic(progress(timeMs, P5_START, P5_END));
      for (let i = 0; i < 4; i++) {
        blocks[i]!.position.y = lerp(0.1, 0.6, p5);
      }
      seqBarMat.opacity = lerp(0, 0.4, easeOutCubic(progress(timeMs, P5_START, P5_START + 600)));
      parBarMat.opacity = lerp(0, 1, easeOutCubic(progress(timeMs, P5_START + 400, P5_START + 1000)));
      parBarMat.emissiveIntensity = 0.2 + Math.sin(progress(timeMs, P5_START + 1000, P5_END) * Math.PI * 4) * 0.1;

      camera.position.y = lerp(5, 5.5, p5);
      camera.position.z = lerp(10, 11, p5);
      camera.lookAt(0, lerp(0, 0.2, p5), lerp(0, 0.8, p5));
    } else {
      seqBarMat.opacity = 0;
      parBarMat.opacity = 0;
      camera.position.set(0, 5, 10);
      camera.lookAt(0, 0, 0);
    }

    /* ── Ambient rim light pulse ─────────────────────────────────── */
    rim.intensity = 0.6 + Math.sin(timeMs * 0.002) * 0.15;

    renderer.render(scene, camera);
  }

  /* ━━ RESIZE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  function resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  /* ━━ DISPOSE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  function dispose() {
    renderer.dispose();
    blockGeo.dispose();
    edgeGeo.dispose();
    floorGeo.dispose();
    seqBarGeo.dispose();
    parBarGeo.dispose();
    floorMat.dispose();
    edgeMat.dispose();
    particleGeo.dispose();
    particleMat.dispose();
    seqBarMat.dispose();
    parBarMat.dispose();
    blockMats.forEach((m) => m.dispose());
    edges.forEach((e) => (e.material as THREE.Material).dispose());
  }

  return { update, resize, dispose };
}
