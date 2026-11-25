import type { ArtifactPart, SpatialArtifact, Vec3 } from '../data/artifacts';

export function easeOutCubic(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - Math.pow(1 - t, 3);
}

export function computePartPosition(part: ArtifactPart, explodeProgress: number): Vec3 {
  const eased = easeOutCubic(explodeProgress);
  return {
    x: part.basePosition.x + part.explodeOffset.x * eased,
    y: part.basePosition.y + part.explodeOffset.y * eased,
    z: part.basePosition.z + part.explodeOffset.z * eased
  };
}

export function measureDistanceMm(
  artifact: SpatialArtifact,
  partAId: string,
  partBId: string,
  explodeProgress: number
): number {
  if (partAId === partBId) return 0;
  const partA = artifact.parts.find((p) => p.id === partAId);
  const partB = artifact.parts.find((p) => p.id === partBId);
  if (!partA || !partB) return 0;

  const posA = computePartPosition(partA, explodeProgress);
  const posB = computePartPosition(partB, explodeProgress);
  const dist = Math.hypot(posA.x - posB.x, posA.y - posB.y, posA.z - posB.z);
  const scaleMmPerUnit =
    Math.max(
      artifact.totalDimensionsMm.x,
      artifact.totalDimensionsMm.y,
      artifact.totalDimensionsMm.z
    ) * 0.5;
  return dist * scaleMmPerUnit;
}
