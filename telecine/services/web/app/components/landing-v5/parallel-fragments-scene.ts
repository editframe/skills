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

/* ━━ Colors (brighter for visibility) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const COL_VIDEO = 0x2979ff;
const COL_AUDIO = 0x00bfa5;
const COL_TEXT = 0xffc107;
const COL_BLUE_LT = 0x64b5f6;
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

/* ━━ Phase timing (ms) — paced for explainer narration ━━━━━━━━━━━━ */
const P1_END = 2500;       // close-up: timeline assembled
const P_PULLBACK_START = 2000; // camera pull-back begins BEFORE split
const P_PULLBACK_END = 4000;   // camera reaches wide shot
const P2_START = 3500;     // duplicate + laser split (camera already wide)
const P2_END = 6000;
const P3_START = 5500;     // workers reveal
const P3_END = 7500;       // workers fully visible
const P4_START = 7500;     // fly to workers + processing
const P4_PAR_DONE = 11000; // parallel finishes
const P5_START = 11500;    // orbit toward parallel winner
const P5_END = 18000;

/* ━━ Camera key-poses ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const CAM_CLOSE_POS = new THREE.Vector3(0, 1.2, 3.8);
const CAM_CLOSE_TAR = new THREE.Vector3(0, 0.35, 0);
const CAM_WIDE_POS = new THREE.Vector3(0, 3.5, 9.5);
const CAM_WIDE_TAR = new THREE.Vector3(0, -0.1, 1.0);
const CAM_WIN_POS = new THREE.Vector3(1.8, 3.0, 8);
const CAM_WIN_TAR = new THREE.Vector3(1.5, 0, 1.8);

/* ━━ Layout positions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const SEQ_X = -2.2;
const PAR_X = 2.2;
const NODE_Z = 2.0;

/* ━━ Scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function createParallelFragmentsScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;

  const scene = new THREE.Scene();
  // Lighter blue-gray background with fog for horizon
  const BG_COLOR = 0x303548;
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.Fog(BG_COLOR, 14, 32);

  const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 100);
  const camPos = new THREE.Vector3();
  const camTar = new THREE.Vector3();

  /* ── Lighting (strong, with specular-producing spot) ────────── */
  scene.add(new THREE.AmbientLight(0xc8d0e8, 0.8));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(3, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  const sc = keyLight.shadow.camera;
  sc.left = -8; sc.right = 8; sc.top = 6; sc.bottom = -6; sc.near = 0.5; sc.far = 25;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.5);
  fillLight.position.set(-3, 4, -2);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(COL_BLUE_LT, 0.8, 20);
  rimLight.position.set(0, 2, -3);
  scene.add(rimLight);
  // Spot light from above-front for specular highlights on glossy surfaces
  const spotLight = new THREE.SpotLight(0xffffff, 1.5, 20, Math.PI / 6, 0.5, 1);
  spotLight.position.set(0, 5, 4);
  spotLight.target.position.set(0, 0, 1);
  scene.add(spotLight);
  scene.add(spotLight.target);

  /* ── Floor — lighter, slightly reflective ──────────────────────── */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 30),
    new THREE.MeshStandardMaterial({ color: 0x343850, roughness: 0.7, metalness: 0.15 }),
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
      new THREE.MeshStandardMaterial({ color: 0x3a3d50, roughness: 0.8, transparent: true, opacity: 0 }),
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
      // Physical material with clearcoat for glossy specular highlights
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(clipW, TRACK_H[t]!, TRACK_D),
        new THREE.MeshPhysicalMaterial({
          color: TRACK_COLOR[t]!, roughness: 0.15, metalness: 0.1,
          clearcoat: 0.8, clearcoatRoughness: 0.2,
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
  // Tight position with NO gaps — one solid piece
  function segTightX(i: number) {
    const totalTight = SEG_W * NUM_SEGS;
    return -totalTight / 2 + SEG_W / 2 + i * SEG_W;
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

  /* ── Sequential timeline copy (stays whole, no gaps) ─────────── */
  const seqGroup = new THREE.Group();
  const seqTrackMeshes: THREE.Mesh[][] = [];
  for (let s = 0; s < NUM_SEGS; s++) {
    const meshes = buildTrackMeshes(seqGroup, s, segTightX(s));
    seqTrackMeshes.push(meshes);
  }
  seqGroup.visible = false;
  scene.add(seqGroup);

  /* ── Laser cut lines (flash at split boundaries) ────────────────── */
  const cutLines: THREE.Mesh[] = [];
  const cutMats: THREE.MeshBasicMaterial[] = [];
  for (let i = 1; i < NUM_SEGS; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.55), mat);
    mesh.position.set(0, 0.4, 0.01);
    scene.add(mesh);
    cutLines.push(mesh);
    cutMats.push(mat);
  }
  // Bright flash point light for the cut moment
  const cutFlash = new THREE.PointLight(0xffffff, 0, 6);
  cutFlash.position.set(0, 0.6, 0.3);
  scene.add(cutFlash);

  /* ── Render nodes ──────────────────────────────────────────────── */
  const nodeGeo = new THREE.BoxGeometry(NODE_SIZE, NODE_SIZE, NODE_SIZE);
  const edgeGeo = new THREE.EdgesGeometry(nodeGeo);

  function makeNode(x: number, z: number) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x444a5c, roughness: 0.25, metalness: 0.3,
      clearcoat: 0.6, clearcoatRoughness: 0.3,
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

  /* ── Progress bars ──────────────────────────────────────────────── */
  const PROG_H = 0.06;
  function makeProgressBar(x: number, z: number, w: number) {
    const bgMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8, transparent: true, opacity: 0 });
    const bg = new THREE.Mesh(new THREE.BoxGeometry(w, PROG_H, 0.12), bgMat);
    bg.position.set(x, -0.57, z);
    scene.add(bg);
    const fillMat = new THREE.MeshStandardMaterial({
      color: COL_VIDEO, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0,
      emissive: new THREE.Color(COL_BLUE_LT), emissiveIntensity: 0.15,
    });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(w, PROG_H + 0.02, 0.13), fillMat);
    fill.position.set(x, -0.57, z);
    fill.scale.x = 0;
    scene.add(fill);
    return { bg, bgMat, fill, fillMat, width: w, baseX: x };
  }

  const seqBar = makeProgressBar(SEQ_X, NODE_Z + 0.7, TOTAL_W * 0.7);
  const parBars = parNodes.map((n) =>
    makeProgressBar(n.mesh.position.x, NODE_Z + 0.7, SEG_W * 0.85),
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

    // ── CAMERA — pull back BEFORE split so everything stays in frame
    const camPullBack = easeInOut(prog(timeMs, P_PULLBACK_START, P_PULLBACK_END));
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

    // ── PHASE 1: Close-up, one solid timeline ──────────────────────
    const p1 = easeOut(prog(timeMs, 0, P1_END));
    for (let s = 0; s < NUM_SEGS; s++) {
      // Tight positions — no gaps, one continuous piece
      parSegGroups[s]!.position.set(segTightX(s), lerp(1.2, 0.4, p1), 0);
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
    for (const m of cutMats) m.opacity = 0;
    cutFlash.intensity = 0;
    seqBar.bgMat.opacity = 0; seqBar.fillMat.opacity = 0; seqBar.fill.scale.x = 0;
    for (const b of parBars) { b.bgMat.opacity = 0; b.fillMat.opacity = 0; b.fill.scale.x = 0; }

    // ── PHASE 2: Duplicate + laser split ──────────────────────────
    if (timeMs >= P2_START) {
      const p2 = easeInOut(prog(timeMs, P2_START, P2_END));

      // Laser cut flash — brief bright burst at the split moment
      const cutProg = prog(timeMs, P2_START, P2_START + 300);
      const cutFade = prog(timeMs, P2_START + 200, P2_START + 700);
      const cutBrightness = cutProg * (1 - cutFade);
      cutFlash.intensity = cutBrightness * 4;
      for (let c = 0; c < cutLines.length; c++) {
        // Position cut lines at boundaries between tight-packed segments
        const boundaryX = segTightX(c) + SEG_W / 2;
        cutLines[c]!.position.x = boundaryX;
        cutMats[c]!.opacity = cutBrightness;
      }

      // Sequential copy appears and slides left
      seqGroup.visible = true;
      const seqAppear = easeOut(prog(timeMs, P2_START + 200, P2_END));
      seqGroup.position.x = lerp(0, SEQ_X, seqAppear);
      seqGroup.position.y = 0.4;
      seqGroup.position.z = lerp(0, 0.5, seqAppear);
      for (const meshes of seqTrackMeshes) {
        setTrackOpacity(meshes, seqAppear * 0.5, seqAppear * 0.7);
      }

      // Parallel segments: first open gaps (split apart), then slide right
      const gapOpen = easeOut(prog(timeMs, P2_START + 100, P2_START + 800));
      const slideRight = easeInOut(prog(timeMs, P2_START + 500, P2_END));
      for (let s = 0; s < NUM_SEGS; s++) {
        const tightX = segTightX(s);
        const gappedX = segJoinedX(s);
        const parLaneX = PAR_X + (s - 1.5) * LANE_SPREAD;
        // First open gaps, then slide to parallel positions
        const currentX = lerp(lerp(tightX, gappedX, gapOpen), parLaneX, slideRight);
        parSegGroups[s]!.position.x = currentX;
        parSegGroups[s]!.position.z = lerp(0, 0.5, p2);
        setTrackEmissive(parTrackMeshes[s]!, p2 * 0.15);
      }
    }

    // ── PHASE 3: Workers + progress bars reveal ────────────────────
    if (timeMs >= P3_START) {
      const nodeFade = easeOut(prog(timeMs, P3_START + 500, P3_END));
      seqNode.mat.opacity = nodeFade * 0.7;
      seqNode.edgeMat.opacity = nodeFade * 0.4;
      seqBar.bgMat.opacity = nodeFade * 0.25;
      for (const n of parNodes) {
        n.mat.opacity = nodeFade * 0.7;
        n.edgeMat.opacity = nodeFade * 0.4;
      }
      for (const b of parBars) b.bgMat.opacity = nodeFade * 0.25;
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

      // Sequential progress — slow, takes the full remaining time
      const seqElapsed = timeMs - P4_START;
      const seqTotalTime = (P5_END - P4_START); // seq never finishes in our animation
      const seqFill = clamp01(seqElapsed / seqTotalTime);
      seqBar.fillMat.opacity = flyIn * 0.85;
      seqBar.fill.scale.x = easeOut(seqFill);
      seqBar.fill.position.x = seqBar.baseX - seqBar.width / 2 * (1 - easeOut(seqFill));

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

      // Parallel progress bars — slightly independent speeds, finish close together
      const barJitter = [0, 0.06, -0.04, 0.03] as const;
      for (let bi = 0; bi < parBars.length; bi++) {
        const b = parBars[bi]!;
        const barProg = clamp01(processing + barJitter[bi]! * Math.sin(processing * Math.PI));
        b.fillMat.opacity = flyIn * 0.9;
        b.fill.scale.x = easeOut(barProg);
        b.fill.position.x = b.baseX - b.width / 2 * (1 - easeOut(barProg));
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

    // Force GL pipeline to complete so the canvas buffer is ready
    // for frame capture. Without this, renderToVideo reads stale content.
    const gl = renderer.getContext();
    gl.finish();
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
