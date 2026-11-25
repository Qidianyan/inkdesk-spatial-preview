#!/usr/bin/env node
/**
 * Procedural Museum-Grade GLB 3D Asset Builder for InkDesk Spatial (砚境空间)
 * Exports 4 authentic binary glTF 2.0 (.glb) multi-node models shared by:
 *   1) Native Android PICO Spatial SDK: code/inkdesk-spatial/app/src/main/assets/models/
 *   2) WebXR Three.js Simulator:        code/spatial-preview/public/models/
 */
import { mkdirSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Minimal FileReader polyfill for Node.js GLTFExporter binary ArrayBuffer output
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class NodeFileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend({ target: this });
        if (this.onload) this.onload({ target: this });
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        const b64 = Buffer.from(buf).toString('base64');
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${b64}`;
        if (this.onloadend) this.onloadend({ target: this });
        if (this.onload) this.onload({ target: this });
      });
    }
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PREVIEW_ROOT = resolve(__dirname, '..');
const REPO_CODE_ROOT = resolve(PREVIEW_ROOT, '..');
const ANDROID_MODELS_DIR = resolve(REPO_CODE_ROOT, 'inkdesk-spatial/app/src/main/assets/models');
const PREVIEW_MODELS_DIR = resolve(PREVIEW_ROOT, 'public/models');

mkdirSync(ANDROID_MODELS_DIR, { recursive: true });
mkdirSync(PREVIEW_MODELS_DIR, { recursive: true });

// Material presets keyed by name so both PICO Spatial SDK & Three.js GLTFLoader bind matching PBR textures
function makeMat(name, hex, metalness, roughness) {
  const m = new THREE.MeshStandardMaterial({
    name,
    color: new THREE.Color(hex),
    metalness,
    roughness
  });
  return m;
}

function addPartMesh(group, partId, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.userData = { partId };
  mesh.name = `${partId}_mesh_${group.children.length}`;
  group.add(mesh);
  return mesh;
}

function createExtrudedBracketProfile(length, height, depth, curveDrop = 0.085) {
  const halfL = length * 0.5;
  const halfH = height * 0.5;
  const shape = new THREE.Shape();
  // Bottom curved juansha (卷杀) scroll silhouette
  shape.moveTo(-halfL, halfH * 0.25);
  shape.quadraticCurveTo(-halfL + 0.14, -halfH, -halfL + 0.34, -halfH);
  shape.lineTo(-0.14, -halfH);
  shape.lineTo(-0.1, -halfH + 0.025);
  shape.lineTo(0.1, -halfH + 0.025);
  shape.lineTo(0.14, -halfH);
  shape.lineTo(halfL - 0.34, -halfH);
  shape.quadraticCurveTo(halfL - 0.14, -halfH, halfL, halfH * 0.25);
  // Top stepped crest
  shape.lineTo(halfL, halfH - curveDrop * 0.25);
  shape.lineTo(halfL - 0.18, halfH);
  shape.lineTo(0.16, halfH);
  shape.lineTo(0.12, halfH - 0.045);
  shape.lineTo(-0.12, halfH - 0.045);
  shape.lineTo(-0.16, halfH);
  shape.lineTo(-halfL + 0.18, halfH);
  shape.lineTo(-halfL, halfH - curveDrop * 0.25);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 4,
    curveSegments: 16
  });
  geo.center();
  return geo;
}

function createBeveledRingGeo(outerR, innerR, depth, segments = 64) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 3,
    curveSegments: segments
  });
  geo.center();
  return geo;
}

function createSculptedDouBlock(topW, bottomW, totalH, earH, matMain, matAccent, partId) {
  const g = new THREE.Group();
  // Concave Ming-style qisha base using 4-sided lathe
  const rTop = topW * 0.7071;
  const rBot = bottomW * 0.7071;
  const pts = [
    new THREE.Vector2(0.005, -totalH * 0.5),
    new THREE.Vector2(rBot, -totalH * 0.5),
    new THREE.Vector2(rBot * 1.12, -totalH * 0.22),
    new THREE.Vector2(rTop * 0.96, totalH * 0.08),
    new THREE.Vector2(rTop, totalH * 0.24),
    new THREE.Vector2(rTop * 0.94, totalH * 0.24),
    new THREE.Vector2(rTop * 0.94, totalH * 0.16),
    new THREE.Vector2(0.005, totalH * 0.16)
  ];
  const baseGeo = new THREE.LatheGeometry(pts, 4);
  baseGeo.rotateY(Math.PI / 4);
  baseGeo.computeVertexNormals();
  addPartMesh(g, partId, baseGeo, matMain);

  // Recessed waist band (斗腰)
  const collarGeo = new THREE.BoxGeometry(topW * 0.95, totalH * 0.14, topW * 0.95);
  addPartMesh(g, partId, collarGeo, matAccent, [0, totalH * 0.22, 0]);

  // 4 corner ears (斗耳) forming true cruciform mortise slot
  const earW = topW * 0.34;
  const earOffset = topW * 0.31;
  const earGeo = new THREE.BoxGeometry(earW, earH, earW);
  for (const sx of [-earOffset, earOffset]) {
    for (const sz of [-earOffset, earOffset]) {
      addPartMesh(g, partId, earGeo, matMain, [sx, totalH * 0.26 + earH * 0.5, sz]);
    }
  }
  return g;
}

/**
 * 1. Yongle Bell Dougong Joinery (永乐大钟重檐五踩斗拱榫卯)
 */
function buildYongleDougongScene() {
  const root = new THREE.Group();
  root.name = 'yongle_dougong';

  const hinokiLight = makeMat('hinoki_light', '#DEC8A4', 0.04, 0.56);
  const hinokiMid = makeMat('hinoki_mid', '#C8A97E', 0.05, 0.54);
  const hinokiDeep = makeMat('hinoki_deep', '#A68358', 0.06, 0.58);
  const bronzeGilt = makeMat('bronze_gilt', '#C98A3A', 0.86, 0.26);
  const bronzeAged = makeMat('bronze_aged', '#9E6E34', 0.82, 0.34);
  const cinnabarLacquer = makeMat('cinnabar_lacquer', '#D64527', 0.16, 0.28);
  const titaniumStone = makeMat('alabaster_stone', '#E6E3DC', 0.04, 0.62);

  // Part 1: ludou (栌斗)
  const ludou = new THREE.Group();
  ludou.name = 'ludou';
  const ludouSculpt = createSculptedDouBlock(0.64, 0.38, 0.34, 0.14, hinokiMid, bronzeGilt, 'ludou');
  ludou.add(ludouSculpt);
  // Bottom stone-plinth pad ring
  addPartMesh(ludou, 'ludou', new THREE.CylinderGeometry(0.26, 0.3, 0.05, 8), titaniumStone, [0, -0.19, 0]);
  // Central wooden tenon dowel pin
  addPartMesh(ludou, 'ludou', new THREE.CylinderGeometry(0.055, 0.055, 0.16, 12), hinokiDeep, [0, 0.16, 0]);
  root.add(ludou);

  // Part 2: huagong (华拱 - Z axis cantilevered double-scroll arm)
  const huagong = new THREE.Group();
  huagong.name = 'huagong';
  const huaGeo = createExtrudedBracketProfile(1.46, 0.24, 0.18);
  addPartMesh(huagong, 'huagong', huaGeo, hinokiLight, [0, 0, 0], [0, Math.PI / 2, 0]);
  // Inlaid bronze structural bottom spline & carved tenon cleats
  addPartMesh(huagong, 'huagong', new THREE.BoxGeometry(0.21, 0.03, 1.05), bronzeGilt, [0, -0.11, 0]);
  addPartMesh(huagong, 'huagong', new THREE.BoxGeometry(0.14, 0.08, 0.16), hinokiDeep, [0, 0.14, 0.56]);
  addPartMesh(huagong, 'huagong', new THREE.BoxGeometry(0.14, 0.08, 0.16), hinokiDeep, [0, 0.14, -0.56]);
  root.add(huagong);

  // Part 3: nidaogong (泥道拱 - X axis transverse curved bracket)
  const nidaogong = new THREE.Group();
  nidaogong.name = 'nidaogong';
  const nidaoGeo = createExtrudedBracketProfile(1.5, 0.23, 0.17);
  addPartMesh(nidaogong, 'nidaogong', nidaoGeo, hinokiMid);
  addPartMesh(nidaogong, 'nidaogong', new THREE.BoxGeometry(1.12, 0.028, 0.2), bronzeGilt, [0, -0.105, 0]);
  // Decorative mortise bolster cheeks
  for (const sx of [-0.56, 0.56]) {
    addPartMesh(nidaogong, 'nidaogong', new THREE.BoxGeometry(0.16, 0.075, 0.14), hinokiLight, [sx, 0.135, 0]);
  }
  root.add(nidaogong);

  // Part 4: jiaohudou (交互斗与散斗组)
  const jiaohudou = new THREE.Group();
  jiaohudou.name = 'jiaohudou';
  const douCoords = [
    [0, 0, 0.58],
    [0, 0, -0.58],
    [0.58, 0, 0],
    [-0.58, 0, 0]
  ];
  for (const [dx, dy, dz] of douCoords) {
    const mini = createSculptedDouBlock(0.25, 0.15, 0.15, 0.065, hinokiLight, bronzeGilt, 'jiaohudou');
    mini.position.set(dx, dy, dz);
    jiaohudou.add(mini);
  }
  // Upper cross connecting tie-bar (令拱)
  const lingGeo = createExtrudedBracketProfile(1.16, 0.14, 0.12, 0.05);
  addPartMesh(jiaohudou, 'jiaohudou', lingGeo, hinokiDeep, [0, 0.12, 0]);
  root.add(jiaohudou);

  // Part 5: ang_lever (下昂斜杠杆梁 — curved Ming elephant-beak Ang)
  const ang = new THREE.Group();
  ang.name = 'ang_lever';
  const angShape = new THREE.Shape();
  angShape.moveTo(-0.82, 0.14);
  angShape.lineTo(0.58, -0.12);
  angShape.quadraticCurveTo(0.82, -0.17, 0.94, -0.34); // Sharp elephant-beak drop
  angShape.quadraticCurveTo(0.76, -0.32, 0.52, -0.26);
  angShape.lineTo(-0.76, -0.02);
  angShape.lineTo(-0.88, 0.06);
  angShape.closePath();
  const angGeo = new THREE.ExtrudeGeometry(angShape, {
    depth: 0.17,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.013,
    bevelSegments: 4,
    curveSegments: 20
  });
  angGeo.center();
  angGeo.rotateY(-Math.PI / 2);
  addPartMesh(ang, 'ang_lever', angGeo, cinnabarLacquer);
  // Gilt bronze structural collar clamp & bevelled nose sheath
  addPartMesh(ang, 'ang_lever', new THREE.BoxGeometry(0.22, 0.24, 0.12), bronzeGilt, [0, 0.02, 0.04], [0.18, 0, 0]);
  addPartMesh(ang, 'ang_lever', new THREE.BoxGeometry(0.21, 0.045, 1.38), bronzeGilt, [0, 0.075, -0.04], [0.18, 0, 0]);
  root.add(ang);

  // Part 6: shuatou (耍头与承重枋)
  const shuatou = new THREE.Group();
  shuatou.name = 'shuatou';
  // Heavy beveled lintel beam (撩檐枋)
  const lintelShape = new THREE.Shape();
  lintelShape.moveTo(-0.88, -0.09);
  lintelShape.lineTo(0.88, -0.09);
  lintelShape.lineTo(0.92, 0.09);
  lintelShape.lineTo(-0.92, 0.09);
  lintelShape.closePath();
  const lintelGeo = new THREE.ExtrudeGeometry(lintelShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.014,
    bevelSegments: 4
  });
  lintelGeo.center();
  addPartMesh(shuatou, 'shuatou', lintelGeo, hinokiDeep, [0, 0.08, 0]);
  // Top gilt bronze cornice trim & 3 architectural tie brackets
  addPartMesh(shuatou, 'shuatou', new THREE.BoxGeometry(1.9, 0.055, 0.42), bronzeGilt, [0, 0.21, 0]);
  for (const bx of [-0.62, 0, 0.62]) {
    addPartMesh(shuatou, 'shuatou', new THREE.BoxGeometry(0.11, 0.25, 0.44), bronzeAged, [bx, 0.09, 0]);
  }
  // Curved cloud-scroll shuatou tongue along Z
  const tongueGeo = createExtrudedBracketProfile(1.06, 0.15, 0.18, 0.05);
  addPartMesh(shuatou, 'shuatou', tongueGeo, hinokiLight, [0, -0.04, 0.06], [0, Math.PI / 2, 0]);
  root.add(shuatou);

  // Part 7: yongle_crest (永乐大钟蒲牢钟纽 — sculpted parabolic Ming Bell)
  const bell = new THREE.Group();
  bell.name = 'yongle_crest';
  const bellPts = [
    new THREE.Vector2(0.01, 0.25),
    new THREE.Vector2(0.13, 0.24),
    new THREE.Vector2(0.19, 0.2),
    new THREE.Vector2(0.22, 0.09),
    new THREE.Vector2(0.25, -0.06),
    new THREE.Vector2(0.29, -0.19),
    new THREE.Vector2(0.365, -0.3),
    new THREE.Vector2(0.335, -0.31),
    new THREE.Vector2(0.29, -0.26),
    new THREE.Vector2(0.24, -0.12),
    new THREE.Vector2(0.19, 0.12),
    new THREE.Vector2(0.01, 0.18)
  ];
  addPartMesh(bell, 'yongle_crest', new THREE.LatheGeometry(bellPts, 56), bronzeAged);
  // Inscription girdle bands
  for (const [ry, rad] of [
    [0.06, 0.232],
    [-0.08, 0.262],
    [-0.21, 0.304]
  ]) {
    addPartMesh(bell, 'yongle_crest', new THREE.TorusGeometry(rad, 0.012, 12, 48), bronzeGilt, [0, ry, 0], [Math.PI / 2, 0, 0]);
  }
  // Cast acoustic boss studs (枚乳)
  const studGeo = new THREE.SphereGeometry(0.016, 10, 10);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    addPartMesh(bell, 'yongle_crest', studGeo, bronzeGilt, [Math.cos(a) * 0.218, 0.14, Math.sin(a) * 0.218]);
  }
  // Sculpted twin-arch Pulao dragon suspension loop
  const archCurve1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.11, 0.23, 0),
    new THREE.Vector3(-0.08, 0.36, 0.025),
    new THREE.Vector3(0, 0.4, 0),
    new THREE.Vector3(0.08, 0.36, -0.025),
    new THREE.Vector3(0.11, 0.23, 0)
  ]);
  addPartMesh(bell, 'yongle_crest', new THREE.TubeGeometry(archCurve1, 28, 0.028, 12, false), bronzeGilt);
  addPartMesh(bell, 'yongle_crest', new THREE.TorusGeometry(0.15, 0.018, 12, 32), bronzeGilt, [0, 0.24, 0], [Math.PI / 2, 0, 0]);
  root.add(bell);

  return root;
}

/**
 * 2. Ming Bronze Armillary Sphere (明代浑天仪)
 */
function buildMingArmillaryScene() {
  const root = new THREE.Group();
  root.name = 'ming_armillary';

  const bronzeGilt = makeMat('bronze_gilt', '#D49E4D', 0.88, 0.24);
  const bronzeAged = makeMat('bronze_aged', '#9E7037', 0.84, 0.32);
  const bronzeDark = makeMat('bronze_dark', '#4D3C2E', 0.72, 0.42);
  const cinnabarBronze = makeMat('cinnabar_bronze', '#D64527', 0.62, 0.3);
  const brassBright = makeMat('brass_bright', '#E6BC6E', 0.9, 0.2);

  // 1. horizon_ring (地平经环 — beveled flat hollow ring with 24 compass markers)
  const horizon = new THREE.Group();
  horizon.name = 'horizon_ring';
  const hRingGeo = createBeveledRingGeo(0.98, 0.85, 0.055, 72);
  addPartMesh(horizon, 'horizon_ring', hRingGeo, bronzeGilt, [0, 0, 0], [Math.PI / 2, 0, 0]);
  // Inner recessed leveling water-trough bead
  addPartMesh(horizon, 'horizon_ring', new THREE.TorusGeometry(0.915, 0.012, 10, 64), bronzeDark, [0, 0.036, 0], [Math.PI / 2, 0, 0]);
  const lugGeo = new THREE.BoxGeometry(0.024, 0.075, 0.14);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const isCardinal = i % 6 === 0;
    addPartMesh(
      horizon,
      'horizon_ring',
      isCardinal ? new THREE.BoxGeometry(0.06, 0.095, 0.18) : lugGeo,
      isCardinal ? brassBright : bronzeAged,
      [Math.cos(a) * 0.92, 0.015, Math.sin(a) * 0.92],
      [0, -a + Math.PI / 2, 0]
    );
  }
  root.add(horizon);

  // 2. meridian_ring (子午双环 + 北京纬度 39.9° 极轴)
  const meridian = new THREE.Group();
  meridian.name = 'meridian_ring';
  const mRingGeo = createBeveledRingGeo(0.89, 0.81, 0.026, 72);
  addPartMesh(meridian, 'meridian_ring', mRingGeo, bronzeAged, [0, 0, 0.038]);
  addPartMesh(meridian, 'meridian_ring', mRingGeo, bronzeAged, [0, 0, -0.038]);
  // 12 precision cylindrical spacer rivets between twin rings
  const rivetGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.09, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    addPartMesh(meridian, 'meridian_ring', rivetGeo, brassBright, [Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0], [Math.PI / 2, 0, 0]);
  }
  // Polar axis & sculpted bearing collars (Beijing 39.9 deg)
  const poleTilt = (50.1 * Math.PI) / 180;
  addPartMesh(meridian, 'meridian_ring', new THREE.CylinderGeometry(0.022, 0.022, 1.88, 20), brassBright, [0, 0, 0], [0, 0, poleTilt]);
  for (const s of [-0.88, 0.88]) {
    addPartMesh(meridian, 'meridian_ring', new THREE.CylinderGeometry(0.055, 0.055, 0.09, 16), bronzeGilt, [-Math.sin(poleTilt) * s, Math.cos(poleTilt) * s, 0], [0, 0, poleTilt]);
  }
  root.add(meridian);

  // 3. equatorial_ring (赤道刻度环)
  const equatorial = new THREE.Group();
  equatorial.name = 'equatorial_ring';
  const eqGeo = createBeveledRingGeo(0.76, 0.69, 0.04, 64);
  addPartMesh(equatorial, 'equatorial_ring', eqGeo, brassBright, [0, 0, 0], [Math.PI / 2, 0, poleTilt]);
  const hourNodeGeo = new THREE.SphereGeometry(0.024, 12, 12);
  const eqGroup = new THREE.Group();
  eqGroup.rotation.set(Math.PI / 2, 0, poleTilt);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    addPartMesh(eqGroup, 'equatorial_ring', hourNodeGeo, bronzeGilt, [Math.cos(a) * 0.725, Math.sin(a) * 0.725, 0]);
  }
  equatorial.add(eqGroup);
  root.add(equatorial);

  // 4. ecliptic_ring (黄道斜环 — 23.5° obliquity vermilion bronze)
  const ecliptic = new THREE.Group();
  ecliptic.name = 'ecliptic_ring';
  const ecGeo = createBeveledRingGeo(0.68, 0.615, 0.036, 64);
  const ecInner = new THREE.Group();
  ecInner.rotation.set(Math.PI / 2 - 0.41, 0.25, poleTilt);
  addPartMesh(ecInner, 'ecliptic_ring', ecGeo, cinnabarBronze);
  // 12 gilt zodiac beads + solstice sun pearl
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const isSolstice = i === 0 || i === 6;
    addPartMesh(
      ecInner,
      'ecliptic_ring',
      new THREE.SphereGeometry(isSolstice ? 0.048 : 0.022, 16, 16),
      brassBright,
      [Math.cos(a) * 0.648, Math.sin(a) * 0.648, 0]
    );
  }
  ecliptic.add(ecInner);
  root.add(ecliptic);

  // 5. sight_tube (四游仪与窥管)
  const sight = new THREE.Group();
  sight.name = 'sight_tube';
  // Inner rotating declination hoop
  addPartMesh(sight, 'sight_tube', createBeveledRingGeo(0.56, 0.51, 0.024, 48), bronzeGilt, [0, 0, 0], [0, 0.52, 0]);
  // Stepped lathe-turned brass sighting telescope tube
  const tubePts = [
    new THREE.Vector2(0.028, -0.58),
    new THREE.Vector2(0.052, -0.54),
    new THREE.Vector2(0.036, -0.42),
    new THREE.Vector2(0.042, 0),
    new THREE.Vector2(0.036, 0.42),
    new THREE.Vector2(0.058, 0.54),
    new THREE.Vector2(0.03, 0.58)
  ];
  addPartMesh(sight, 'sight_tube', new THREE.LatheGeometry(tubePts, 24), brassBright, [0, 0, 0], [0.42, 0.28, Math.PI / 2 - 0.3]);
  // Central celestial armillary globe hub
  addPartMesh(sight, 'sight_tube', new THREE.SphereGeometry(0.135, 32, 32), bronzeGilt);
  addPartMesh(sight, 'sight_tube', new THREE.TorusGeometry(0.16, 0.014, 12, 32), cinnabarBronze, [0, 0, 0], [Math.PI / 3, 0.4, 0]);
  root.add(sight);

  // 6. dragon_base (云龙托架与十字须弥座)
  const base = new THREE.Group();
  base.name = 'dragon_base';
  // Stepped cross base arms
  addPartMesh(base, 'dragon_base', new THREE.BoxGeometry(1.5, 0.1, 0.26), bronzeDark, [0, -0.34, 0]);
  addPartMesh(base, 'dragon_base', new THREE.BoxGeometry(0.26, 0.1, 1.5), bronzeDark, [0, -0.34, 0]);
  addPartMesh(base, 'dragon_base', new THREE.BoxGeometry(1.42, 0.035, 0.18), bronzeGilt, [0, -0.28, 0]);
  addPartMesh(base, 'dragon_base', new THREE.BoxGeometry(0.18, 0.035, 1.42), bronzeGilt, [0, -0.28, 0]);
  // Central octagonal lotus drum
  addPartMesh(base, 'dragon_base', new THREE.CylinderGeometry(0.26, 0.36, 0.18, 8), bronzeAged, [0, -0.22, 0]);
  // 4 sweeping S-curved dragon pillar struts supporting the horizon ring
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(ca * 0.28, -0.28, sa * 0.28),
      new THREE.Vector3(ca * 0.58, -0.14, sa * 0.58),
      new THREE.Vector3(ca * 0.48, 0.16, sa * 0.48),
      new THREE.Vector3(ca * 0.88, 0.56, sa * 0.88)
    ]);
    addPartMesh(base, 'dragon_base', new THREE.TubeGeometry(curve, 28, 0.044, 14, false), bronzeAged);
    // Decorative dragon cloud collar
    addPartMesh(base, 'dragon_base', new THREE.TorusGeometry(0.068, 0.018, 10, 20), bronzeGilt, [ca * 0.52, 0.04, sa * 0.52], [Math.PI / 2, 0, 0]);
    // Base corner lion-paw pad
    addPartMesh(base, 'dragon_base', new THREE.CylinderGeometry(0.08, 0.11, 0.08, 12), bronzeGilt, [Math.cos(i * Math.PI * 0.5) * 0.72, -0.37, Math.sin(i * Math.PI * 0.5) * 0.72]);
  }
  root.add(base);

  return root;
}

/**
 * 3. Song-Ming Xuande Censer (宋式宣德炉)
 */
function buildXuandeCenserScene() {
  const root = new THREE.Group();
  root.name = 'xuande_censer';

  const bronzeChestnut = makeMat('bronze_chestnut', '#A66F3E', 0.82, 0.27);
  const bronzeGilt = makeMat('bronze_gilt', '#D4A154', 0.88, 0.22);
  const hinokiDark = makeMat('hinoki_dark', '#594231', 0.08, 0.48);
  const ashStone = makeMat('alabaster_ash', '#E2DDD4', 0.02, 0.92);
  const emberRed = makeMat('ember_cinnabar', '#D64527', 0.12, 0.36);

  // 1. lotus_lid (镂空莲瓣炉盖)
  const lid = new THREE.Group();
  lid.name = 'lotus_lid';
  // Stepped collar rim
  addPartMesh(lid, 'lotus_lid', createBeveledRingGeo(0.56, 0.47, 0.045, 56), bronzeGilt, [0, 0, 0], [Math.PI / 2, 0, 0]);
  // 12 sculpted openwork arching lotus petals converging to central finial crown
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const petalCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(ca * 0.51, 0.02, sa * 0.51),
      new THREE.Vector3(ca * 0.44, 0.15, sa * 0.44),
      new THREE.Vector3(ca * 0.24, 0.24, sa * 0.24),
      new THREE.Vector3(ca * 0.08, 0.27, sa * 0.08)
    ]);
    addPartMesh(lid, 'lotus_lid', new THREE.TubeGeometry(petalCurve, 18, 0.022, 10, false), bronzeGilt);
    // Secondary lattice lotus arch ring
    addPartMesh(
      lid,
      'lotus_lid',
      new THREE.TorusGeometry(0.085, 0.013, 8, 18),
      bronzeChestnut,
      [ca * 0.36, 0.11, sa * 0.36],
      [0.65, -a + Math.PI / 2, 0]
    );
  }
  // Lathe-turned lotus-bud finial knop
  const knopPts = [
    new THREE.Vector2(0.005, 0.24),
    new THREE.Vector2(0.11, 0.25),
    new THREE.Vector2(0.06, 0.3),
    new THREE.Vector2(0.095, 0.37),
    new THREE.Vector2(0.065, 0.44),
    new THREE.Vector2(0.005, 0.49)
  ];
  addPartMesh(lid, 'lotus_lid', new THREE.LatheGeometry(knopPts, 32), bronzeGilt);
  root.add(lid);

  // 2. incense_tray (沉香篆印灰盘 — true 3D Archimedean spiral seal incense)
  const tray = new THREE.Group();
  tray.name = 'incense_tray';
  addPartMesh(tray, 'incense_tray', new THREE.CylinderGeometry(0.5, 0.44, 0.085, 48), ashStone);
  addPartMesh(tray, 'incense_tray', new THREE.TorusGeometry(0.495, 0.014, 10, 48), bronzeGilt, [0, 0.04, 0], [Math.PI / 2, 0, 0]);
  // True spiral incense coil (4 turns)
  const spiralPts = [];
  const turns = 4.0;
  const steps = 110;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const angle = f * turns * Math.PI * 2;
    const rad = 0.05 + f * 0.32;
    spiralPts.push(new THREE.Vector3(Math.cos(angle) * rad, 0.058, Math.sin(angle) * rad));
  }
  const spiralCurve = new THREE.CatmullRomCurve3(spiralPts);
  addPartMesh(tray, 'incense_tray', new THREE.TubeGeometry(spiralCurve, 120, 0.014, 10, false), bronzeChestnut);
  // Glowing ember tip at start of seal coil
  addPartMesh(tray, 'incense_tray', new THREE.SphereGeometry(0.028, 16, 16), emberRed, [spiralPts[0].x, 0.062, spiralPts[0].z]);
  root.add(tray);

  // 3. censer_body (蚰龙厚胎铜炉腹 — smooth 64-segment Ming silhouette)
  const body = new THREE.Group();
  body.name = 'censer_body';
  const bodyPts = [
    new THREE.Vector2(0.01, -0.26),
    new THREE.Vector2(0.38, -0.25),
    new THREE.Vector2(0.58, -0.19),
    new THREE.Vector2(0.71, -0.05),
    new THREE.Vector2(0.7, 0.08),
    new THREE.Vector2(0.61, 0.17),
    new THREE.Vector2(0.57, 0.22),
    new THREE.Vector2(0.65, 0.27),
    new THREE.Vector2(0.64, 0.29),
    new THREE.Vector2(0.55, 0.28),
    new THREE.Vector2(0.53, 0.18),
    new THREE.Vector2(0.58, -0.05),
    new THREE.Vector2(0.42, -0.19),
    new THREE.Vector2(0.01, -0.2)
  ];
  addPartMesh(body, 'censer_body', new THREE.LatheGeometry(bodyPts, 64), bronzeChestnut);
  // Subtle inlaid gold lip & waist fillet
  addPartMesh(body, 'censer_body', new THREE.TorusGeometry(0.645, 0.013, 12, 64), bronzeGilt, [0, 0.28, 0], [Math.PI / 2, 0, 0]);
  addPartMesh(body, 'censer_body', new THREE.TorusGeometry(0.708, 0.011, 10, 64), bronzeGilt, [0, 0.02, 0], [Math.PI / 2, 0, 0]);
  root.add(body);

  // 4. bridge_ears (双桥耳 — organic swept bronze arches)
  const ears = new THREE.Group();
  ears.name = 'bridge_ears';
  for (const side of [-1, 1]) {
    const earCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.58, 0.2, 0),
      new THREE.Vector3(side * 0.78, 0.24, 0),
      new THREE.Vector3(side * 0.87, 0.06, 0),
      new THREE.Vector3(side * 0.8, -0.1, 0),
      new THREE.Vector3(side * 0.64, -0.06, 0)
    ]);
    addPartMesh(ears, 'bridge_ears', new THREE.TubeGeometry(earCurve, 32, 0.044, 14, false), bronzeGilt);
    addPartMesh(ears, 'bridge_ears', new THREE.SphereGeometry(0.054, 14, 14), bronzeChestnut, [side * 0.86, 0.06, 0]);
  }
  root.add(ears);

  // 5. tripod_feet (三乳鼎足 — sculpted cabriole tripod legs)
  const feet = new THREE.Group();
  feet.name = 'tripod_feet';
  const footPts = [
    new THREE.Vector2(0.005, -0.15),
    new THREE.Vector2(0.052, -0.145),
    new THREE.Vector2(0.064, -0.08),
    new THREE.Vector2(0.088, 0.04),
    new THREE.Vector2(0.115, 0.13),
    new THREE.Vector2(0.005, 0.13)
  ];
  const footGeo = new THREE.LatheGeometry(footPts, 24);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    addPartMesh(feet, 'tripod_feet', footGeo, bronzeChestnut, [Math.cos(a) * 0.39, 0, Math.sin(a) * 0.39]);
    addPartMesh(feet, 'tripod_feet', new THREE.TorusGeometry(0.065, 0.011, 10, 20), bronzeGilt, [Math.cos(a) * 0.39, -0.11, Math.sin(a) * 0.39], [Math.PI / 2, 0, 0]);
  }
  root.add(feet);

  // 6. cedar_stand (雕花海棠木座)
  const stand = new THREE.Group();
  stand.name = 'cedar_stand';
  const standPts = [
    new THREE.Vector2(0.01, -0.12),
    new THREE.Vector2(0.76, -0.12),
    new THREE.Vector2(0.78, -0.07),
    new THREE.Vector2(0.66, -0.03),
    new THREE.Vector2(0.71, 0.04),
    new THREE.Vector2(0.68, 0.09),
    new THREE.Vector2(0.58, 0.09),
    new THREE.Vector2(0.56, 0.05),
    new THREE.Vector2(0.01, 0.05)
  ];
  addPartMesh(stand, 'cedar_stand', new THREE.LatheGeometry(standPts, 16), hinokiDark);
  addPartMesh(stand, 'cedar_stand', new THREE.TorusGeometry(0.69, 0.012, 10, 32), bronzeGilt, [0, 0.08, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    addPartMesh(stand, 'cedar_stand', new THREE.BoxGeometry(0.16, 0.09, 0.16), hinokiDark, [Math.cos(a) * 0.62, -0.15, Math.sin(a) * 0.62], [0, a, 0]);
  }
  root.add(stand);

  return root;
}

/**
 * 4. Spatial Origami Pagoda (空间折纸几何塔)
 */
function buildPleatedOrigamiRing(sides, rBottom, rTop, height, pleatDepth) {
  // True alternating mountain/valley faceted origami shell (BufferGeometry)
  const positions = [];
  const uvs = [];
  const n = sides * 2;
  const ringBottom = [];
  const ringTop = [];

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const isPeak = i % 2 === 0;
    const rb = rBottom + (isPeak ? pleatDepth : -pleatDepth * 0.6);
    const rt = rTop + (isPeak ? -pleatDepth * 0.5 : pleatDepth * 0.9);
    ringBottom.push([Math.cos(a) * rb, -height * 0.5, Math.sin(a) * rb]);
    ringTop.push([Math.cos(a) * rt, height * 0.5, Math.sin(a) * rt]);
  }

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const b0 = ringBottom[i];
    const b1 = ringBottom[j];
    const t0 = ringTop[i];
    const t1 = ringTop[j];
    const u0 = i / n;
    const u1 = (i + 1) / n;

    // Triangle 1
    positions.push(...b0, ...b1, ...t1);
    uvs.push(u0, 0, u1, 0, u1, 1);
    // Triangle 2
    positions.push(...b0, ...t1, ...t0);
    uvs.push(u0, 0, u1, 1, u0, 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

function buildOrigamiPagodaScene() {
  const root = new THREE.Group();
  root.name = 'origami_pagoda';

  const titaniumDark = makeMat('titanium_dark', '#3A3631', 0.42, 0.46);
  const alabasterPaper = makeMat('alabaster_stone', '#ECEAE3', 0.03, 0.62);
  const hinokiFold = makeMat('hinoki_mid', '#D2B487', 0.05, 0.54);
  const cinnabarRib = makeMat('cinnabar_lacquer', '#D64527', 0.18, 0.3);
  const bronzeGilt = makeMat('bronze_gilt', '#C98A3A', 0.88, 0.22);

  // 1. octa_plinth (八角须弥折面基座)
  const plinth = new THREE.Group();
  plinth.name = 'octa_plinth';
  addPartMesh(plinth, 'octa_plinth', new THREE.CylinderGeometry(0.68, 0.82, 0.18, 8), titaniumDark, [0, -0.04, 0]);
  addPartMesh(plinth, 'octa_plinth', new THREE.CylinderGeometry(0.6, 0.68, 0.09, 8), hinokiFold, [0, 0.095, 0]);
  addPartMesh(plinth, 'octa_plinth', createBeveledRingGeo(0.75, 0.66, 0.025, 8), bronzeGilt, [0, 0.05, 0], [Math.PI / 2, 0, 0]);
  root.add(plinth);

  // 2. tier1_shell (初层折面筒壳 — real mountain/valley origami pleats)
  const tier1 = new THREE.Group();
  tier1.name = 'tier1_shell';
  addPartMesh(tier1, 'tier1_shell', buildPleatedOrigamiRing(8, 0.56, 0.44, 0.36, 0.075), alabasterPaper);
  addPartMesh(tier1, 'tier1_shell', buildPleatedOrigamiRing(8, 0.72, 0.42, 0.14, 0.06), alabasterPaper, [0, 0.22, 0]);
  addPartMesh(tier1, 'tier1_shell', createBeveledRingGeo(0.57, 0.52, 0.018, 8), bronzeGilt, [0, -0.17, 0], [Math.PI / 2, 0, 0]);
  root.add(tier1);

  // 3. tier2_wings (中层菱形飞檐翼 — hinoki wood pleated architectural eaves)
  const tier2 = new THREE.Group();
  tier2.name = 'tier2_wings';
  addPartMesh(tier2, 'tier2_wings', buildPleatedOrigamiRing(8, 0.46, 0.36, 0.32, 0.07), hinokiFold, [0, 0, 0], [0, Math.PI / 8, 0]);
  addPartMesh(tier2, 'tier2_wings', buildPleatedOrigamiRing(8, 0.66, 0.35, 0.15, 0.08), hinokiFold, [0, 0.18, 0], [0, Math.PI / 8, 0]);
  // 8 diamond origami wing fins
  const finGeo = new THREE.OctahedronGeometry(0.11, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    addPartMesh(tier2, 'tier2_wings', finGeo, bronzeGilt, [Math.cos(a) * 0.58, 0.13, Math.sin(a) * 0.58], [0, -a, 0], [1.6, 0.42, 0.55]);
  }
  root.add(tier2);

  // 4. waist_rib (腰檐力学锁环 — precision octagonal cinnabar locking ring)
  const rib = new THREE.Group();
  rib.name = 'waist_rib';
  addPartMesh(rib, 'waist_rib', createBeveledRingGeo(0.47, 0.36, 0.065, 8), cinnabarRib, [0, 0, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addPartMesh(rib, 'waist_rib', new THREE.CylinderGeometry(0.022, 0.022, 0.11, 10), bronzeGilt, [Math.cos(a) * 0.415, 0, Math.sin(a) * 0.415]);
  }
  root.add(rib);

  // 5. upper_dome (顶层采光折穹)
  const dome = new THREE.Group();
  dome.name = 'upper_dome';
  addPartMesh(dome, 'upper_dome', buildPleatedOrigamiRing(8, 0.36, 0.25, 0.22, 0.05), alabasterPaper, [0, -0.06, 0]);
  addPartMesh(dome, 'upper_dome', buildPleatedOrigamiRing(8, 0.48, 0.06, 0.26, 0.065), alabasterPaper, [0, 0.16, 0], [0, Math.PI / 8, 0]);
  addPartMesh(dome, 'upper_dome', new THREE.SphereGeometry(0.14, 24, 24), bronzeGilt, [0, -0.02, 0]);
  root.add(dome);

  // 6. bronze_spire (鎏金相轮塔刹 — high-res 48-segment lathe finial)
  const spire = new THREE.Group();
  spire.name = 'bronze_spire';
  const spirePts = [
    new THREE.Vector2(0.01, -0.18),
    new THREE.Vector2(0.14, -0.17),
    new THREE.Vector2(0.1, -0.09),
    new THREE.Vector2(0.04, -0.04),
    new THREE.Vector2(0.032, 0.32),
    new THREE.Vector2(0.065, 0.39),
    new THREE.Vector2(0.04, 0.44),
    new THREE.Vector2(0.005, 0.5)
  ];
  addPartMesh(spire, 'bronze_spire', new THREE.LatheGeometry(spirePts, 40), bronzeGilt);
  for (let i = 0; i < 7; i++) {
    const r = 0.115 - i * 0.011;
    addPartMesh(spire, 'bronze_spire', new THREE.TorusGeometry(r, 0.012, 10, 32), bronzeGilt, [0, -0.01 + i * 0.052, 0], [Math.PI / 2, 0, 0]);
  }
  root.add(spire);

  return root;
}

async function exportGlb(sceneObj, filename) {
  const exporter = new GLTFExporter();
  const buffer = await new Promise((resolvePromise, rejectPromise) => {
    exporter.parse(
      sceneObj,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolvePromise(Buffer.from(result));
        } else {
          rejectPromise(new Error(`Expected binary ArrayBuffer for ${filename}`));
        }
      },
      (err) => rejectPromise(err),
      { binary: true, onlyVisible: true }
    );
  });

  // Verify glTF 2.0 binary magic header "glTF" (0x46546C67)
  if (buffer.slice(0, 4).toString('ascii') !== 'glTF') {
    throw new Error(`Invalid GLB header in ${filename}`);
  }

  const androidPath = resolve(ANDROID_MODELS_DIR, filename);
  const previewPath = resolve(PREVIEW_MODELS_DIR, filename);
  writeFileSync(androidPath, buffer);
  copyFileSync(androidPath, previewPath);
  const kb = (statSync(androidPath).size / 1024).toFixed(1);
  console.log(`[GLB OK] ${filename} -> ${kb} KB (nodes: ${sceneObj.children.length}) synced to Android & WebXR`);
}

async function main() {
  const builders = [
    ['yongle_dougong.glb', buildYongleDougongScene],
    ['ming_armillary.glb', buildMingArmillaryScene],
    ['xuande_censer.glb', buildXuandeCenserScene],
    ['origami_pagoda.glb', buildOrigamiPagodaScene]
  ];
  for (const [filename, fn] of builders) {
    const root = fn();
    root.updateMatrixWorld(true);
    await exportGlb(root, filename);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
