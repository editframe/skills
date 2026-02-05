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
const COL_VIDEO = 0x448aff;
const COL_AUDIO = 0x1de9b6;
const COL_TEXT = 0xffd740;
const COL_BLUE_LT = 0x82b1ff;
const COL_DONE = 0x69f0ae;
const COL_SEQ_FILL = 0xff8a65;

/* ━━ Sizing (scaled up for visibility) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const NUM_SEGS = 4;
const SEG_W = 1.1;
const SEG_GAP = 0.06;
const TRACK_D = 0.35;
const TRACK_H = [0.16, 0.10, 0.06] as const;
const TRACK_COLOR = [COL_VIDEO, COL_AUDIO, COL_TEXT] as const;
const TRACK_Y = [0.15, 0.0, -0.09] as const;
const TOTAL_W = SEG_W * NUM_SEGS + SEG_GAP * (NUM_SEGS - 1);

const CLIP_LAYOUTS = [
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.85, xPct: 0.05 }, { wPct: 0.35, xPct: 0.32 }],
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.65, xPct: 0.20 }, { wPct: 0.50, xPct: 0.05 }],
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.90, xPct: 0 },    { wPct: 0.30, xPct: 0.55 }],
  [{ wPct: 1.0, xPct: 0 }, { wPct: 0.55, xPct: 0.25 }, { wPct: 0.45, xPct: 0.28 }],
] as const;

const NODE_SIZE = 0.45;
const PARTICLE_COUNT = 500;
const LANE_SPREAD = 1.0;
const PROG_H = 0.16;

/* ━━ Compressed timing — punchline at ~10s, total 14s ━━━━━━━━━━━━━ */
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

