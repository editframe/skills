import * as THREE from "three";

/* ━━ Easing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }
function prog(ms: number, s: number, e: number) { return clamp01((ms - s) / (e - s)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpV3(out: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, t: number) {
  out.set(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
}

/* ━━ Colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_VIDEO = 0x1565c0;
const COL_AUDIO = 0x00897b;
const COL_TEXT = 0xffb300;
const COL_BLUE_LT = 0x42a5f5;
const COL_NODE = 0x222222;
const COL_DONE = 0x2e7d32;

/* ━━ Sizing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const NUM_SEGS = 4;
const SEG_W = 0.8;
const SEG_GAP = 0.05;
const TRACK_D = 0.25;
const TRACK_H = [0.13, 0.08, 0.045] as const;
const TRACK_COLOR = [COL_VIDEO, COL_AUDIO, COL_TEXT] as const;
const TRACK_Y = [0.12, 0.0, -0.07] as const;
const TOTAL_W = SEG_W * NUM_SEGS + SEG_GAP * (NUM_SEGS - 1);

const CLIP_LAYOUTS = [
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.85, xPct: 0.05 }, { wPct: 0.35, xPct: 0.32 }],
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.65, xPct: 0.20 }, { wPct: 0.50, xPct: 0.05 }],
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.90, xPct: 0 },    { wPct: 0.30, xPct: 0.55 }],
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.55, xPct: 0.25 }, { wPct: 0.45, xPct: 0.28 }],
] as const;

const NODE_SIZE = 0.4;
const PARTICLE_COUNT = 400;
const LANE_SPREAD = 0.85;

/* ━━ Phase timing (ms) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const P1_END = 1500;       // close-up: timeline assembled
const P2_START = 1500;     // duplicate + split
const P2_END = 3200;
const P3_START = 2800;     // camera pull-back (overlaps P2 end)
const P3_END = 4500;       // wide shot, workers visible
const P4_START = 4500;     // fly to workers + processing
const P4_PAR_DONE = 6500;  // parallel finishes
const P5_START = 6800;     // orbit toward parallel winner
const P5_END = 10000;

/* ━━ Camera key-poses ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const CAM_CLOSE_POS = new THREE.Vector3(0, 1.2, 3.8);
const CAM_CLOSE_TAR = new THREE.Vector3(0, 0.35, 0);
const CAM_WIDE_POS = new THREE.Vector3(0, 3.8, 8.5);
const CAM_WIDE_TAR = new THREE.Vector3(0, -0.1, 1.0);
const CAM_WIN_POS = new THREE.Vector3(1.8, 3.2, 7);
const CAM_WIN_TAR = new THREE.Vector3(1.5, 0, 1.8);

/* ━━ Layout positions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const SEQ_X = -2.2;
const PAR_X = 2.2;
const NODE_Z = 2.0;

/* ━━ Scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function createParallelFragmentsScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 100);
  const camPos = new THREE.Vector3();
  const camTar = new THREE.Vector3();

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
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 16),
    new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.9, metalness: 0.05 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ── Helper: build a set of timeline track meshes ──────────────── */
  function buildTrackMeshes(parent: THREE.Group, segIndex: number, xOffset: number) {
    const meshes: THREE.Mesh[] = [];
    // Container backdrop
    const bg = new THREE.Mesh(
      new THREE.BoxGeometry(SEG_W, 0.32, TRACK_D + 0.02),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, transparent: true, opacity: 0 }),
    );
    bg.position.set(xOffset, 0.02, 0);
    bg.receiveShadow = true;
    parent.add(bg);
    meshes.push(bg);

    const layout = CLIP_LAYOUTS[segIndex]!;
    for (let t = 0; t < 3; t++) {
      const clip = layout[t]!;
      const clipW = SEG_W * clip.wPct;
      const clipX = xOffset - SEG_W / 2 + SEG_W * clip.xPct + clipW / 2;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(clipW, TRACK_H[t]!, TRACK_D),
        new THREE.MeshStandardMaterial({
          color: TRACK_COLOR[t]!, roughness: 0.35, metalness: 0.3,
          transparent: true, opacity: 0,
          emissive: new THREE.Color(TRACK_COLOR[t]!), emissiveIntensity: 0,
        }),
      );
      mesh.position.set(clipX, TRACK_Y[t]!, 0);
      mesh.castShadow = true;
      parent.add(mesh);
      meshes.push(mesh);
    }
    return meshes;
  }

  function segJoinedX(i: number) {
    return -TOTAL_W / 2 + SEG_W / 2 + i * (SEG_W + SEG_GAP);
  }

  /* ── Parallel segments (will separate) ─────────────────────────── */
  const parSegGroups: THREE.Group[] = [];
  const parTrackMeshes: THREE.Mesh[][] = [];
  for (let s = 0; s < NUM_SEGS; s++) {
    const group = new THREE.Group();
    const meshes = buildTrackMeshes(group, s, 0);
    scene.add(group);
    parSegGroups.push(group);
    parTrackMeshes.push(meshes);
  }

  /* ── Sequential timeline copy (stays whole) ────────────────────── */
  const seqGroup = new THREE.Group();
  const seqTrackMeshes: THREE.Mesh[][] = [];
  for (let s = 0; s < NUM_SEGS; s++) {
    const meshes = buildTrackMeshes(seqGroup, s, segJoinedX(s));
    seqTrackMeshes.push(meshes);
  }
  seqGroup.visible = false;
  scene.add(seqGroup);

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
    mesh.add(new THREE.LineSegments(edgeGeo, edgeMat));
    return { mesh, mat, edgeMat };
  }

  const seqNode = makeNode(SEQ_X, NODE_Z);
  const parNodes = Array.from({ length: NUM_SEGS }, (_, i) =>
    makeNode(PAR_X + (i - 1.5) * LANE_SPREAD, NODE_Z),
  );

  /* ── Particles ─────────────────────────────────────────────────── */
  const particleGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PARTICLE_COUNT * 3);
  const pSpd = new Float32Array(PARTICLE_COUNT);
  const pLane = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pSpd[i] = 0.4 + Math.random() * 1.2;
    pLane[i] = Math.floor(Math.random() * NUM_SEGS);
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const particleMat = new THREE.PointsMaterial({
    color: COL_BLUE_LT, size: 0.035, transparent: true, opacity: 0,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  scene.add(new THREE.Points(particleGeo, particleMat));

  /* ── Complete block ────────────────────────────────────────────── */
  const completeMat = new THREE.MeshStandardMaterial({
    color: COL_DONE, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0,
    emissive: new THREE.Color(COL_DONE), emissiveIntensity: 0,
  });
  const completeBlock = new THREE.Mesh(new THREE.BoxGeometry(TOTAL_W * 0.7, 0.2, 0.3), completeMat);
  completeBlock.position.set(PAR_X, -0.55, NODE_Z + 1.2);
  completeBlock.castShadow = true;
  scene.add(completeBlock);

  /* ── Helper: set opacity on all meshes in a track mesh array ───── */
  function setTrackOpacity(meshes: THREE.Mesh[], bgOpa: number, clipOpa: number) {
    for (let m = 0; m < meshes.length; m++) {
      (meshes[m]!.material as THREE.MeshStandardMaterial).opacity = m === 0 ? bgOpa : clipOpa;
    }
  }
  function setTrackEmissive(meshes: THREE.Mesh[], intensity: number) {
    for (let m = 1; m < meshes.length; m++) {
      (meshes[m]!.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
    }
  }

  /* ━━ UPDATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  function update(timeMs: number, _durationMs: number) {

    // ── CAMERA ────────────────────────────────────────────────────
    const camPullBack = easeInOut(prog(timeMs, P3_START, P3_END));
    const camOrbit = easeOut(prog(timeMs, P5_START, P5_END));

    // Blend: close → wide → orbit toward parallel winner
    lerpV3(camPos, CAM_CLOSE_POS, CAM_WIDE_POS, camPullBack);
    lerpV3(camTar, CAM_CLOSE_TAR, CAM_WIDE_TAR, camPullBack);
    if (camOrbit > 0) {
      lerpV3(camPos, camPos, CAM_WIN_POS, camOrbit);
      lerpV3(camTar, camTar, CAM_WIN_TAR, camOrbit);
    }
    camera.position.copy(camPos);
    camera.lookAt(camTar);

    // ── PHASE 1: Close-up, timeline assembles ─────────────────────
    const p1 = easeOut(prog(timeMs, 0, P1_END));
    for (let s = 0; s < NUM_SEGS; s++) {
      parSegGroups[s]!.position.set(segJoinedX(s), lerp(1.2, 0.4, p1), 0);
      parSegGroups[s]!.rotation.set(0, 0, 0);
      parSegGroups[s]!.scale.setScalar(1);
      setTrackOpacity(parTrackMeshes[s]!, lerp(0, 0.5, p1), lerp(0, 0.95, p1));
      setTrackEmissive(parTrackMeshes[s]!, 0);
    }
    seqGroup.visible = false;
    seqGroup.position.set(0, 0.4, 0);
    seqGroup.scale.setScalar(1);
    for (const meshes of seqTrackMeshes) setTrackOpacity(meshes, 0, 0);

    // Hide everything else initially
    seqNode.mat.opacity = 0; seqNode.edgeMat.opacity = 0;
    for (const n of parNodes) { n.mat.opacity = 0; n.edgeMat.opacity = 0; }
    completeMat.opacity = 0;
    particleMat.opacity = 0;

    // ── PHASE 2: Duplicate + split ────────────────────────────────
    if (timeMs >= P2_START) {
      const p2 = easeInOut(prog(timeMs, P2_START, P2_END));

      // Sequential copy appears and slides left
      seqGroup.visible = true;
      seqGroup.position.x = lerp(0, SEQ_X, p2);
      seqGroup.position.y = 0.4;
      seqGroup.position.z = lerp(0, 0.5, p2);
      for (const meshes of seqTrackMeshes) {
        setTrackOpacity(meshes, p2 * 0.5, p2 * 0.7);
      }

      // Parallel segments separate and slide right
      for (let s = 0; s < NUM_SEGS; s++) {
        const joinX = segJoinedX(s);
        const parLaneX = PAR_X + (s - 1.5) * LANE_SPREAD;
        const spread = (s - 1.5) * SEG_GAP * 6 * p2;
        parSegGroups[s]!.position.x = lerp(joinX + spread, parLaneX, p2 * p2);
        parSegGroups[s]!.position.z = lerp(0, 0.5, p2);
        setTrackEmissive(parTrackMeshes[s]!, p2 * 0.15);
      }
    }

    // ── PHASE 3: Workers reveal (camera pull-back handles itself) ─
    if (timeMs >= P3_START) {
      const nodeFade = easeOut(prog(timeMs, P3_START + 500, P3_END));
      seqNode.mat.opacity = nodeFade * 0.7;
      seqNode.edgeMat.opacity = nodeFade * 0.4;
      for (const n of parNodes) {
        n.mat.opacity = nodeFade * 0.7;
        n.edgeMat.opacity = nodeFade * 0.4;
      }
    }

    // ── PHASE 4: Fly to workers + processing ──────────────────────
    if (timeMs >= P4_START) {
      const flyIn = easeOut(prog(timeMs, P4_START, P4_START + 800));
      const processing = prog(timeMs, P4_START + 800, P4_PAR_DONE);

      // Sequential timeline flies to its node
      seqGroup.position.y = lerp(0.4, 0, flyIn);
      seqGroup.position.z = lerp(0.5, NODE_Z - 0.3, flyIn);
      seqGroup.scale.setScalar(lerp(1, 0.55, flyIn));
      // Dim sequential to show it's slow
      for (const meshes of seqTrackMeshes) {
        setTrackOpacity(meshes, 0.3, lerp(0.7, 0.45, processing));
      }
      const seqPulse = Math.sin(processing * Math.PI * 3) * 0.05;
      seqNode.mat.emissiveIntensity = 0.08 + seqPulse;
      seqNode.mesh.rotation.y = Math.sin(processing * Math.PI * 2) * 0.03;

      // Parallel segments fly to their worker nodes
      for (let s = 0; s < NUM_SEGS; s++) {
        const laneX = PAR_X + (s - 1.5) * LANE_SPREAD;
        parSegGroups[s]!.position.x = laneX;
        parSegGroups[s]!.position.y = lerp(0.4, -0.1, flyIn);
        parSegGroups[s]!.position.z = lerp(0.5, NODE_Z, flyIn);
        parSegGroups[s]!.scale.setScalar(lerp(1, 0.65, flyIn));

        // Node glow + rotation during processing
        const pulse = Math.sin(processing * Math.PI * 6 + s * 1.5) * 0.1;
        parNodes[s]!.mat.emissiveIntensity = processing > 0 ? 0.25 + pulse : 0;
        parNodes[s]!.edgeMat.opacity = 0.4 + processing * 0.4;
        parNodes[s]!.mesh.rotation.y = Math.sin(processing * Math.PI * 4 + s) * 0.06;
      }

      // Particles around parallel workers
      if (processing > 0 && processing < 1) {
        particleMat.opacity = 0.6;
        const positions = particleGeo.attributes.position!.array as Float32Array;
        for (let p = 0; p < PARTICLE_COUNT; p++) {
          const lane = pLane[p]!;
          const speed = pSpd[p]!;
          const lx = PAR_X + (lane - 1.5) * LANE_SPREAD;
          const t = ((timeMs - P4_START) * speed * 0.001 + p * 0.1) % 3 - 1.5;
          positions[p * 3] = lx + (Math.random() - 0.5) * 0.3;
          positions[p * 3 + 1] = -0.6 + Math.sin(t * 2) * 0.2 + (Math.random() - 0.5) * 0.1;
          positions[p * 3 + 2] = NODE_Z + t * 0.4;
        }
        particleGeo.attributes.position!.needsUpdate = true;
      } else if (timeMs >= P4_PAR_DONE) {
        particleMat.opacity = lerp(0.6, 0, prog(timeMs, P4_PAR_DONE, P4_PAR_DONE + 400));
      }

      // Complete block when parallel finishes
      if (timeMs >= P4_PAR_DONE) {
        const doneFade = easeOut(prog(timeMs, P4_PAR_DONE, P4_PAR_DONE + 500));
        completeMat.opacity = doneFade * 0.9;
        completeMat.emissiveIntensity = doneFade * 0.5;
        completeBlock.scale.y = lerp(0.2, 1, doneFade);
      }
    }

    // ── PHASE 5: Parallel wins — orbit forward, seq recedes ───────
    if (timeMs >= P5_START) {
      const p5 = easeOut(prog(timeMs, P5_START, P5_END));

      // Parallel side drifts forward (toward camera)
      for (let s = 0; s < NUM_SEGS; s++) {
        parSegGroups[s]!.position.z = NODE_Z + p5 * 0.5;
      }
      for (const n of parNodes) {
        n.mesh.position.z = NODE_Z + p5 * 0.5;
      }
      completeBlock.position.z = NODE_Z + 1.2 + p5 * 0.5;
      completeMat.emissiveIntensity = 0.5 + Math.sin(p5 * Math.PI * 3) * 0.15;

      // Sequential side recedes
      seqGroup.position.z = (NODE_Z - 0.3) - p5 * 1.0;
      seqGroup.scale.setScalar(lerp(0.55, 0.4, p5));
      seqNode.mesh.position.z = NODE_Z - p5 * 1.0;
      // Dim sequential further
      for (const meshes of seqTrackMeshes) {
        setTrackOpacity(meshes, lerp(0.3, 0.15, p5), lerp(0.45, 0.25, p5));
      }
      seqNode.mat.opacity = lerp(0.7, 0.3, p5);
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
