import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ARTIFACT_CATALOG,
  type AmbientLightingTheme,
  type SpatialArtifact,
  type Vec3
} from '../data/artifacts';
import {
  CUTAWAY_MAX_OFFSET,
  CUTAWAY_MIN_OFFSET,
  computeCutawayPlaneNormal,
  computePartApproachRatio,
  evaluateSnapProximity,
  getAssemblyProgress,
  type CutawayAxis,
  type CutawayPlaneState,
  type MortiseAssemblyState
} from '../assembly/mortiseAssembly';
import {
  STUDIO_LIGHTING_ORDER,
  STUDIO_LIGHTING_PRESETS,
  computeDirectionalLightVector,
  resolveAnchorWorldPosition,
  type SpatialCalloutAnchor,
  type StudioLightingPresetId
} from '../spatial/calloutAnchors';
import { computePartPosition } from '../engine/explodedModel';
import {
  loadArtifactGlb,
  loadSharedPbrTextures,
  type LoadedArtifactRig,
  type SharedPbrTextures
} from '../three/loadArtifactGlb';
import type { CameraFocusEvent, SnapPulseEvent } from '../App';
import {
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Magnet,
  MapPin,
  RotateCcw,
  RotateCw,
  Scissors,
  Sparkles,
  Sun,
  Volume2,
  VolumeX
} from 'lucide-react';

export type StageInteractionMode = 'EXPLORE' | 'ASSEMBLY';

interface SpatialStage3DProps {
  artifact: SpatialArtifact;
  selectedPartId: string;
  comparePartId: string | null;
  stageMode: StageInteractionMode;
  explodeProgress: number;
  cutaway: CutawayPlaneState;
  assemblyState: MortiseAssemblyState;
  calloutAnchors: SpatialCalloutAnchor[];
  selectedAnchorId: string | null;
  showPinsIn3D: boolean;
  lightingPreset: StudioLightingPresetId;
  cameraFocusGoal: CameraFocusEvent | null;
  snapPulse: SnapPulseEvent | null;
  sfxMuted: boolean;
  ambientTheme: AmbientLightingTheme;
  autoOrbit: boolean;
  caliperDistanceMm: number;
  onSelectArtifact: (id: string) => void;
  onSelectPart: (partId: string) => void;
  onSelectAnchor: (anchorId: string) => void;
  onSetLightingPreset: (preset: StudioLightingPresetId) => void;
  onToggleShowPins: () => void;
  onSetStageMode: (mode: StageInteractionMode) => void;
  onChangeExplode: (progress: number) => void;
  onUpdateCutaway: (patch: Partial<CutawayPlaneState>) => void;
  onMoveAssemblyPart: (partId: string, nextPos: Vec3, nextYawDeg?: number) => void;
  onSetApproachRatio: (partId: string, ratio: number, yawDeg?: number) => void;
  onAttemptSnapPart: (partId: string, candidatePos?: Vec3, candidateYawDeg?: number) => void;
  onAssistSnapActive: () => void;
  onResetAssembly: () => void;
  onToggleSfxMuted: () => void;
  onToggleAutoOrbit: () => void;
}

interface PinVisualEntry {
  group: THREE.Group;
  orb: THREE.Mesh;
  ring: THREE.Mesh;
  stem: THREE.Line;
  partId: string;
}

const SMOKE_COUNT = 34;

const CUTAWAY_AXES: { axis: CutawayAxis; shortZh: string }[] = [
  { axis: 'Y', shortZh: '水平 Y' },
  { axis: 'X', shortZh: '纵切 X' },
  { axis: 'Z', shortZh: '立面 Z' }
];