/* ━━ Camera key-poses ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const CAM_CLOSE_POS = new THREE.Vector3(0, 0.8, 2.8);
const CAM_CLOSE_TAR = new THREE.Vector3(0, 0.25, 0);
const CAM_WIDE_POS = new THREE.Vector3(0, 3.8, 10);
const CAM_WIDE_TAR = new THREE.Vector3(0, -0.1, 1.2);
const CAM_WIN_POS = new THREE.Vector3(2.0, 3.0, 8);
const CAM_WIN_TAR = new THREE.Vector3(1.5, 0, 2.0);

/* ━━ Layout ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const SEQ_X = -2.8;
const PAR_X = 2.8;
const NODE_Z = 2.2;

/* ━━ Scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function createParallelFragmentsScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.8;

  const scene = new THREE.Scene();
  const BG_COLOR = 0x1e2233;
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.Fog(BG_COLOR, 16, 35);

  const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 100);
  const camPos = new THREE.Vector3();
  const camTar = new THREE.Vector3();

  /* ── Lighting ──────────────────────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0xd0d8f0, 0.9));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(3, 8, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  const sc = keyLight.shadow.camera;
  sc.left = -10; sc.right = 10; sc.top = 8; sc.bottom = -8; sc.near = 0.5; sc.far = 30;
  scene.add(keyLight);
  scene.add(new THREE.DirectionalLight(0xaaccff, 0.6).translateX(-3).translateY(4).translateZ(-2));
  const rimLight = new THREE.PointLight(COL_BLUE_LT, 0.9, 25);
  rimLight.position.set(0, 2, -3);
  scene.add(rimLight);
  const spotLight = new THREE.SpotLight(0xffffff, 2.0, 25, Math.PI / 5, 0.4, 1);
  spotLight.position.set(0, 6, 5);
  spotLight.target.position.set(0, 0, 1);
  scene.add(spotLight);
  scene.add(spotLight.target);

  /* ── Floor with grid ───────────────────────────────────────────── */
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2e42, roughness: 0.75, metalness: 0.1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 35), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.7;
  floor.receiveShadow = true;
  scene.add(floor);
  // Grid lines
  const gridHelper = new THREE.GridHelper(30, 30, 0x3a3f58, 0x3a3f58);
  gridHelper.position.y = -0.69;
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.25;
  scene.add(gridHelper);

  /* ── Build track meshes ────────────────────────────────────────── */
  function buildTrackMeshes(parent: THREE.Group, segIndex: number, xOffset: number) {
    const meshes: THREE.Mesh[] = [];
    const bg = new THREE.Mesh(
      new THREE.BoxGeometry(SEG_W, 0.40, TRACK_D + 0.02),
      new THREE.MeshStandardMaterial({ color: 0x3d4158, roughness: 0.8, transparent: true, opacity: 0 }),
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
        new THREE.MeshPhysicalMaterial({
          color: TRACK_COLOR[t]!, roughness: 0.12, metalness: 0.15,
          clearcoat: 1.0, clearcoatRoughness: 0.15,
          transparent: true, opacity: 0,
          emissive: new THREE.Color(TRACK_COLOR[t]!), emissiveIntensity: 0.1,
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
  function segTightX(i: number) {
    const totalTight = SEG_W * NUM_SEGS;
    return -totalTight / 2 + SEG_W / 2 + i * SEG_W;
  }

  /* ── Parallel segments ─────────────────────────────────────────── */
  const parSegGroups: THREE.Group[] = [];
  const parTrackMeshes: THREE.Mesh[][] = [];
  for (let s = 0; s < NUM_SEGS; s++) {
    const group = new THREE.Group();
    const meshes = buildTrackMeshes(group, s, 0);
    scene.add(group);
    parSegGroups.push(group);
    parTrackMeshes.push(meshes);
  }

  /* ── Sequential timeline (no gaps) ─────────────────────────────── */
  const seqGroup = new THREE.Group();
  const seqTrackMeshes: THREE.Mesh[][] = [];
  for (let s = 0; s < NUM_SEGS; s++) {
    const meshes = buildTrackMeshes(seqGroup, s, segTightX(s));
    seqTrackMeshes.push(meshes);
  }
  seqGroup.visible = false;
  scene.add(seqGroup);

  /* ── Laser cut lines — tall, bright, sequential sweep ──────────── */
  const cutLines: THREE.Mesh[] = [];
  const cutMats: THREE.MeshBasicMaterial[] = [];
  for (let i = 1; i < NUM_SEGS; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 1.5), mat);
    mesh.position.set(0, 0.4, 0.01);
    scene.add(mesh);
    cutLines.push(mesh);
    cutMats.push(mat);
  }
  const cutFlash = new THREE.PointLight(0xffffff, 0, 8);
  cutFlash.position.set(0, 0.8, 0.5);
  scene.add(cutFlash);

  /* ── Render nodes ──────────────────────────────────────────────── */
  const nodeGeo = new THREE.BoxGeometry(NODE_SIZE, NODE_SIZE, NODE_SIZE);
  const edgeGeo = new THREE.EdgesGeometry(nodeGeo);

  function makeNode(x: number, z: number) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x505870, roughness: 0.2, metalness: 0.4,
      clearcoat: 0.7, clearcoatRoughness: 0.2,
      transparent: true, opacity: 0,
      emissive: new THREE.Color(COL_BLUE_LT), emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(nodeGeo, mat);
    mesh.position.set(x, -0.7, z);
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

  /* ── Progress bars (tall, visible, color-coded) ────────────────── */
  function makeProgressBar(x: number, z: number, w: number, fillColor: number, emitColor: number) {
    const bgMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8, transparent: true, opacity: 0 });
    const bg = new THREE.Mesh(new THREE.BoxGeometry(w, PROG_H, 0.15), bgMat);
    bg.position.set(x, -0.68, z);
    scene.add(bg);
    const fillMat = new THREE.MeshPhysicalMaterial({
      color: fillColor, roughness: 0.2, metalness: 0.3,
      clearcoat: 0.5, transparent: true, opacity: 0,
      emissive: new THREE.Color(emitColor), emissiveIntensity: 0.25,
    });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(w, PROG_H + 0.02, 0.16), fillMat);
    fill.position.set(x, -0.68, z);
    fill.scale.x = 0;
    scene.add(fill);
    return { bg, bgMat, fill, fillMat, width: w, baseX: x };
  }

  const seqBar = makeProgressBar(SEQ_X, NODE_Z + 0.8, TOTAL_W * 0.7, COL_SEQ_FILL, COL_SEQ_FILL);
  const parBars = parNodes.map((n) =>
    makeProgressBar(n.mesh.position.x, NODE_Z + 0.8, SEG_W * 0.9, COL_VIDEO, COL_BLUE_LT),
  );

  /* ── Particles (larger, brighter) ──────────────────────────────── */
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
    color: COL_BLUE_LT, size: 0.08, transparent: true, opacity: 0,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  scene.add(new THREE.Points(particleGeo, particleMat));

  /* ── Complete block ────────────────────────────────────────────── */
  const completeMat = new THREE.MeshPhysicalMaterial({
    color: COL_DONE, roughness: 0.2, metalness: 0.3,
    clearcoat: 0.8, transparent: true, opacity: 0,
    emissive: new THREE.Color(COL_DONE), emissiveIntensity: 0,
  });
  const completeBlock = new THREE.Mesh(new THREE.BoxGeometry(TOTAL_W * 0.7, 0.25, 0.35), completeMat);
  completeBlock.position.set(PAR_X, -0.65, NODE_Z + 1.4);
  completeBlock.castShadow = true;
  scene.add(completeBlock);

  /* ── Helpers ───────────────────────────────────────────────────── */
  function setTrackOpacity(meshes: THREE.Mesh[], bgOpa: number, clipOpa: number) {
    for (let m = 0; m < meshes.length; m++) {
      const opa = m === 0 ? bgOpa : clipOpa;
      (meshes[m]!.material as THREE.MeshStandardMaterial).opacity = opa;
      meshes[m]!.castShadow = opa > 0.1;
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
    const camPullBack = easeInOut(prog(timeMs, P_PULLBACK_START, P_PULLBACK_END));
    const camOrbit = easeOut(prog(timeMs, P5_START, P5_END));

    lerpV3(camPos, CAM_CLOSE_POS, CAM_WIDE_POS, camPullBack);
    lerpV3(camTar, CAM_CLOSE_TAR, CAM_WIDE_TAR, camPullBack);
    if (camOrbit > 0) {
      lerpV3(camPos, camPos, CAM_WIN_POS, camOrbit);
      lerpV3(camTar, camTar, CAM_WIN_TAR, camOrbit);
    }

    // Camera snap zoom on "4x faster" reveal
    const snapProg = prog(timeMs, P5_START, P5_START + 300);
    if (snapProg > 0 && snapProg < 1) {
      const snap = Math.sin(snapProg * Math.PI) * 0.3;
      camPos.z -= snap;
    }

    // Subtle camera shake during processing
    if (timeMs >= P4_START && timeMs < P4_PAR_DONE) {
      const shake = 0.015;
      camPos.x += Math.sin(timeMs * 0.007) * shake;
      camPos.y += Math.cos(timeMs * 0.011) * shake;
    }

    camera.position.copy(camPos);
    camera.lookAt(camTar);

    // ── PHASE 1: Close-up, one solid timeline ──────────────────────
    const p1 = easeOut(prog(timeMs, 0, P1_END));
    for (let s = 0; s < NUM_SEGS; s++) {
      parSegGroups[s]!.position.set(segTightX(s), lerp(1.0, 0.3, p1), 0);
      parSegGroups[s]!.rotation.set(0, 0, 0);
      parSegGroups[s]!.scale.setScalar(1);
      setTrackOpacity(parTrackMeshes[s]!, lerp(0, 0.6, p1), lerp(0, 1.0, p1));
      setTrackEmissive(parTrackMeshes[s]!, lerp(0, 0.1, p1));
    }
    seqGroup.visible = false;
    seqGroup.position.set(0, 0.3, 0);
    seqGroup.scale.setScalar(1);
    for (const meshes of seqTrackMeshes) setTrackOpacity(meshes, 0, 0);

    // Reset
    seqNode.mat.opacity = 0; seqNode.edgeMat.opacity = 0; seqNode.mesh.castShadow = false;
    for (const n of parNodes) { n.mat.opacity = 0; n.edgeMat.opacity = 0; n.mesh.castShadow = false; }
    completeMat.opacity = 0; completeBlock.castShadow = false;
    particleMat.opacity = 0;
    for (const m of cutMats) m.opacity = 0;
    cutFlash.intensity = 0;
    seqBar.bgMat.opacity = 0; seqBar.fillMat.opacity = 0; seqBar.fill.scale.x = 0;
    for (const b of parBars) { b.bgMat.opacity = 0; b.fillMat.opacity = 0; b.fill.scale.x = 0; }

    // ── PHASE 2: Laser cut + duplicate ──────────────────────────
    if (timeMs >= P2_START) {
      const p2 = easeInOut(prog(timeMs, P2_START, P2_END));

      // Sequential sweep: each cut line flashes at a staggered time
      for (let c = 0; c < cutLines.length; c++) {
        const sweepDelay = c * 120;
        const cutProg = prog(timeMs, P2_START + sweepDelay, P2_START + sweepDelay + 200);
        const cutFade = prog(timeMs, P2_START + sweepDelay + 150, P2_START + sweepDelay + 600);
        const brightness = cutProg * (1 - cutFade);
        cutMats[c]!.opacity = brightness;
        cutLines[c]!.position.x = segTightX(c) + SEG_W / 2;
      }
      cutFlash.intensity = prog(timeMs, P2_START, P2_START + 200) * (1 - prog(timeMs, P2_START + 150, P2_START + 500)) * 8;

      // Sequential copy
      seqGroup.visible = true;
      const seqAppear = easeOut(prog(timeMs, P2_START + 300, P2_END));
      seqGroup.position.x = lerp(0, SEQ_X, seqAppear);
      seqGroup.position.y = 0.3;
      seqGroup.position.z = lerp(0, 0.5, seqAppear);
      for (const meshes of seqTrackMeshes) {
        setTrackOpacity(meshes, seqAppear * 0.4, seqAppear * 0.55);
      }

      // Parallel segments split and slide
      const gapOpen = easeOut(prog(timeMs, P2_START + 100, P2_START + 700));
      const slideRight = easeInOut(prog(timeMs, P2_START + 400, P2_END));
      for (let s = 0; s < NUM_SEGS; s++) {
        const tightX = segTightX(s);
        const gappedX = segJoinedX(s);
        const parLaneX = PAR_X + (s - 1.5) * LANE_SPREAD;
        const currentX = lerp(lerp(tightX, gappedX, gapOpen), parLaneX, slideRight);
        parSegGroups[s]!.position.x = currentX;
        parSegGroups[s]!.position.z = lerp(0, 0.5, p2);
        setTrackEmissive(parTrackMeshes[s]!, lerp(0.1, 0.2, p2));
      }
    }

    // ── PHASE 3: Workers reveal ────────────────────────────────
    if (timeMs >= P3_START) {
      const nodeFade = easeOut(prog(timeMs, P3_START + 300, P3_END));
      seqNode.mat.opacity = nodeFade * 0.6;
      seqNode.edgeMat.opacity = nodeFade * 0.3;
      seqNode.mesh.castShadow = nodeFade > 0.1;
      seqBar.bgMat.opacity = nodeFade * 0.3;
      for (const n of parNodes) {
        n.mat.opacity = nodeFade * 0.8;
        n.edgeMat.opacity = nodeFade * 0.5;
        n.mesh.castShadow = nodeFade > 0.1;
      }
      for (const b of parBars) b.bgMat.opacity = nodeFade * 0.3;
    }

    // ── PHASE 4: Fly to workers + processing ──────────────────
    if (timeMs >= P4_START) {
      const flyIn = easeOut(prog(timeMs, P4_START, P4_START + 700));
      const processing = prog(timeMs, P4_START + 700, P4_PAR_DONE);

      // Sequential flies to node, dims
      seqGroup.position.y = lerp(0.3, 0, flyIn);
      seqGroup.position.z = lerp(0.5, NODE_Z - 0.3, flyIn);
      seqGroup.scale.setScalar(lerp(1, 0.50, flyIn));
      for (const meshes of seqTrackMeshes) {
        setTrackOpacity(meshes, 0.25, lerp(0.55, 0.3, processing));
        setTrackEmissive(meshes, 0.02);
      }
      seqNode.mat.emissiveIntensity = 0.05 + Math.sin(processing * Math.PI * 3) * 0.03;
      seqNode.mesh.rotation.y = Math.sin(processing * Math.PI * 2) * 0.02;

      // Sequential progress — slow, orange-tinted
      const seqElapsed = timeMs - P4_START;
      const seqTotalTime = (P5_END - P4_START);
      seqBar.fillMat.opacity = flyIn * 0.8;
      seqBar.fill.scale.x = easeOut(clamp01(seqElapsed / seqTotalTime));
      seqBar.fill.position.x = seqBar.baseX - seqBar.width / 2 * (1 - easeOut(clamp01(seqElapsed / seqTotalTime)));

      // Parallel segments fly to nodes, stay bright
      for (let s = 0; s < NUM_SEGS; s++) {
        const laneX = PAR_X + (s - 1.5) * LANE_SPREAD;
        parSegGroups[s]!.position.x = laneX;
        parSegGroups[s]!.position.y = lerp(0.3, -0.15, flyIn);
        parSegGroups[s]!.position.z = lerp(0.5, NODE_Z, flyIn);
        parSegGroups[s]!.scale.setScalar(lerp(1, 0.60, flyIn));

        const pulse = Math.sin(processing * Math.PI * 6 + s * 1.5) * 0.12;
        parNodes[s]!.mat.emissiveIntensity = processing > 0 ? 0.3 + pulse : 0;
        parNodes[s]!.edgeMat.opacity = 0.5 + processing * 0.4;
        parNodes[s]!.mesh.rotation.y = Math.sin(processing * Math.PI * 4 + s) * 0.08;
        setTrackEmissive(parTrackMeshes[s]!, 0.2 + pulse * 0.5);
      }

      // Parallel progress bars
      const barJitter = [0, 0.06, -0.04, 0.03] as const;
      for (let bi = 0; bi < parBars.length; bi++) {
        const b = parBars[bi]!;
        const barProg = clamp01(processing + barJitter[bi]! * Math.sin(processing * Math.PI));
        b.fillMat.opacity = flyIn * 0.95;
        b.fill.scale.x = easeOut(barProg);
        b.fill.position.x = b.baseX - b.width / 2 * (1 - easeOut(barProg));
      }

      // Particles — larger, brighter
      if (processing > 0 && processing < 1) {
        particleMat.opacity = 0.85;
        const positions = particleGeo.attributes.position!.array as Float32Array;
        for (let p = 0; p < PARTICLE_COUNT; p++) {
          const lane = pLane[p]!;
          const speed = pSpd[p]!;
          const lx = PAR_X + (lane - 1.5) * LANE_SPREAD;
          const t = ((timeMs - P4_START) * speed * 0.001 + p * 0.1) % 3.5 - 1.75;
          positions[p * 3] = lx + (Math.random() - 0.5) * 0.4;
          positions[p * 3 + 1] = -0.7 + Math.sin(t * 2) * 0.25 + (Math.random() - 0.5) * 0.12;
          positions[p * 3 + 2] = NODE_Z + t * 0.5;
        }
        particleGeo.attributes.position!.needsUpdate = true;
      } else if (timeMs >= P4_PAR_DONE) {
        particleMat.opacity = lerp(0.85, 0, prog(timeMs, P4_PAR_DONE, P4_PAR_DONE + 400));
      }

      // Complete block
      if (timeMs >= P4_PAR_DONE) {
        const doneFade = easeOut(prog(timeMs, P4_PAR_DONE, P4_PAR_DONE + 400));
        completeMat.opacity = doneFade * 0.95;
        completeMat.emissiveIntensity = doneFade * 0.6;
        completeBlock.scale.y = lerp(0.2, 1, doneFade);
        completeBlock.castShadow = doneFade > 0.1;
      }
    }

    // ── PHASE 5: Parallel wins ───────────────────────────────
    if (timeMs >= P5_START) {
      const p5 = easeOut(prog(timeMs, P5_START, P5_END));

      // Parallel forward
      for (let s = 0; s < NUM_SEGS; s++) {
        parSegGroups[s]!.position.z = NODE_Z + p5 * 0.6;
      }
      for (const n of parNodes) {
        n.mesh.position.z = NODE_Z + p5 * 0.6;
      }
      completeBlock.position.z = NODE_Z + 1.4 + p5 * 0.6;
      completeMat.emissiveIntensity = 0.6 + Math.sin(p5 * Math.PI * 3) * 0.2;

      // Sequential recedes and dims heavily
      seqGroup.position.z = (NODE_Z - 0.3) - p5 * 1.5;
      seqGroup.scale.setScalar(lerp(0.50, 0.35, p5));
      seqNode.mesh.position.z = NODE_Z - p5 * 1.5;
      for (const meshes of seqTrackMeshes) {
        setTrackOpacity(meshes, lerp(0.25, 0.08, p5), lerp(0.3, 0.12, p5));
      }
      seqNode.mat.opacity = lerp(0.6, 0.15, p5);
    }

    rimLight.intensity = 0.9 + Math.sin(timeMs * 0.0015) * 0.15;
    renderer.render(scene, camera);

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
