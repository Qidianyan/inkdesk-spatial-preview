import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ARTIFACT_CATALOG,
  type AmbientLightingTheme,
  type SpatialArtifact
} from '../data/artifacts';
import { computePartPosition } from '../engine/explodedModel';
import {
  loadArtifactGlb,
  loadSharedPbrTextures,
  type LoadedArtifactRig,
  type SharedPbrTextures
} from '../three/loadArtifactGlb';
import { Compass, Layers, RotateCw, Scissors, Sparkles } from 'lucide-react';

interface SpatialStage3DProps {
  artifact: SpatialArtifact;
  selectedPartId: string;
  comparePartId: string | null;
  explodeProgress: number;
  crossSectionEnabled: boolean;
  sectionCutY: number;
  ambientTheme: AmbientLightingTheme;
  autoOrbit: boolean;
  caliperDistanceMm: number;
  onSelectArtifact: (id: string) => void;
  onSelectPart: (partId: string) => void;
  onChangeExplode: (progress: number) => void;
  onToggleCrossSection: () => void;
  onChangeSectionY: (cutY: number) => void;
  onToggleAutoOrbit: () => void;
}

const SMOKE_COUNT = 34;

export const SpatialStage3D: React.FC<SpatialStage3DProps> = ({
  artifact,
  selectedPartId,
  comparePartId,
  explodeProgress,
  crossSectionEnabled,
  sectionCutY,
  ambientTheme,
  autoOrbit,
  caliperDistanceMm,
  onSelectArtifact,
  onSelectPart,
  onChangeExplode,
  onToggleCrossSection,
  onChangeSectionY,
  onToggleAutoOrbit
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<LoadedArtifactRig | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const texturesRef = useRef<SharedPbrTextures | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 6.0));
  const sectionRingRef = useRef<THREE.Mesh | null>(null);
  const caliperLineRef = useRef<THREE.Line | null>(null);
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
  const [glbReady, setGlbReady] = useState<boolean>(false);

  const propsRef = useRef({
    artifact,
    selectedPartId,
    comparePartId,
    explodeProgress,
    crossSectionEnabled,
    sectionCutY,
    ambientTheme,
    autoOrbit,
    onSelectPart
  });
  propsRef.current = {
    artifact,
    selectedPartId,
    comparePartId,
    explodeProgress,
    crossSectionEnabled,
    sectionCutY,
    ambientTheme,
    autoOrbit,
    onSelectPart
  };

  // Initialize Three.js PBR Stage + RoomEnvironment IBL + Incense Smoke Particle System once
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

    // Photorealistic metallic & wood IBL via Three.js RoomEnvironment PMREM
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const sharedTextures = loadSharedPbrTextures(renderer.capabilities.getMaxAnisotropy());
    texturesRef.current = sharedTextures;

    // Architectural studio lighting (warm stone / hinoki / brushed bronze — strictly zero blue/cyan/purple)
    const hemi = new THREE.HemisphereLight(0xfaf8f4, 0x5c554c, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ec, 1.9);
    keyLight.position.set(3.2, 4.8, 3.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 14.0;
    keyLight.shadow.camera.left = -2.4;
    keyLight.shadow.camera.right = 2.4;
    keyLight.shadow.camera.top = 2.4;
    keyLight.shadow.camera.bottom = -2.4;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe4b876, 1.05);
    rimLight.position.set(-3.4, 2.2, -2.8);
    scene.add(rimLight);

    const emberFill = new THREE.PointLight(0xd97d42, 0.5, 9);
    emberFill.position.set(-1.4, -0.7, 2.2);
    scene.add(emberFill);

    // Subtle Kyoto gallery stone pedestal & soft contact shadow receiver
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -1.32, 0);

    const shadowPlane = new THREE.Mesh(
      new THREE.CircleGeometry(1.75, 64),
      new THREE.ShadowMaterial({ opacity: 0.22 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    pedestalGroup.add(shadowPlane);

    const outerBronzeRing = new THREE.Mesh(
      new THREE.RingGeometry(1.18, 1.2, 72),
      new THREE.MeshBasicMaterial({
        color: 0xc98a3a,
        transparent: true,
        opacity: 0.42,
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

    // Cross-section architectural plane indicator
    const sectionDisc = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 1.2, 64),
      new THREE.MeshBasicMaterial({
        color: 0xd64527,
        transparent: true,
        opacity: 0.13,
        side: THREE.DoubleSide
      })
    );
    sectionDisc.rotation.x = -Math.PI / 2;
    sectionDisc.visible = false;
    scene.add(sectionDisc);
    sectionRingRef.current = sectionDisc;

    // 3D Spatial Caliper measurement line
    const caliperGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.5, 0)
    ]);
    const caliperMat = new THREE.LineBasicMaterial({ color: 0xd64527 });
    const caliperLine = new THREE.Line(caliperGeo, caliperMat);
    caliperLine.visible = false;
    scene.add(caliperLine);
    caliperLineRef.current = caliperLine;

    // Live Rising Incense Smoke Particles for Song-Ming Xuande Censer
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

    // Pointer interaction: drag 360° orbit + click raycast part selection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (ev: PointerEvent) => {
      orbitRef.current.dragging = true;
      orbitRef.current.moved = false;
      orbitRef.current.lastX = ev.clientX;
      orbitRef.current.lastY = ev.clientY;
      renderer.domElement.setPointerCapture(ev.pointerId);
    };

    const onPointerMove = (ev: PointerEvent) => {
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
      const wasClick = orbitRef.current.dragging && !orbitRef.current.moved;
      orbitRef.current.dragging = false;
      if (renderer.domElement.hasPointerCapture(ev.pointerId)) {
        renderer.domElement.releasePointerCapture(ev.pointerId);
      }
      if (wasClick && rigRef.current) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(rigRef.current.root.children, true);
        const hitPart = hits.find((h) => typeof h.object.userData.partId === 'string');
        if (hitPart) {
          propsRef.current.onSelectPart(hitPart.object.userData.partId as string);
        }
      }
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      orbitRef.current.zoom = Math.max(2.4, Math.min(5.2, orbitRef.current.zoom + ev.deltaY * 0.002));
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
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

    const animate = () => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, clock.getDelta());
      const elapsed = clock.elapsedTime;
      const p = propsRef.current;

      if (p.autoOrbit && !orbitRef.current.dragging) {
        orbitRef.current.yaw += dt * 0.28;
      }

      const r = orbitRef.current.zoom + p.explodeProgress * 1.48;
      const pitch = orbitRef.current.pitch;
      const yaw = orbitRef.current.yaw;
      camera.position.set(
        r * Math.cos(pitch) * Math.sin(yaw),
        r * Math.sin(pitch) + 0.05,
        r * Math.cos(pitch) * Math.cos(yaw)
      );
      camera.lookAt(0, -0.05, 0);

      // Ambient studio light temperature tuning
      if (p.ambientTheme === 'CANDLELIGHT') {
        hemi.intensity = 0.72;
        keyLight.color.setHex(0xffd7a3);
        keyLight.intensity = 2.05;
        rimLight.intensity = 1.4;
        emberFill.intensity = 1.15;
        renderer.toneMappingExposure = 1.12;
      } else if (p.ambientTheme === 'AFTERNOON') {
        hemi.intensity = 0.88;
        keyLight.color.setHex(0xffe9c7);
        keyLight.intensity = 1.98;
        rimLight.intensity = 1.1;
        emberFill.intensity = 0.62;
        renderer.toneMappingExposure = 1.07;
      } else {
        hemi.intensity = 0.96;
        keyLight.color.setHex(0xfbf9f5);
        keyLight.intensity = 1.85;
        rimLight.intensity = 0.95;
        emberFill.intensity = 0.4;
        renderer.toneMappingExposure = 1.05;
      }

      // Cross-section clipping
      clipPlaneRef.current.constant = p.crossSectionEnabled ? p.sectionCutY : 6.0;
      if (sectionRingRef.current) {
        sectionRingRef.current.visible = p.crossSectionEnabled;
        sectionRingRef.current.position.y = p.sectionCutY;
      }

      // Animate exploded GLB nodes + subtle selection glow + caliper
      const rig = rigRef.current;
      if (rig) {
        let selWorld: THREE.Vector3 | null = null;
        let cmpWorld: THREE.Vector3 | null = null;
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 3.8);

        for (const part of p.artifact.parts) {
          const node = rig.partGroups.get(part.id);
          if (!node) continue;
          const target = computePartPosition(part, p.explodeProgress);
          const isSelected = part.id === p.selectedPartId;
          const floatOffset = isSelected ? Math.sin(elapsed * 2.4) * 0.02 : 0;

          node.position.lerp(
            new THREE.Vector3(target.x, target.y + floatOffset, target.z),
            Math.min(1, dt * 11)
          );
          const targetScale = isSelected ? 1.038 : 1.0;
          node.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, dt * 10));

          if (part.id === p.selectedPartId) selWorld = node.position.clone();
          if (part.id === p.comparePartId) cmpWorld = node.position.clone();

          const mats = rig.partMaterials.get(part.id) ?? [];
          for (const m of mats) {
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

        if (caliperLineRef.current) {
          if (selWorld && cmpWorld && p.comparePartId && p.comparePartId !== p.selectedPartId) {
            caliperLineRef.current.visible = true;
            const posAttr = caliperLineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
            posAttr.setXYZ(0, selWorld.x, selWorld.y, selWorld.z);
            posAttr.setXYZ(1, cmpWorld.x, cmpWorld.y, cmpWorld.z);
            posAttr.needsUpdate = true;
          } else {
            caliperLineRef.current.visible = false;
          }
        }

        // Real-time incense smoke curling upward from Song-Ming Xuande Censer
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
            smMat.opacity = p.ambientTheme === 'CANDLELIGHT' ? 0.34 : 0.45;
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
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (rigRef.current) {
        scene.remove(rigRef.current.root);
        rigRef.current.dispose();
        rigRef.current = null;
      }
      sharedTextures.dispose();
      envRT.dispose();
      renderer.dispose();
    };
  }, []);

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
            const initPos = computePartPosition(part, propsRef.current.explodeProgress);
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

  return (
    <section
      className="spatial-panel stage-panel"
      aria-label="主窗口 A：3D 空间器物与榫卯拆解台"
      data-testid="panel-stage-center"
      data-glb-ready={glbReady ? 'true' : 'false'}
    >
      <header className="panel-header">
        <div>
          <h2 className="panel-title">{artifact.titleZh}</h2>
          <p className="panel-subtitle">
            {artifact.subtitleZh}，{artifact.eraZh}
          </p>
        </div>
        <div className="stage-telemetry">
          <span className="telemetry-pill">
            <Compass size={13} />
            <span>卡尺 {caliperDistanceMm.toFixed(0)} mm</span>
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

      {/* Live WebGL PBR + RoomEnvironment 3D Stage */}
      <div className="stage-canvas-frame">
        <div ref={mountRef} className="stage-webgl-mount" data-testid="three-canvas-mount" />
        <div className="stage-gesture-hint">
          <Sparkles size={13} />
          <span>拖拽旋转、滚轮缩放，点选三维构件实时联动批注</span>
        </div>

        <div className="stage-part-chips" role="list" aria-label="器物构件快速拾取">
          {artifact.parts.map((part) => {
            const active = part.id === selectedPartId;
            return (
              <button
                key={part.id}
                type="button"
                data-testid={`part-chip-${part.id}`}
                className={`part-chip ${active ? 'active' : ''}`}
                onClick={() => onSelectPart(part.id)}
              >
                <span className="part-dot" style={{ backgroundColor: part.materialHex }} />
                <span>{part.nameZh.split('（')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Exploded View & Cross-Section Controls */}
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

        {crossSectionEnabled && (
          <div className="slider-group section-slider-group">
            <div className="slider-label-row">
              <label htmlFor="section-slider">剖切高度</label>
              <strong className="slider-value">{sectionCutY.toFixed(2)}m</strong>
            </div>
            <input
              id="section-slider"
              className="ink-range"
              type="range"
              min={-70}
              max={80}
              step={5}
              value={Math.round(sectionCutY * 100)}
              aria-valuetext={`剖切高度 ${sectionCutY.toFixed(2)} 米`}
              style={
                {
                  '--attr-min': -70,
                  '--attr-max': 80,
                  '--control-value': Math.round(sectionCutY * 100)
                } as React.CSSProperties
              }
              onChange={(e) => onChangeSectionY(Number(e.target.value) / 100)}
            />
          </div>
        )}

        <div className="stage-action-btns">
          <button
            type="button"
            data-testid="toggle-section-btn"
            className={`action-btn secondary ${crossSectionEnabled ? 'engaged' : ''}`}
            onClick={onToggleCrossSection}
          >
            <Scissors size={14} />
            <span>{crossSectionEnabled ? '关闭剖面' : '剖面测量'}</span>
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
    </section>
  );
};