export const SpatialStage3D: React.FC<SpatialStage3DProps> = ({
  artifact,
  selectedPartId,
  comparePartId,
  stageMode,
  explodeProgress,
  cutaway,
  assemblyState,
  calloutAnchors,
  selectedAnchorId,
  showPinsIn3D,
  lightingPreset,
  cameraFocusGoal,
  snapPulse,
  sfxMuted,
  ambientTheme,
  autoOrbit,
  caliperDistanceMm,
  onSelectArtifact,
  onSelectPart,
  onSelectAnchor,
  onSetLightingPreset,
  onToggleShowPins,
  onSetStageMode,
  onChangeExplode,
  onUpdateCutaway,
  onMoveAssemblyPart,
  onSetApproachRatio,
  onAttemptSnapPart,
  onAssistSnapActive,
  onResetAssembly,
  onToggleSfxMuted,
  onToggleAutoOrbit
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<LoadedArtifactRig | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const texturesRef = useRef<SharedPbrTextures | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 6.0));
  const sectionGroupRef = useRef<THREE.Group | null>(null);
  const caliperLineRef = useRef<THREE.Line | null>(null);
  const guideGroupRef = useRef<THREE.Group | null>(null);
  const guideOuterRingRef = useRef<THREE.Mesh | null>(null);
  const guideInnerRingRef = useRef<THREE.Mesh | null>(null);
  const guideBeamRef = useRef<THREE.Line | null>(null);
  const snapWaveRef = useRef<THREE.Mesh | null>(null);
  const pinsRootRef = useRef<THREE.Group | null>(null);
  const pinVisualsRef = useRef<Map<string, PinVisualEntry>>(new Map());
  const cameraGoalRef = useRef<{ nonce: number; yaw: number; pitch: number; zoom: number } | null>(null);
  const snapAnimRef = useRef<{ startSec: number; nonce: number; isComplete: boolean; partId: string; pos: Vec3 }>({
    startSec: -10,
    nonce: 0,
    isComplete: false,
    partId: '',
    pos: { x: 0, y: 0, z: 0 }
  });
  const smokePointsRef = useRef<THREE.Points | null>(null);
  const smokeMetaRef = useRef<{ phase: number; radius: number; speed: number; curl: number }[]>([]);
  const orbitRef = useRef({
    yaw: 0.56,
    pitch: 0.25,
    zoom: 4.15,
    dragging: false,
    lastX: 0,
    lastY: 0,
    moved: false
  });
  const partDragRef = useRef<{
    active: boolean;
    partId: string | null;
    plane: THREE.Plane;
    offset: THREE.Vector3;
    lastPos: Vec3 | null;
  }>({
    active: false,
    partId: null,
    plane: new THREE.Plane(),
    offset: new THREE.Vector3(),
    lastPos: null
  });
  const [glbReady, setGlbReady] = useState<boolean>(false);

  const progress = useMemo(() => getAssemblyProgress(assemblyState), [assemblyState]);
  const activeStep = progress.activeStep;
  const activeRuntime = activeStep ? assemblyState.parts[activeStep.partId] : null;
  const activeProximity = useMemo(() => {
    if (!activeStep) return null;
    return evaluateSnapProximity(assemblyState, activeStep.partId);
  }, [assemblyState, activeStep]);
  const activeApproachPct = useMemo(() => {
    if (!activeStep) return 100;
    return Math.round(computePartApproachRatio(assemblyState, activeStep.partId) * 100);
  }, [assemblyState, activeStep]);
  const selectedAnchor = useMemo(
    () => calloutAnchors.find((a) => a.id === selectedAnchorId) ?? null,
    [calloutAnchors, selectedAnchorId]
  );

  const propsRef = useRef({
    artifact,
    selectedPartId,
    comparePartId,
    stageMode,
    explodeProgress,
    cutaway,
    assemblyState,
    calloutAnchors,
    selectedAnchorId,
    showPinsIn3D,
    lightingPreset,
    cameraFocusGoal,
    snapPulse,
    ambientTheme,
    autoOrbit,
    onSelectPart,
    onSelectAnchor,
    onMoveAssemblyPart,
    onAttemptSnapPart
  });
  propsRef.current = {
    artifact,
    selectedPartId,
    comparePartId,
    stageMode,
    explodeProgress,
    cutaway,
    assemblyState,
    calloutAnchors,
    selectedAnchorId,
    showPinsIn3D,
    lightingPreset,
    cameraFocusGoal,
    snapPulse,
    ambientTheme,
    autoOrbit,
    onSelectPart,
    onSelectAnchor,
    onMoveAssemblyPart,
    onAttemptSnapPart
  };

  // Initialize Three.js PBR Stage + RoomEnvironment IBL + 3-Preset Studio Lighting + Spatial Callout Pins
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 760;
    const height = container.clientHeight || 480;
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 32);
    camera.position.set(0, 0.48, 4.15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const sharedTextures = loadSharedPbrTextures(renderer.capabilities.getMaxAnisotropy());
    texturesRef.current = sharedTextures;

    // 3-Preset Warm Architectural Studio Light Rig (Strictly zero blue/cyan/teal/purple)
    const hemi = new THREE.HemisphereLight(0xfaf7f1, 0x625a4e, 0.94);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff6e8, 1.95);
    const initDir = computeDirectionalLightVector('KYOTO_MORNING', 5.8);
    keyLight.position.set(initDir.x, initDir.y, initDir.z);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 16.0;
    keyLight.shadow.camera.left = -2.6;
    keyLight.shadow.camera.right = 2.6;
    keyLight.shadow.camera.top = 2.6;
    keyLight.shadow.camera.bottom = -2.6;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe6bd80, 1.05);
    rimLight.position.set(-3.4, 2.2, -2.8);
    scene.add(rimLight);

    const emberFill = new THREE.PointLight(0xd98548, 0.45, 9.5);
    emberFill.position.set(-1.4, -0.7, 2.2);
    scene.add(emberFill);

    // Pedestal & soft shadow receiver
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -1.32, 0);

    const shadowPlane = new THREE.Mesh(
      new THREE.CircleGeometry(1.75, 64),
      new THREE.ShadowMaterial({ opacity: 0.24 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    pedestalGroup.add(shadowPlane);

    const outerBronzeRing = new THREE.Mesh(
      new THREE.RingGeometry(1.18, 1.2, 72),
      new THREE.MeshBasicMaterial({
        color: 0xc98a3a,
        transparent: true,
        opacity: 0.44,
        side: THREE.DoubleSide
      })
    );
    outerBronzeRing.rotation.x = -Math.PI / 2;
    outerBronzeRing.position.y = 0.003;
    pedestalGroup.add(outerBronzeRing);

    const innerTitaniumRing = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.735, 56),
      new THREE.MeshBasicMaterial({
        color: 0x7b766e,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      })
    );
    innerTitaniumRing.rotation.x = -Math.PI / 2;
    innerTitaniumRing.position.y = 0.002;
    pedestalGroup.add(innerTitaniumRing);
    scene.add(pedestalGroup);

    // Real-Time Multi-Axis Architectural Cutaway Ring + Disc
    const sectionGroup = new THREE.Group();
    const sectionDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.26, 72),
      new THREE.MeshBasicMaterial({
        color: 0xd64527,
        transparent: true,
        opacity: 0.11,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    sectionGroup.add(sectionDisc);

    const sectionRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.26, 0.014, 12, 72),
      new THREE.MeshBasicMaterial({
        color: 0xc98a3a,
        transparent: true,
        opacity: 0.85
      })
    );
    sectionGroup.add(sectionRim);
    sectionGroup.visible = false;
    scene.add(sectionGroup);
    sectionGroupRef.current = sectionGroup;

    // 3D Spatial Callout Pins Root Container
    const pinsRoot = new THREE.Group();
    pinsRoot.name = 'spatial_callout_pins_root';
    scene.add(pinsRoot);
    pinsRootRef.current = pinsRoot;

    // Copper-Gold Magnetic Snap Target Guide Ring
    const guideGroup = new THREE.Group();
    const guideOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.02, 16, 64),
      new THREE.MeshBasicMaterial({
        color: 0xc98a3a,
        transparent: true,
        opacity: 0.92
      })
    );
    guideOuter.rotation.x = Math.PI / 2;
    guideGroup.add(guideOuter);
    guideOuterRingRef.current = guideOuter;

    const guideInner = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.34, 48),
      new THREE.MeshBasicMaterial({
        color: 0xe6b86a,
        transparent: true,
        opacity: 0.56,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    guideInner.rotation.x = -Math.PI / 2;
    guideGroup.add(guideInner);
    guideInnerRingRef.current = guideInner;

    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.016, 0.022),
        new THREE.MeshBasicMaterial({ color: 0xd64527 })
      );
      tick.position.set(Math.cos(ang) * 0.52, 0, Math.sin(ang) * 0.52);
      tick.rotation.y = -ang;
      guideGroup.add(tick);
    }

    guideGroup.visible = false;
    scene.add(guideGroup);
    guideGroupRef.current = guideGroup;

    const guideBeamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.5, 0)
    ]);
    const guideBeamMat = new THREE.LineBasicMaterial({
      color: 0xc98a3a,
      transparent: true,
      opacity: 0.72
    });
    const guideBeam = new THREE.Line(guideBeamGeo, guideBeamMat);
    guideBeam.visible = false;
    scene.add(guideBeam);
    guideBeamRef.current = guideBeam;

    const snapWave = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.022, 16, 64),
      new THREE.MeshBasicMaterial({
        color: 0xe8b968,
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    snapWave.rotation.x = Math.PI / 2;
    snapWave.visible = false;
    scene.add(snapWave);
    snapWaveRef.current = snapWave;

    const caliperGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.5, 0)
    ]);
    const caliperMat = new THREE.LineBasicMaterial({ color: 0xd64527 });
    const caliperLine = new THREE.Line(caliperGeo, caliperMat);
    caliperLine.visible = false;
    scene.add(caliperLine);
    caliperLineRef.current = caliperLine;

    // Incense smoke particle system
    const smokePositions = new Float32Array(SMOKE_COUNT * 3);
    const smokeMeta: { phase: number; radius: number; speed: number; curl: number }[] = [];
    for (let i = 0; i < SMOKE_COUNT; i++) {
      smokeMeta.push({
        phase: i / SMOKE_COUNT,
        radius: 0.04 + (i % 5) * 0.024,
        speed: 0.18 + (i % 4) * 0.035,
        curl: 1.6 + (i % 6) * 0.35
      });
    }
    smokeMetaRef.current = smokeMeta;
    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({
      size: 0.34,
      map: sharedTextures.smokeSprite,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const smokePoints = new THREE.Points(smokeGeo, smokeMat);
    smokePoints.visible = false;
    scene.add(smokePoints);
    smokePointsRef.current = smokePoints;

    // Pointer interaction: 3D Pin click (priority) + 3D mortise part drag + 360° orbit
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hitPoint = new THREE.Vector3();

    const updatePointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (ev: PointerEvent) => {
      const p = propsRef.current;
      updatePointer(ev);
      cameraGoalRef.current = null;

      if (p.stageMode === 'ASSEMBLY' && rigRef.current) {
        raycaster.setFromCamera(pointer, camera);
        const hittingPin =
          p.showPinsIn3D &&
          pinsRootRef.current &&
          raycaster
            .intersectObjects(pinsRootRef.current.children, true)
            .some((h) => typeof h.object.userData.anchorId === 'string');
        if (!hittingPin) {
          const hits = raycaster.intersectObjects(rigRef.current.root.children, true);
          const hitPart = hits.find((h) => typeof h.object.userData.partId === 'string');
          if (hitPart) {
            const hitId = hitPart.object.userData.partId as string;
            const prog = getAssemblyProgress(p.assemblyState);
            const runtime = p.assemblyState.parts[hitId];
            if (prog.activePartId === hitId && runtime && !runtime.locked) {
              const camNormal = new THREE.Vector3();
              camera.getWorldDirection(camNormal);
              const anchorWorld = new THREE.Vector3(runtime.position.x, runtime.position.y, runtime.position.z);
              partDragRef.current.plane.setFromNormalAndCoplanarPoint(camNormal.negate(), anchorWorld);
              if (raycaster.ray.intersectPlane(partDragRef.current.plane, hitPoint)) {
                partDragRef.current.offset.copy(anchorWorld).sub(hitPoint);
              } else {
                partDragRef.current.offset.set(0, 0, 0);
              }
              partDragRef.current.active = true;
              partDragRef.current.partId = hitId;
              partDragRef.current.lastPos = runtime.position;
              renderer.domElement.setPointerCapture(ev.pointerId);
              return;
            }
          }
        }
      }

      orbitRef.current.dragging = true;
      orbitRef.current.moved = false;
      orbitRef.current.lastX = ev.clientX;
      orbitRef.current.lastY = ev.clientY;
      renderer.domElement.setPointerCapture(ev.pointerId);
    };

    const onPointerMove = (ev: PointerEvent) => {
      const p = propsRef.current;
      if (partDragRef.current.active && partDragRef.current.partId) {
        updatePointer(ev);
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(partDragRef.current.plane, hitPoint)) {
          hitPoint.add(partDragRef.current.offset);
          const nextPos: Vec3 = { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z };
          partDragRef.current.lastPos = nextPos;
          p.onMoveAssemblyPart(partDragRef.current.partId, nextPos);
        }
        return;
      }

      if (!orbitRef.current.dragging) return;
      const dx = ev.clientX - orbitRef.current.lastX;
      const dy = ev.clientY - orbitRef.current.lastY;
      if (Math.hypot(dx, dy) > 3) orbitRef.current.moved = true;
      orbitRef.current.lastX = ev.clientX;
      orbitRef.current.lastY = ev.clientY;
      orbitRef.current.yaw += dx * 0.0085;
      orbitRef.current.pitch = Math.max(-1.02, Math.min(1.02, orbitRef.current.pitch + dy * 0.007));
    };

    const onPointerUp = (ev: PointerEvent) => {
      const p = propsRef.current;
      if (partDragRef.current.active && partDragRef.current.partId) {
        const draggedId = partDragRef.current.partId;
        const dropPos = partDragRef.current.lastPos ?? undefined;
        partDragRef.current.active = false;
        partDragRef.current.partId = null;
        partDragRef.current.lastPos = null;
        if (renderer.domElement.hasPointerCapture(ev.pointerId)) {
          renderer.domElement.releasePointerCapture(ev.pointerId);
        }
        p.onAttemptSnapPart(draggedId, dropPos);
        return;
      }

      const wasClick = orbitRef.current.dragging && !orbitRef.current.moved;
      orbitRef.current.dragging = false;
      if (renderer.domElement.hasPointerCapture(ev.pointerId)) {
        renderer.domElement.releasePointerCapture(ev.pointerId);
      }
      if (wasClick) {
        updatePointer(ev);
        raycaster.setFromCamera(pointer, camera);

        // Priority 1: Direct 3D Spatial Callout Pin hit -> push camera & sync right inspector!
        if (p.showPinsIn3D && pinsRootRef.current) {
          const pinHits = raycaster.intersectObjects(pinsRootRef.current.children, true);
          const hitPin = pinHits.find((h) => typeof h.object.userData.anchorId === 'string');
          if (hitPin) {
            p.onSelectAnchor(hitPin.object.userData.anchorId as string);
            return;
          }
        }

        // Priority 2: Direct GLB structural part pick
        if (rigRef.current) {
          const hits = raycaster.intersectObjects(rigRef.current.root.children, true);
          const hitPart = hits.find((h) => typeof h.object.userData.partId === 'string');
          if (hitPart) {
            const hitId = hitPart.object.userData.partId as string;
            p.onSelectPart(hitId);
            if (p.stageMode === 'ASSEMBLY') {
              const rt = p.assemblyState.parts[hitId];
              if (rt && !rt.locked) {
                p.onAttemptSnapPart(hitId);
              }
            }
          }
        }
      }
    };

    const onPointerCancel = (ev: PointerEvent) => {
      partDragRef.current.active = false;
      partDragRef.current.partId = null;
      partDragRef.current.lastPos = null;
      orbitRef.current.dragging = false;
      if (renderer.domElement.hasPointerCapture(ev.pointerId)) {
        renderer.domElement.releasePointerCapture(ev.pointerId);
      }
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      cameraGoalRef.current = null;
      orbitRef.current.zoom = Math.max(2.4, Math.min(5.2, orbitRef.current.zoom + ev.deltaY * 0.002));
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerCancel);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 760;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    const clock = new THREE.Clock();
    const targetKeyPos = new THREE.Vector3();
    const targetKeyColor = new THREE.Color();
    const targetRimColor = new THREE.Color();
    const targetHemiSky = new THREE.Color();
    const targetHemiGround = new THREE.Color();
    const targetEmberColor = new THREE.Color();

    const animate = () => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, clock.getDelta());
      const elapsed = clock.elapsedTime;
      const p = propsRef.current;

      // Consume incoming camera focus target from 3D/panel anchor selection
      if (p.cameraFocusGoal && (!cameraGoalRef.current || cameraGoalRef.current.nonce !== p.cameraFocusGoal.nonce)) {
        cameraGoalRef.current = {
          nonce: p.cameraFocusGoal.nonce,
          yaw: p.cameraFocusGoal.target.yawRad,
          pitch: p.cameraFocusGoal.target.pitchRad,
          zoom: p.cameraFocusGoal.target.zoom
        };
      }

      if (cameraGoalRef.current && !orbitRef.current.dragging && !partDragRef.current.active) {
        const g = cameraGoalRef.current;
        const ease = Math.min(1, dt * 6.5);
        const yawDelta = Math.atan2(
          Math.sin(g.yaw - orbitRef.current.yaw),
          Math.cos(g.yaw - orbitRef.current.yaw)
        );
        orbitRef.current.yaw += yawDelta * ease;
        orbitRef.current.pitch += (g.pitch - orbitRef.current.pitch) * ease;
        orbitRef.current.zoom += (g.zoom - orbitRef.current.zoom) * ease;
        if (
          Math.abs(yawDelta) < 0.008 &&
          Math.abs(g.pitch - orbitRef.current.pitch) < 0.008 &&
          Math.abs(g.zoom - orbitRef.current.zoom) < 0.012
        ) {
          cameraGoalRef.current = null;
        }
      } else if (p.autoOrbit && !orbitRef.current.dragging && !partDragRef.current.active) {
        orbitRef.current.yaw += dt * 0.28;
      }

      const modeZoomBoost = p.stageMode === 'ASSEMBLY' ? 1.18 : p.explodeProgress * 1.48;
      const r = orbitRef.current.zoom + modeZoomBoost;
      const pitch = orbitRef.current.pitch;
      const yaw = orbitRef.current.yaw;
      camera.position.set(
        r * Math.cos(pitch) * Math.sin(yaw),
        r * Math.sin(pitch) + (p.stageMode === 'ASSEMBLY' ? 0.22 : 0.05),
        r * Math.cos(pitch) * Math.cos(yaw)
      );
      camera.lookAt(0, p.stageMode === 'ASSEMBLY' ? 0.14 : -0.05, 0);

      // Live 3-Preset Architectural Museum Studio Directional Lighting Rig
      const studioSpec = STUDIO_LIGHTING_PRESETS[p.lightingPreset] ?? STUDIO_LIGHTING_PRESETS.KYOTO_MORNING;
      const lightDir = computeDirectionalLightVector(p.lightingPreset, 5.8);
      const lightLerp = Math.min(1, dt * 7.5);
      targetKeyPos.set(lightDir.x, lightDir.y, lightDir.z);
      keyLight.position.lerp(targetKeyPos, lightLerp);

      // Gentle candle flicker in WARM_LANTERN studio preset
      const flicker = p.lightingPreset === 'WARM_LANTERN' ? 1 + 0.045 * Math.sin(elapsed * 7.2) : 1;
      targetKeyColor.setHex(studioSpec.keyColorHex);
      targetRimColor.setHex(studioSpec.rimColorHex);
      targetHemiSky.setHex(studioSpec.hemiSkyHex);
      targetHemiGround.setHex(studioSpec.hemiGroundHex);
      targetEmberColor.setHex(studioSpec.emberColorHex);

      keyLight.color.lerp(targetKeyColor, lightLerp);
      keyLight.intensity += (studioSpec.keyIntensity * flicker - keyLight.intensity) * lightLerp;
      rimLight.color.lerp(targetRimColor, lightLerp);
      rimLight.intensity += (studioSpec.rimIntensity - rimLight.intensity) * lightLerp;
      hemi.color.lerp(targetHemiSky, lightLerp);
      hemi.groundColor.lerp(targetHemiGround, lightLerp);
      hemi.intensity += (studioSpec.hemiIntensity - hemi.intensity) * lightLerp;
      emberFill.color.lerp(targetEmberColor, lightLerp);
      emberFill.intensity += (studioSpec.emberIntensity * flicker - emberFill.intensity) * lightLerp;
      renderer.toneMappingExposure += (studioSpec.exposure - renderer.toneMappingExposure) * lightLerp;

      // Multi-axis cutaway plane
      const cutNormal = computeCutawayPlaneNormal(p.cutaway.axis);
      clipPlaneRef.current.normal.set(cutNormal.x, cutNormal.y, cutNormal.z);
      clipPlaneRef.current.constant = p.cutaway.enabled ? p.cutaway.offsetMeters : 6.0;
      if (sectionGroupRef.current) {
        sectionGroupRef.current.visible = p.cutaway.enabled;
        if (p.cutaway.axis === 'Y') {
          sectionGroupRef.current.position.set(0, p.cutaway.offsetMeters, 0);
          sectionGroupRef.current.rotation.set(-Math.PI / 2, 0, 0);
        } else if (p.cutaway.axis === 'X') {
          sectionGroupRef.current.position.set(p.cutaway.offsetMeters, 0, 0);
          sectionGroupRef.current.rotation.set(0, Math.PI / 2, 0);
        } else {
          sectionGroupRef.current.position.set(0, 0, p.cutaway.offsetMeters);
          sectionGroupRef.current.rotation.set(0, 0, 0);
        }
      }

      // Snap-lock golden pulse wave
      if (p.snapPulse && p.snapPulse.nonce !== snapAnimRef.current.nonce) {
        snapAnimRef.current = {
          startSec: elapsed,
          nonce: p.snapPulse.nonce,
          isComplete: p.snapPulse.isComplete,
          partId: p.snapPulse.partId,
          pos: p.snapPulse.position
        };
      }
      const pulseAge = elapsed - snapAnimRef.current.startSec;
      const pulseDur = snapAnimRef.current.isComplete ? 1.15 : 0.72;
      if (snapWaveRef.current) {
        if (pulseAge >= 0 && pulseAge < pulseDur) {
          const t = pulseAge / pulseDur;
          const ease = 1 - Math.pow(1 - t, 3);
          const scale = 1 + ease * (snapAnimRef.current.isComplete ? 3.8 : 2.1);
          snapWaveRef.current.visible = true;
          snapWaveRef.current.position.set(
            snapAnimRef.current.pos.x,
            snapAnimRef.current.pos.y,
            snapAnimRef.current.pos.z
          );
          snapWaveRef.current.scale.set(scale, scale, scale);
          const wMat = snapWaveRef.current.material as THREE.MeshBasicMaterial;
          wMat.opacity = (1 - t) * 0.92;
        } else {
          snapWaveRef.current.visible = false;
        }
      }

      const rig = rigRef.current;
      if (rig) {
        let selWorld: THREE.Vector3 | null = null;
        let cmpWorld: THREE.Vector3 | null = null;
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 3.8);
        const prog = getAssemblyProgress(p.assemblyState);
        const activeStepNow = prog.activeStep;
        const proxNow = activeStepNow ? evaluateSnapProximity(p.assemblyState, activeStepNow.partId) : null;

        for (const part of p.artifact.parts) {
          const node = rig.partGroups.get(part.id);
          if (!node) continue;

          if (p.stageMode === 'ASSEMBLY') {
            const rt = p.assemblyState.parts[part.id];
            const targetPos = rt ? rt.position : part.basePosition;
            const targetYawRad = rt ? (rt.yawDeg * Math.PI) / 180 : 0;
            const isActiveStep = activeStepNow?.partId === part.id;
            const isLocked = Boolean(rt?.locked);
            const lerpRate = partDragRef.current.active && partDragRef.current.partId === part.id ? 0.65 : Math.min(1, dt * 12);

            node.position.lerp(new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z), lerpRate);
            const yawDiff = Math.atan2(
              Math.sin(targetYawRad - node.rotation.y),
              Math.cos(targetYawRad - node.rotation.y)
            );
            node.rotation.y += yawDiff * Math.min(1, dt * 12);
            const targetScale = isActiveStep ? 1.045 : 1.0;
            node.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, dt * 10));

            const justSnapped = snapAnimRef.current.partId === part.id && pulseAge >= 0 && pulseAge < pulseDur;
            const mats = rig.partMaterials.get(part.id) ?? [];
            for (const m of mats) {
              m.envMapIntensity = studioSpec.envMapIntensity;
              if (justSnapped) {
                m.emissive.setHex(0xe8b968);
                m.emissiveIntensity = (1 - pulseAge / pulseDur) * 0.58;
              } else if (isActiveStep) {
                m.emissive.setHex(proxNow?.canSnap ? 0xe6b86a : 0xd64527);
                m.emissiveIntensity = 0.14 + pulse * 0.12;
              } else if (isLocked) {
                m.emissive.setHex(0xc98a3a);
                m.emissiveIntensity = 0.04;
              } else {
                m.emissive.setHex(0x000000);
                m.emissiveIntensity = 0;
              }
            }
          } else {
            const target = computePartPosition(part, p.explodeProgress);
            const isSelected = part.id === p.selectedPartId;
            const floatOffset = isSelected ? Math.sin(elapsed * 2.4) * 0.02 : 0;

            node.position.lerp(
              new THREE.Vector3(target.x, target.y + floatOffset, target.z),
              Math.min(1, dt * 11)
            );
            node.rotation.y += (0 - node.rotation.y) * Math.min(1, dt * 10);
            const targetScale = isSelected ? 1.038 : 1.0;
            node.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, dt * 10));

            if (part.id === p.selectedPartId) selWorld = node.position.clone();
            if (part.id === p.comparePartId) cmpWorld = node.position.clone();

            const mats = rig.partMaterials.get(part.id) ?? [];
            for (const m of mats) {
              m.envMapIntensity = studioSpec.envMapIntensity;
              if (isSelected) {
                m.emissive.setHex(0xd64527);
                m.emissiveIntensity = 0.16 + pulse * 0.12;
              } else if (part.id === p.comparePartId) {
                m.emissive.setHex(0xc98a3a);
                m.emissiveIntensity = 0.08;
              } else {
                m.emissive.setHex(0x000000);
                m.emissiveIntensity = 0;
              }
            }
          }
        }

        // Update 3D Spatial Callout Pins tracking their live bound GLB part positions
        if (pinsRootRef.current) {
          pinsRootRef.current.visible = p.showPinsIn3D;
          if (p.showPinsIn3D) {
            for (const anchor of p.calloutAnchors) {
              const entry = pinVisualsRef.current.get(anchor.id);
              if (!entry) continue;
              const boundNode = rig.partGroups.get(anchor.partId);
              const partPos: Vec3 = boundNode
                ? { x: boundNode.position.x, y: boundNode.position.y, z: boundNode.position.z }
                : { x: 0, y: 0, z: 0 };
              const pinWorld = resolveAnchorWorldPosition(anchor, partPos);
              const isSelectedPin = anchor.id === p.selectedAnchorId;
              const bob = isSelectedPin ? Math.sin(elapsed * 3.4) * 0.018 : 0;

              entry.orb.position.set(pinWorld.x, pinWorld.y + bob, pinWorld.z);
              entry.ring.position.set(pinWorld.x, pinWorld.y + bob, pinWorld.z);
              entry.ring.lookAt(camera.position);

              const orbScale = isSelectedPin ? 1.32 + pulse * 0.14 : 1.0;
              entry.orb.scale.set(orbScale, orbScale, orbScale);
              const ringScale = isSelectedPin ? 1.25 + pulse * 0.25 : 0.92;
              entry.ring.scale.set(ringScale, ringScale, ringScale);

              const ringMat = entry.ring.material as THREE.MeshBasicMaterial;
              ringMat.opacity = isSelectedPin ? 0.95 : 0.45;
              const stemMat = entry.stem.material as THREE.LineBasicMaterial;
              stemMat.opacity = isSelectedPin ? 0.95 : 0.52;

              const stemAttr = entry.stem.geometry.getAttribute('position') as THREE.BufferAttribute;
              stemAttr.setXYZ(0, partPos.x, partPos.y, partPos.z);
              stemAttr.setXYZ(1, pinWorld.x, pinWorld.y + bob, pinWorld.z);
              stemAttr.needsUpdate = true;
            }
          }
        }

        // Magnetic Copper-Gold Guide Ring
        if (guideGroupRef.current && guideBeamRef.current) {
          if (p.stageMode === 'ASSEMBLY' && activeStepNow) {
            const tp = activeStepNow.targetPosition;
            guideGroupRef.current.visible = true;
            guideGroupRef.current.position.set(tp.x, tp.y, tp.z);
            guideGroupRef.current.rotation.y = elapsed * 0.55;
            const ready = Boolean(proxNow?.canSnap);
            const ringScale = ready ? 1.08 + pulse * 0.07 : 0.96 + pulse * 0.05;
            guideGroupRef.current.scale.set(ringScale, ringScale, ringScale);

            if (guideOuterRingRef.current) {
              const om = guideOuterRingRef.current.material as THREE.MeshBasicMaterial;
              om.color.setHex(ready ? 0xf0c878 : 0xc98a3a);
              om.opacity = ready ? 0.96 : 0.82;
            }
            if (guideInnerRingRef.current) {
              const im = guideInnerRingRef.current.material as THREE.MeshBasicMaterial;
              im.opacity = ready ? 0.72 : 0.42;
            }

            const activeNode = rig.partGroups.get(activeStepNow.partId);
            if (activeNode) {
              guideBeamRef.current.visible = true;
              const bAttr = guideBeamRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
              bAttr.setXYZ(0, activeNode.position.x, activeNode.position.y, activeNode.position.z);
              bAttr.setXYZ(1, tp.x, tp.y, tp.z);
              bAttr.needsUpdate = true;
            } else {
              guideBeamRef.current.visible = false;
            }
          } else {
            guideGroupRef.current.visible = false;
            guideBeamRef.current.visible = false;
          }
        }

        if (caliperLineRef.current) {
          if (
            p.stageMode === 'EXPLORE' &&
            selWorld &&
            cmpWorld &&
            p.comparePartId &&
            p.comparePartId !== p.selectedPartId
          ) {
            caliperLineRef.current.visible = true;
            const posAttr = caliperLineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
            posAttr.setXYZ(0, selWorld.x, selWorld.y, selWorld.z);
            posAttr.setXYZ(1, cmpWorld.x, cmpWorld.y, cmpWorld.z);
            posAttr.needsUpdate = true;
          } else {
            caliperLineRef.current.visible = false;
          }
        }

        if (smokePointsRef.current) {
          const isCenser = p.artifact.id === 'xuande_censer';
          smokePointsRef.current.visible = isCenser;
          if (isCenser) {
            const trayNode = rig.partGroups.get('incense_tray');
            const baseY = trayNode ? trayNode.position.y + 0.08 : 0.24;
            const attr = smokePointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
            for (let i = 0; i < SMOKE_COUNT; i++) {
              const meta = smokeMetaRef.current[i];
              const life = (elapsed * meta.speed + meta.phase) % 1.0;
              const rise = life * 1.45;
              const sway = (0.04 + life * 0.22) * Math.sin(elapsed * meta.curl + i * 0.7);
              const driftZ = (0.04 + life * 0.18) * Math.cos(elapsed * meta.curl * 0.8 + i * 0.9);
              attr.setXYZ(i, sway + Math.cos(i) * meta.radius * (1 - life * 0.4), baseY + rise, driftZ);
            }
            attr.needsUpdate = true;
            const smMat = smokePointsRef.current.material as THREE.PointsMaterial;
            smMat.opacity = p.lightingPreset === 'WARM_LANTERN' || p.ambientTheme === 'CANDLELIGHT' ? 0.36 : 0.45;
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (rigRef.current) {
        scene.remove(rigRef.current.root);
        rigRef.current.dispose();
        rigRef.current = null;
      }
      const disposeTree = (obj: THREE.Object3D | null) => {
        if (!obj) return;
        obj.traverse((child) => {
          const renderable = child as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
          renderable.geometry?.dispose();
          if (Array.isArray(renderable.material)) {
            renderable.material.forEach((m) => m.dispose());
          } else {
            renderable.material?.dispose();
          }
        });
      };
      disposeTree(pinsRoot);
      pinVisualsRef.current.clear();
      pinsRootRef.current = null;
      disposeTree(pedestalGroup);
      disposeTree(sectionGroup);
      disposeTree(guideGroup);
      disposeTree(guideBeam);
      disposeTree(snapWave);
      disposeTree(caliperLine);
      disposeTree(smokePoints);
      sharedTextures.dispose();
      envRT.dispose();
      renderer.dispose();
    };
  }, []);

  // Sync 3D Spatial Callout Pin meshes whenever calloutAnchors change (exhibit switch or custom pin added/deleted)
  useEffect(() => {
    const root = pinsRootRef.current;
    if (!root) return;

    const disposePins = () => {
      for (const entry of pinVisualsRef.current.values()) {
        root.remove(entry.group);
        entry.orb.geometry.dispose();
        (entry.orb.material as THREE.Material).dispose();
        entry.ring.geometry.dispose();
        (entry.ring.material as THREE.Material).dispose();
        entry.stem.geometry.dispose();
        (entry.stem.material as THREE.Material).dispose();
      }
      pinVisualsRef.current.clear();
    };
    disposePins();

    const rig = rigRef.current;
    for (const anchor of calloutAnchors) {
      const group = new THREE.Group();
      const baseColor = anchor.tone === 'CINNABAR' ? 0xd64527 : 0xc98a3a;
      const ringColor = anchor.tone === 'CINNABAR' ? 0xf2d194 : 0xd64527;

      const boundNode = rig?.partGroups.get(anchor.partId);
      const partPos: Vec3 = boundNode
        ? { x: boundNode.position.x, y: boundNode.position.y, z: boundNode.position.z }
        : { x: 0, y: 0, z: 0 };
      const pinWorld = resolveAnchorWorldPosition(anchor, partPos);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.056, 20, 20),
        new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive: baseColor,
          emissiveIntensity: 0.32,
          roughness: 0.28,
          metalness: 0.45
        })
      );
      orb.position.set(pinWorld.x, pinWorld.y, pinWorld.z);
      orb.userData.anchorId = anchor.id;

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.092, 0.013, 12, 32),
        new THREE.MeshBasicMaterial({
          color: ringColor,
          transparent: true,
          opacity: 0.68
        })
      );
      ring.position.set(pinWorld.x, pinWorld.y, pinWorld.z);
      ring.userData.anchorId = anchor.id;

      const stemGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(partPos.x, partPos.y, partPos.z),
        new THREE.Vector3(pinWorld.x, pinWorld.y, pinWorld.z)
      ]);
      const stem = new THREE.Line(
        stemGeo,
        new THREE.LineBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: 0.7
        })
      );

      group.add(stem);
      group.add(orb);
      group.add(ring);
      root.add(group);
      pinVisualsRef.current.set(anchor.id, { group, orb, ring, stem, partId: anchor.partId });
    }

    return () => {
      disposePins();
    };
  }, [calloutAnchors]);

  // Reset drag & pulse on exhibit/mode change
  useEffect(() => {
    partDragRef.current.active = false;
    partDragRef.current.partId = null;
    partDragRef.current.lastPos = null;
    snapAnimRef.current.startSec = -10;
    snapAnimRef.current.partId = '';
  }, [artifact.id, stageMode]);

  // Load real binary .glb artifact model whenever exhibit changes
  useEffect(() => {
    let cancelled = false;
    const scene = sceneRef.current;
    const textures = texturesRef.current;
    if (!scene || !textures) return;

    setGlbReady(false);
    loadArtifactGlb(artifact, textures, [clipPlaneRef.current])
      .then((nextRig) => {
        if (cancelled) {
          nextRig.dispose();
          return;
        }
        if (rigRef.current) {
          scene.remove(rigRef.current.root);
          rigRef.current.dispose();
        }
        for (const part of artifact.parts) {
          const node = nextRig.partGroups.get(part.id);
          if (node) {
            const p = propsRef.current;
            const initPos =
              p.stageMode === 'ASSEMBLY' && p.assemblyState.parts[part.id]
                ? p.assemblyState.parts[part.id].position
                : computePartPosition(part, p.explodeProgress);
            node.position.set(initPos.x, initPos.y, initPos.z);
          }
        }
        scene.add(nextRig.root);
        rigRef.current = nextRig;
        setGlbReady(true);
        if (rendererRef.current && cameraRef.current) {
          rendererRef.current.render(scene, cameraRef.current);
        }
      })
      .catch((err) => {
        console.error('Failed to load GLB artifact:', artifact.glbPath, err);
      });

    return () => {
      cancelled = true;
    };
  }, [artifact]);

  const explodePct = Math.round(explodeProgress * 100);
  const progressPct = Math.round(progress.progressRatio * 100);
  const activeYawVal = activeRuntime ? Math.round(activeRuntime.yawDeg) : 0;

  const handleCycleNextAnchor = () => {
    if (calloutAnchors.length === 0) return;
    const idx = calloutAnchors.findIndex((a) => a.id === selectedAnchorId);
    const next = calloutAnchors[(idx + 1) % calloutAnchors.length];
    onSelectAnchor(next.id);
  };

  return (
    <section
      className="spatial-panel stage-panel"
      aria-label="主窗口 A：3D 空间器物与榫卯拆解台"
      data-testid="panel-stage-center"
      data-glb-ready={glbReady ? 'true' : 'false'}
      data-stage-mode={stageMode}
      data-lighting-preset={lightingPreset}
    >
      <header className="panel-header">
        <div>
          <h2 className="panel-title">{artifact.titleZh}</h2>
          <p className="panel-subtitle">
            {artifact.subtitleZh}，{artifact.eraZh}
          </p>
        </div>
        <div className="stage-telemetry">
          <div className="mode-segmented" role="tablist" aria-label="交互模式切换">
            <button
              type="button"
              role="tab"
              aria-selected={stageMode === 'EXPLORE'}
              data-testid="mode-explore-btn"
              className={`mode-seg-btn ${stageMode === 'EXPLORE' ? 'active' : ''}`}
              onClick={() => onSetStageMode('EXPLORE')}
            >
              <Layers size={12} />
              <span>拆解巡览</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={stageMode === 'ASSEMBLY'}
              data-testid="mode-assembly-btn"
              className={`mode-seg-btn ${stageMode === 'ASSEMBLY' ? 'active' : ''}`}
              onClick={() => onSetStageMode('ASSEMBLY')}
            >
              <Magnet size={12} />
              <span>榫卯磁吸拼装</span>
            </button>
          </div>

          <span className="telemetry-pill">
            <Compass size={13} />
            <span>
              {stageMode === 'ASSEMBLY'
                ? `咬合 ${progress.lockedCount}/${progress.totalSteps}`
                : `卡尺 ${caliperDistanceMm.toFixed(0)} mm`}
            </span>
          </span>
          <button
            type="button"
            className={`icon-pill-btn ${autoOrbit ? 'active' : ''}`}
            onClick={onToggleAutoOrbit}
            title="360° 自动环绕旋转"
          >
            <RotateCw size={13} />
            <span>{autoOrbit ? '巡览中' : '手动旋转'}</span>
          </button>
        </div>
      </header>

      {/* 4 Eastern Artifact Selector Bar */}
      <nav className="exhibit-switcher" aria-label="切换东方空间展品">
        {ARTIFACT_CATALOG.map((item) => {
          const active = item.id === artifact.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`exhibit-${item.id}`}
              className={`exhibit-pill ${active ? 'active' : ''}`}
              onClick={() => onSelectArtifact(item.id)}
            >
              <span>{item.titleZh}</span>
              <small>{item.parts.length} 构件 · GLB</small>
            </button>
          );
        })}
      </nav>

      {/* Architectural Lighting Studio 3-Preset Bar + 3D Callout Pin Toggle */}
      <div className="studio-toolbar" role="toolbar" aria-label="建筑光影影棚与空间锚点开关">
        <div className="studio-lighting-group" role="group" aria-label="建筑光影预设">
          {STUDIO_LIGHTING_ORDER.map((presetId) => {
            const spec = STUDIO_LIGHTING_PRESETS[presetId];
            const active = lightingPreset === presetId;
            return (
              <button
                key={presetId}
                type="button"
                data-testid={`lighting-${presetId}`}
                className={`studio-light-btn ${active ? 'active' : ''}`}
                onClick={() => onSetLightingPreset(presetId)}
                title={spec.descriptionZh}
              >
                {presetId === 'WARM_LANTERN' ? <Flame size={12} /> : <Sun size={12} />}
                <span>{spec.labelZh}</span>
                <small>{spec.kelvin}K</small>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          data-testid="toggle-pins-btn"
          className={`pins-toggle-btn ${showPinsIn3D ? 'active' : ''}`}
          onClick={onToggleShowPins}
        >
          {showPinsIn3D ? <Eye size={12} /> : <EyeOff size={12} />}
          <span>3D 锚点钉 ({calloutAnchors.length})</span>
        </button>
      </div>

      {/* Live WebGL PBR + RoomEnvironment 3D Stage */}
      <div className={`stage-canvas-frame studio-${lightingPreset.toLowerCase()}`}>
        <div ref={mountRef} className="stage-webgl-mount" data-testid="three-canvas-mount" />

        {stageMode === 'EXPLORE' ? (
          <div className="stage-top-overlay">
            {showPinsIn3D && selectedAnchor ? (
              <div className="callout-hud-pill" data-testid="stage-callout-card">
                <span className={`callout-dot tone-${selectedAnchor.tone.toLowerCase()}`} />
                <div className="callout-hud-copy">
                  <strong data-testid="stage-callout-title">
                    {selectedAnchor.titleZh} · {selectedAnchor.craftCategoryZh}
                  </strong>
                  <span>{selectedAnchor.mechanicsSummaryZh}</span>
                </div>
                <button
                  type="button"
                  data-testid="next-anchor-btn"
                  className="callout-next-btn"
                  onClick={handleCycleNextAnchor}
                  title="推镜聚焦下一枚 3D 空间锚点钉"
                >
                  <MapPin size={12} />
                  <span>下一锚点</span>
                </button>
              </div>
            ) : (
              <div className="stage-gesture-hint">
                <Sparkles size={13} />
                <span>拖拽旋转、滚轮缩放，点击 3D 锚点钉或构件实时推镜联动</span>
              </div>
            )}

            {cutaway.enabled && (
              <div className="cutaway-badge" data-testid="cutaway-elevation-badge">
                <Scissors size={12} />
                <span>
                  实时剖面 {cutaway.axis} 轴 · {Math.round(cutaway.offsetMeters * 1000)} mm
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="assembly-hud-card" data-testid="assembly-hud-card">
            <div className="assembly-hud-top">
              <span className="assembly-step-badge" data-testid="assembly-step-badge">
                {progress.isComplete ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>全器 {progress.totalSteps} 件榫卯已严丝合缝</span>
                  </>
                ) : (
                  <>
                    <Magnet size={13} />
                    <span>
                      第 {progress.lockedCount + 1} / {progress.totalSteps} 步 · {activeStep?.nameZh.split('（')[0]}
                    </span>
                  </>
                )}
              </span>

              <div className="assembly-hud-right">
                {cutaway.enabled && (
                  <span className="cutaway-inline-chip" data-testid="cutaway-elevation-badge">
                    <Scissors size={12} />
                    <span>
                      剖面 {cutaway.axis} 轴 · {Math.round(cutaway.offsetMeters * 1000)} mm
                    </span>
                  </span>
                )}
                {activeProximity && !progress.isComplete && (
                  <span
                    className={`proximity-chip ${activeProximity.canSnap ? 'ready' : ''}`}
                    data-testid="assembly-proximity-chip"
                  >
                    {activeProximity.canSnap
                      ? '可磁吸咬合'
                      : `距 ${Math.round(activeProximity.distanceMeters * 1000)}mm · 偏 ${Math.round(activeProximity.angleErrorDeg)}°`}
                  </span>
                )}
                <button
                  type="button"
                  data-testid="toggle-sfx-btn"
                  className="sfx-toggle-btn"
                  onClick={onToggleSfxMuted}
                  title={sfxMuted ? '开启京都桧木咬合音效' : '静音桧木咬合音效'}
                >
                  {sfxMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  <span>{sfxMuted ? '音效静音' : '桧木声学'}</span>
                </button>
              </div>
            </div>

            <div className="assembly-progress-track" aria-label={`拼装进度 ${progressPct}%`}>
              <div
                className="assembly-progress-fill"
                style={{ transform: `scaleX(${progress.progressRatio})` }}
              />
            </div>
            <p className="assembly-guide-text" data-testid="assembly-event-msg">
              {assemblyState.lastEventMessageZh}
            </p>
          </div>
        )}

        <div className="stage-part-chips" role="list" aria-label="器物构件快速拾取">
          {artifact.parts.map((part) => {
            const isSelected = part.id === selectedPartId;
            const rt = assemblyState.parts[part.id];
            const isLocked = stageMode === 'ASSEMBLY' && Boolean(rt?.locked);
            const isActiveTarget = stageMode === 'ASSEMBLY' && activeStep?.partId === part.id;
            return (
              <button
                key={part.id}
                type="button"
                data-testid={`part-chip-${part.id}`}
                className={`part-chip ${isSelected ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isActiveTarget ? 'target-step' : ''}`}
                onClick={() => onSelectPart(part.id)}
              >
                <span className="part-dot" style={{ backgroundColor: part.materialHex }} />
                <span>{part.nameZh.split('（')[0]}</span>
                {isLocked && <CheckCircle2 size={11} className="part-lock-icon" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exploded View / Mortise Assembly + Real-Time Architectural Cutaway Controls */}
      <div className="stage-controls-wrap">
        {stageMode === 'EXPLORE' ? (
          <div className="stage-controls-bar">
            <div className="slider-group">
              <div className="slider-label-row">
                <label htmlFor="explode-slider">
                  <Layers size={14} /> 爆炸视图拆解（Exploded View）
                </label>
                <strong className="slider-value" data-testid="explode-pct-label">
                  {explodePct}%
                </strong>
              </div>
              <input
                id="explode-slider"
                data-testid="explode-slider"
                className="ink-range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={explodePct}
                aria-valuetext={`爆炸视图拆解 ${explodePct}%`}
                style={
                  {
                    '--attr-min': 0,
                    '--attr-max': 100,
                    '--control-value': explodePct
                  } as React.CSSProperties
                }
                onChange={(e) => onChangeExplode(Number(e.target.value) / 100)}
              />
            </div>

            <div className="stage-action-btns">
              <button
                type="button"
                data-testid="toggle-section-btn"
                className={`action-btn secondary ${cutaway.enabled ? 'engaged' : ''}`}
                onClick={() => onUpdateCutaway({ enabled: !cutaway.enabled })}
              >
                <Scissors size={14} />
                <span>{cutaway.enabled ? '关闭剖面' : '剖面切片'}</span>
              </button>
              <button
                type="button"
                data-testid="quick-explode-btn"
                className="action-btn primary"
                onClick={() => onChangeExplode(explodeProgress > 0.5 ? 0 : 0.85)}
              >
                <span>{explodeProgress > 0.5 ? '一键合榫' : '一键全拆'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="stage-controls-bar assembly-controls-bar">
            <div className="slider-group">
              <div className="slider-label-row">
                <label htmlFor="approach-slider">
                  <Magnet size={13} /> 空间对位推进
                </label>
                <strong className="slider-value" data-testid="approach-pct-label">
                  {activeApproachPct}%
                </strong>
              </div>
              <input
                id="approach-slider"
                data-testid="approach-slider"
                className="ink-range"
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={progress.isComplete}
                value={activeApproachPct}
                aria-valuetext={`当前构件空间对位 ${activeApproachPct}%`}
                style={
                  {
                    '--attr-min': 0,
                    '--attr-max': 100,
                    '--control-value': activeApproachPct
                  } as React.CSSProperties
                }
                onChange={(e) => {
                  if (!activeStep) return;
                  onSetApproachRatio(activeStep.partId, Number(e.target.value) / 100);
                }}
                onPointerUp={() => {
                  if (activeStep) onAttemptSnapPart(activeStep.partId);
                }}
                onKeyUp={() => {
                  if (activeStep) onAttemptSnapPart(activeStep.partId);
                }}
              />
            </div>

            <div className="slider-group yaw-tune-group">
              <div className="slider-label-row">
                <label htmlFor="part-yaw-slider">榫头偏角</label>
                <strong className="slider-value" data-testid="part-yaw-label">
                  {activeYawVal > 0 ? `+${activeYawVal}°` : `${activeYawVal}°`}
                </strong>
              </div>
              <input
                id="part-yaw-slider"
                data-testid="part-yaw-slider"
                className="ink-range"
                type="range"
                min={-45}
                max={45}
                step={1}
                disabled={progress.isComplete}
                value={Math.max(-45, Math.min(45, activeYawVal))}
                aria-valuetext={`当前构件偏角 ${activeYawVal} 度`}
                style={
                  {
                    '--attr-min': -45,
                    '--attr-max': 45,
                    '--control-value': Math.max(-45, Math.min(45, activeYawVal))
                  } as React.CSSProperties
                }
                onChange={(e) => {
                  if (!activeStep || !activeRuntime) return;
                  onMoveAssemblyPart(activeStep.partId, activeRuntime.position, Number(e.target.value));
                }}
                onPointerUp={() => {
                  if (activeStep) onAttemptSnapPart(activeStep.partId);
                }}
                onKeyUp={() => {
                  if (activeStep) onAttemptSnapPart(activeStep.partId);
                }}
              />
            </div>

            <div className="stage-action-btns">
              <button
                type="button"
                data-testid="assist-snap-btn"
                className="action-btn primary"
                disabled={progress.isComplete}
                onClick={onAssistSnapActive}
              >
                <Magnet size={13} />
                <span>{progress.isComplete ? '全器已合' : '磁吸落位'}</span>
              </button>
              <button
                type="button"
                data-testid="reset-assembly-btn"
                className="action-btn secondary"
                onClick={onResetAssembly}
              >
                <RotateCcw size={13} />
                <span>复位</span>
              </button>
              <button
                type="button"
                data-testid="toggle-section-btn"
                className={`action-btn secondary ${cutaway.enabled ? 'engaged' : ''}`}
                onClick={() => onUpdateCutaway({ enabled: !cutaway.enabled })}
              >
                <Scissors size={13} />
                <span>{cutaway.enabled ? '关剖面' : '剖面'}</span>
              </button>
            </div>
          </div>
        )}

        {cutaway.enabled && (
          <div className="cutaway-slicer-bar" data-testid="cutaway-slicer-bar">
            <div className="cutaway-axis-group" role="group" aria-label="剖面切片轴向">
              {CUTAWAY_AXES.map((item) => (
                <button
                  key={item.axis}
                  type="button"
                  data-testid={`cutaway-axis-${item.axis}`}
                  className={`axis-pill-btn ${cutaway.axis === item.axis ? 'active' : ''}`}
                  onClick={() => onUpdateCutaway({ axis: item.axis })}
                >
                  {item.shortZh}
                </button>
              ))}
            </div>
            <div className="slider-group cutaway-offset-group">
              <div className="slider-label-row">
                <label htmlFor="section-slider">建筑剖面切片位置（{cutaway.axis} 轴）</label>
                <strong className="slider-value" data-testid="cutaway-offset-label">
                  {cutaway.offsetMeters.toFixed(2)}m
                </strong>
              </div>
              <input
                id="section-slider"
                data-testid="section-slider"
                className="ink-range"
                type="range"
                min={Math.round(CUTAWAY_MIN_OFFSET * 100)}
                max={Math.round(CUTAWAY_MAX_OFFSET * 100)}
                step={2}
                value={Math.round(cutaway.offsetMeters * 100)}
                aria-valuetext={`剖面切片位置 ${cutaway.offsetMeters.toFixed(2)} 米`}
                style={
                  {
                    '--attr-min': Math.round(CUTAWAY_MIN_OFFSET * 100),
                    '--attr-max': Math.round(CUTAWAY_MAX_OFFSET * 100),
                    '--control-value': Math.round(cutaway.offsetMeters * 100)
                  } as React.CSSProperties
                }
                onChange={(e) => onUpdateCutaway({ offsetMeters: Number(e.target.value) / 100 })}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
