import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SpatialArtifact } from '../data/artifacts';

export interface LoadedArtifactRig {
  root: THREE.Group;
  partGroups: Map<string, THREE.Object3D>;
  partMaterials: Map<string, THREE.MeshStandardMaterial[]>;
  dispose: () => void;
}

export interface SharedPbrTextures {
  hinoki: THREE.Texture;
  bronze: THREE.Texture;
  alabaster: THREE.Texture;
  smokeSprite: THREE.CanvasTexture;
  dispose: () => void;
}

function configureSeamlessTexture(tex: THREE.Texture, repeatX: number, repeatY: number, maxAniso: number): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  tex.needsUpdate = true;
  return tex;
}

function createSmokeSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(244, 241, 235, 0.72)');
    grad.addColorStop(0.42, 'rgba(232, 227, 219, 0.34)');
    grad.addColorStop(1, 'rgba(220, 215, 206, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function loadSharedPbrTextures(maxAniso: number): SharedPbrTextures {
  const loader = new THREE.TextureLoader();
  const hinoki = configureSeamlessTexture(loader.load('/textures/hinoki_wood.jpg'), 2.2, 2.2, maxAniso);
  const bronze = configureSeamlessTexture(loader.load('/textures/patina_bronze.jpg'), 2.0, 2.0, maxAniso);
  const alabaster = configureSeamlessTexture(loader.load('/textures/alabaster_stone.jpg'), 1.8, 1.8, maxAniso);
  const smokeSprite = createSmokeSpriteTexture();

  return {
    hinoki,
    bronze,
    alabaster,
    smokeSprite,
    dispose: () => {
      hinoki.dispose();
      bronze.dispose();
      alabaster.dispose();
      smokeSprite.dispose();
    }
  };
}

/**
 * Loads the shared binary glTF 2.0 (.glb) 3D model, binds real PBR textures
 * (albedo + bump + roughness maps), enables clipping planes, and indexes every
 * structural node by partId for live exploded-view & raycaster interaction.
 */
export async function loadArtifactGlb(
  artifact: SpatialArtifact,
  textures: SharedPbrTextures,
  clippingPlanes: THREE.Plane[]
): Promise<LoadedArtifactRig> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(artifact.glbPath);

  const root = new THREE.Group();
  root.name = artifact.id;
  root.add(gltf.scene);

  const partGroups = new Map<string, THREE.Object3D>();
  const partMaterials = new Map<string, THREE.MeshStandardMaterial[]>();
  const clonedMaterials: THREE.Material[] = [];

  for (const part of artifact.parts) {
    const node = gltf.scene.getObjectByName(part.id);
    if (!node) continue;
    partGroups.set(part.id, node);

    const matsForPart: THREE.MeshStandardMaterial[] = [];
    node.traverse((child) => {
      child.userData.partId = part.id;
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const orig = child.material as THREE.MeshStandardMaterial;
        const mat = orig.clone();
        const matName = (mat.name || '').toLowerCase();

        if (matName.includes('hinoki')) {
          mat.map = textures.hinoki;
          mat.bumpMap = textures.hinoki;
          mat.bumpScale = 0.018;
          mat.roughnessMap = textures.hinoki;
          mat.roughness = 0.62;
          mat.metalness = 0.05;
        } else if (matName.includes('bronze') || matName.includes('brass')) {
          mat.map = textures.bronze;
          mat.bumpMap = textures.bronze;
          mat.bumpScale = 0.014;
          mat.roughnessMap = textures.bronze;
          mat.metalness = matName.includes('cinnabar') ? 0.62 : 0.86;
          mat.roughness = matName.includes('bright') ? 0.24 : 0.34;
        } else if (matName.includes('alabaster')) {
          mat.map = textures.alabaster;
          mat.bumpMap = textures.alabaster;
          mat.bumpScale = 0.012;
          mat.roughnessMap = textures.alabaster;
          mat.roughness = 0.68;
          mat.metalness = 0.04;
        } else if (matName.includes('cinnabar') || matName.includes('ember')) {
          mat.bumpMap = textures.hinoki;
          mat.bumpScale = 0.008;
          mat.roughness = 0.3;
          mat.metalness = 0.16;
        } else {
          mat.bumpMap = textures.alabaster;
          mat.bumpScale = 0.01;
        }

        mat.envMapIntensity = 1.25;
        mat.side = THREE.DoubleSide;
        mat.clippingPlanes = clippingPlanes;
        mat.clipShadows = true;
        mat.needsUpdate = true;

        child.material = mat;
        clonedMaterials.push(mat);
        matsForPart.push(mat);
      }
    });
    partMaterials.set(part.id, matsForPart);
  }

  return {
    root,
    partGroups,
    partMaterials,
    dispose: () => {
      gltf.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.geometry) {
          obj.geometry.dispose();
        }
      });
      clonedMaterials.forEach((m) => m.dispose());
    }
  };
}
