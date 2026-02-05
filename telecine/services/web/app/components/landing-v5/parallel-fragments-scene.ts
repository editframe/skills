import * as THREE from "three";

/* ━━ Easing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }
function prog(ms: number, s: number, e: number) { return clamp01((ms - s) / (e - s)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* ━━ Colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_VIDEO = 0x1565c0;
const COL_AUDIO = 0x00897b;
const COL_TEXT = 0xffb300;
const COL_BLUE = 0x1565c0;
const COL_BLUE_LT = 0x42a5f5;
const COL_GRAY = 0x555555;
const COL_NODE = 0x222222;
const COL_DONE = 0x2e7d32;

/* ━━ Track & segment sizing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const NUM_SEGS = 4;
const SEG_W = 1.1;
const SEG_GAP = 0.06;
const TRACK_D = 0.3;
const TRACKS = [
  { h: 0.16, color: COL_VIDEO, yOff: 0.12 },
  { h: 0.09, color: COL_AUDIO, yOff: 0 },
  { h: 0.05, color: COL_TEXT,  yOff: -0.08 },
] as const;
const TOTAL_W = SEG_W * NUM_SEGS + SEG_GAP * (NUM_SEGS - 1);

const NODE_SIZE = 0.5;
const PROGRESS_H = 0.06;
const PARTICLE_COUNT = 400;

/* ━━ Phase timing (ms) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const T_ASSEMBLE_END = 1600;
const T_CUT_START = 1600;
const T_CUT_END = 2800;
const T_SPLIT_START = 2800;
const T_SPLIT_END = 4000;
const T_RACE_START = 4000;
const T_PAR_DONE = 5800;
const T_SEQ_SEG_DUR = 1400;
const T_RESULT_START = 8000;
const T_END = 10000;

/* ━━ Scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function createParallelFragmentsScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 2, 0.1, 100);
  camera.position.set(0, 4.5, 9);
  camera.lookAt(0, 0, 0.5);

  /* ── Lighting ──────────────────────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(3, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  const sc = keyLight.shadow.camera;
  sc.left = -8; sc.right = 8; sc.top = 6; sc.bottom = -6; sc.near = 0.5; sc.far = 25;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.25);
  fillLight.position.set(-3, 4, -2);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(COL_BLUE_LT, 0.5, 20);
  rimLight.position.set(0, 2, -3);
  scene.add(rimLight);

  /* ── Floor ─────────────────────────────────────────────────────── */
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.9, metalness: 0.05 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ── Build timeline segment groups ─────────────────────────────── */
  const segGroups: THREE.Group[] = [];
  const allTrackMeshes: THREE.Mesh[][] = [];

  for (let s = 0; s < NUM_SEGS; s++) {
    const group = new THREE.Group();
    const trackMeshes: THREE.Mesh[] = [];
    for (const tr of TRACKS) {
      const geo = new THREE.BoxGeometry(SEG_W, tr.h, TRACK_D);
      const mat = new THREE.MeshStandardMaterial({
        color: tr.color,
        roughness: 0.35,
        metalness: 0.3,
        transparent: true,
        opacity: 0,
        emissive: new THREE.Color(tr.color),
        emissiveIntensity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = tr.yOff;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      trackMeshes.push(mesh);
    }
    scene.add(group);
    segGroups.push(group);
    allTrackMeshes.push(trackMeshes);
  }

  function segJoinedX(i: number) {
    return -TOTAL_W / 2 + SEG_W / 2 + i * (SEG_W + SEG_GAP);
  }

  /* ── Render nodes ──────────────────────────────────────────────── */
  const nodeGeo = new THREE.BoxGeometry(NODE_SIZE, NODE_SIZE, NODE_SIZE);
  const edgeGeo = new THREE.EdgesGeometry(nodeGeo);

  function makeNode(x: number, z: number) {
    const mat = new THREE.MeshStandardMaterial({
      color: COL_NODE, roughness: 0.5, metalness: 0.6,
      transparent: true, opacity: 0,
      emissive: new THREE.Color(COL_BLUE_LT), emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(nodeGeo, mat);
    mesh.position.set(x, -0.6, z);
    mesh.castShadow = true;
    scene.add(mesh);

    const edgeMat = new THREE.LineBasicMaterial({ color: COL_BLUE_LT, transparent: true, opacity: 0 });
    const edge = new THREE.LineSegments(edgeGeo, edgeMat);
    mesh.add(edge);
    return { mesh, mat, edgeMat };
  }

  const SEQ_X = -3.2;
  const PAR_X = 3.2;
  const NODE_Z = 1.8;

  const seqNode = makeNode(SEQ_X, NODE_Z);
  const parNodes = Array.from({ length: NUM_SEGS }, (_, i) => {
    const laneX = PAR_X + (i - 1.5) * 1.3;
    return makeNode(laneX, NODE_Z);
  });

  /* ── Progress bars ─────────────────────────────────────────────── */
  function makeProgressBar(x: number, z: number, w: number) {
    const bgMat = new THREE.MeshStandardMaterial({
      color: COL_GRAY, roughness: 0.8, transparent: true, opacity: 0,
    });
    const bg = new THREE.Mesh(new THREE.BoxGeometry(w, PROGRESS_H, 0.15), bgMat);
    bg.position.set(x, -0.58, z);
    scene.add(bg);

    const fillMat = new THREE.MeshStandardMaterial({
      color: COL_BLUE, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0,
      emissive: new THREE.Color(COL_BLUE_LT), emissiveIntensity: 0.15,
    });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(w, PROGRESS_H + 0.02, 0.16), fillMat);
    fill.position.set(x, -0.58, z);
    fill.scale.x = 0;
    scene.add(fill);

    return { bg, bgMat, fill, fillMat, width: w };
  }

  const seqBar = makeProgressBar(SEQ_X, NODE_Z + 1.0, TOTAL_W * 0.8);
  const parBars = parNodes.map((n) =>
    makeProgressBar(n.mesh.position.x, NODE_Z + 1.0, SEG_W * 0.9),
  );

  /* ── "Complete" output block ───────────────────────────────────── */
  const completeMat = new THREE.MeshStandardMaterial({
    color: COL_DONE, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0,
    emissive: new THREE.Color(COL_DONE), emissiveIntensity: 0,
  });
  const completeBlock = new THREE.Mesh(
    new THREE.BoxGeometry(TOTAL_W * 0.8, 0.2, 0.3),
    completeMat,
  );
  completeBlock.position.set(PAR_X, -0.55, NODE_Z + 2.2);
  completeBlock.castShadow = true;
  scene.add(completeBlock);

  /* ── Particles ─────────────────────────────────────────────────── */
  const particleGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(PARTICLE_COUNT * 3);
  const pSpeeds = new Float32Array(PARTICLE_COUNT);
  const pLanes = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pSpeeds[i] = 0.4 + Math.random() * 1.2;
    pLanes[i] = Math.floor(Math.random() * NUM_SEGS);
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: COL_BLUE_LT, size: 0.035, transparent: true, opacity: 0,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ── Labels: "SEQUENTIAL" / "PARALLEL" as flat geometry ────────── */
  const labelSeqGeo = new THREE.PlaneGeometry(2.0, 0.3);
  const labelSeqMat = new THREE.MeshBasicMaterial({ color: COL_GRAY, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const labelSeq = new THREE.Mesh(labelSeqGeo, labelSeqMat);
  labelSeq.position.set(SEQ_X, -0.55, NODE_Z - 0.8);
  labelSeq.rotation.x = -Math.PI / 2;
  scene.add(labelSeq);

  const labelParGeo = new THREE.PlaneGeometry(2.0, 0.3);
  const labelParMat = new THREE.MeshBasicMaterial({ color: COL_BLUE, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const labelPar = new THREE.Mesh(labelParGeo, labelParMat);
  labelPar.position.set(PAR_X, -0.55, NODE_Z - 0.8);
  labelPar.rotation.x = -Math.PI / 2;
  scene.add(labelPar);

  /* ━━ UPDATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  function update(timeMs: number, _durationMs: number) {
    /* ── Phase 1: Multi-track timeline assembles ─────────────────── */
    const p1 = easeOut(prog(timeMs, 0, T_ASSEMBLE_END));
    for (let s = 0; s < NUM_SEGS; s++) {
      const bx = segJoinedX(s);
      segGroups[s]!.position.set(bx, lerp(1.5, 0.5, p1), 0);
      segGroups[s]!.rotation.set(0, 0, 0);
      segGroups[s]!.scale.setScalar(1);
      for (const mesh of allTrackMeshes[s]!) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = lerp(0, 0.95, p1);
        mat.emissiveIntensity = 0;
      }
    }

    /* ── Phase 2: Cut lines — segments separate ──────────────────── */
    if (timeMs >= T_CUT_START) {
      const p2 = easeInOut(prog(timeMs, T_CUT_START, T_CUT_END));
      for (let s = 0; s < NUM_SEGS; s++) {
        const spread = (s - 1.5) * SEG_GAP * 4 * p2;
        segGroups[s]!.position.x = segJoinedX(s) + spread;
        for (const mesh of allTrackMeshes[s]!) {
          (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = p2 * 0.15;
        }
      }
    }

    /* ── Phase 3: Split — segments fly to sequential/parallel sides  */
    if (timeMs >= T_SPLIT_START) {
      const p3 = easeInOut(prog(timeMs, T_SPLIT_START, T_SPLIT_END));
      for (let s = 0; s < NUM_SEGS; s++) {
        const fromX = segJoinedX(s) + (s - 1.5) * SEG_GAP * 4;
        const parLaneX = PAR_X + (s - 1.5) * 1.3;
        const toX = parLaneX;
        const toY = lerp(0.5, 0.15, p3);
        const toZ = lerp(0, NODE_Z - 0.5, p3);
        segGroups[s]!.position.x = lerp(fromX, toX, p3);
        segGroups[s]!.position.y = toY;
        segGroups[s]!.position.z = toZ;
        segGroups[s]!.scale.setScalar(lerp(1, 0.65, p3));
      }

      // Fade in nodes and labels
      const nodeFade = easeOut(prog(timeMs, T_SPLIT_START + 400, T_SPLIT_END));
      seqNode.mat.opacity = nodeFade * 0.7;
      seqNode.edgeMat.opacity = nodeFade * 0.4;
      for (const n of parNodes) {
        n.mat.opacity = nodeFade * 0.7;
        n.edgeMat.opacity = nodeFade * 0.4;
      }
      labelSeqMat.opacity = nodeFade * 0.4;
      labelParMat.opacity = nodeFade * 0.5;

      // Fade in progress bar backgrounds
      seqBar.bgMat.opacity = nodeFade * 0.2;
      for (const b of parBars) b.bgMat.opacity = nodeFade * 0.2;
    } else {
      seqNode.mat.opacity = 0;
      seqNode.edgeMat.opacity = 0;
      for (const n of parNodes) { n.mat.opacity = 0; n.edgeMat.opacity = 0; }
      labelSeqMat.opacity = 0;
      labelParMat.opacity = 0;
      seqBar.bgMat.opacity = 0;
      seqBar.fillMat.opacity = 0;
      seqBar.fill.scale.x = 0;
      for (const b of parBars) { b.bgMat.opacity = 0; b.fillMat.opacity = 0; b.fill.scale.x = 0; }
    }

    /* ── Phase 4: RACE — parallel vs sequential processing ───────── */
    if (timeMs >= T_RACE_START) {
      // Parallel: all segments arrive at nodes simultaneously, process together
      const parArrive = easeOut(prog(timeMs, T_RACE_START, T_RACE_START + 600));
      const parProcess = prog(timeMs, T_RACE_START + 600, T_PAR_DONE);

      for (let s = 0; s < NUM_SEGS; s++) {
        const laneX = PAR_X + (s - 1.5) * 1.3;
        segGroups[s]!.position.x = laneX;
        segGroups[s]!.position.y = lerp(0.15, -0.1, parArrive);
        segGroups[s]!.position.z = lerp(NODE_Z - 0.5, NODE_Z, parArrive);

        // Node glow during processing
        const pulse = Math.sin(parProcess * Math.PI * 6 + s * 1.5) * 0.1;
        parNodes[s]!.mat.emissiveIntensity = parProcess > 0 ? 0.2 + pulse : 0;
        parNodes[s]!.edgeMat.opacity = 0.4 + parProcess * 0.4;
        parNodes[s]!.mesh.rotation.y = Math.sin(parProcess * Math.PI * 4 + s) * 0.06;
      }

      // Parallel progress bars
      for (const b of parBars) {
        b.fillMat.opacity = parArrive * 0.9;
        b.fill.scale.x = easeOut(parProcess);
        b.fill.position.x = b.bg.position.x - b.width / 2 * (1 - easeOut(parProcess));
      }

      // Particles around parallel nodes during processing
      if (parProcess > 0 && parProcess < 1) {
        particleMat.opacity = 0.6;
        const positions = particleGeo.attributes.position!.array as Float32Array;
        for (let p = 0; p < PARTICLE_COUNT; p++) {
          const lane = pLanes[p]!;
          const speed = pSpeeds[p]!;
          const lx = PAR_X + (lane - 1.5) * 1.3;
          const t = ((timeMs - T_RACE_START) * speed * 0.001 + p * 0.1) % 3 - 1.5;
          positions[p * 3] = lx + (Math.random() - 0.5) * 0.35;
          positions[p * 3 + 1] = -0.6 + Math.sin(t * 2) * 0.25 + (Math.random() - 0.5) * 0.1;
          positions[p * 3 + 2] = NODE_Z + t * 0.4;
        }
        particleGeo.attributes.position!.needsUpdate = true;
      } else {
        particleMat.opacity = lerp(0.6, 0, prog(timeMs, T_PAR_DONE, T_PAR_DONE + 500));
      }

      // Sequential: process one segment at a time (indicated by progress bar only)
      const seqElapsed = timeMs - T_RACE_START;
      const seqTotalTime = T_SEQ_SEG_DUR * NUM_SEGS;
      const seqProgress = clamp01(seqElapsed / seqTotalTime);
      seqBar.fillMat.opacity = 0.8;
      seqBar.fill.scale.x = easeOut(seqProgress);
      seqBar.fill.position.x = seqBar.bg.position.x - seqBar.width / 2 * (1 - easeOut(seqProgress));

      // Sequential node pulses slowly
      const seqPulse = Math.sin(seqElapsed * 0.003) * 0.08;
      seqNode.mat.emissiveIntensity = 0.1 + seqPulse;
      seqNode.mesh.rotation.y = Math.sin(seqElapsed * 0.002) * 0.04;

      // Parallel "complete" block appears when done
      if (timeMs >= T_PAR_DONE) {
        const doneFade = easeOut(prog(timeMs, T_PAR_DONE, T_PAR_DONE + 600));
        completeMat.opacity = doneFade * 0.9;
        completeMat.emissiveIntensity = doneFade * 0.4;
        completeBlock.scale.y = lerp(0.3, 1, doneFade);
      } else {
        completeMat.opacity = 0;
      }
    }

    /* ── Phase 5: Result — parallel done, sequential still going ── */
    if (timeMs >= T_RESULT_START) {
      const p5 = easeOut(prog(timeMs, T_RESULT_START, T_END));
      // Camera pulls back slightly
      camera.position.y = lerp(4.5, 5, p5);
      camera.position.z = lerp(9, 10, p5);
      camera.lookAt(0, lerp(0, 0.1, p5), lerp(0.5, 1.2, p5));

      // Complete block pulses
      completeMat.emissiveIntensity = 0.4 + Math.sin(p5 * Math.PI * 3) * 0.15;
    } else {
      camera.position.set(0, 4.5, 9);
      camera.lookAt(0, 0, 0.5);
    }

    rimLight.intensity = 0.5 + Math.sin(timeMs * 0.0015) * 0.1;
    renderer.render(scene, camera);
  }

  function resize(w: number, h: number) {
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function dispose() {
    renderer.dispose();
    scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m: THREE.Material) => m.dispose());
        else obj.material.dispose();
      }
      if (obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    particleGeo.dispose();
    particleMat.dispose();
  }

  return { update, resize, dispose };
}
