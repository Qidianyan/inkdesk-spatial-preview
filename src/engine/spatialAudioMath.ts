import type { SoundAnchorId, SpatialAudioAnchor, Vec3 } from '../data/artifacts';

export interface SpatialAudioRenderState {
  anchorId: SoundAnchorId;
  active: boolean;
  distanceMeters: number;
  azimuthDegrees: number;
  elevationDegrees: number;
  attenuation: number;
  leftGain: number;
  rightGain: number;
}

const REF_DISTANCE_M = 0.7;
const ROLLOFF_FACTOR = 1.15;
const MIN_RADIUS_M = 0.45;
const MAX_RADIUS_M = 3.5;

export function clampAnchorPosition(position: Vec3): Vec3 {
  const horiz = Math.hypot(position.x, position.z);
  const clampedY = Math.min(1.4, Math.max(-0.8, position.y));
  if (horiz < 1e-5) {
    return { x: 0, y: clampedY, z: -MIN_RADIUS_M };
  }
  const clampedRadius = Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, horiz));
  const scale = clampedRadius / horiz;
  return { x: position.x * scale, y: clampedY, z: position.z * scale };
}

/**
 * 1:1 mirror of Kotlin SpatialAudioEngine.evaluateAnchor().
 */
export function evaluateSpatialAudioAnchor(
  anchor: SpatialAudioAnchor,
  listenerPosition: Vec3 = { x: 0, y: 0, z: 0 },
  listenerYawDegrees = 0,
  masterDucking = 1
): SpatialAudioRenderState {
  const relX = anchor.positionMeters.x - listenerPosition.x;
  const relY = anchor.positionMeters.y - listenerPosition.y;
  const relZ = anchor.positionMeters.z - listenerPosition.z;
  const distance = Math.max(0.15, Math.hypot(relX, relY, relZ));

  const yawRad = (listenerYawDegrees * Math.PI) / 180;
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);
  const localRight = relX * cosY + relZ * sinY;
  const localForward = relX * sinY - relZ * cosY;

  const azimuthRad = Math.atan2(localRight, localForward);
  const azimuthDegrees = (azimuthRad * 180) / Math.PI;
  const horizDist = Math.max(1e-4, Math.hypot(localRight, localForward));
  const elevationDegrees = (Math.atan2(relY, horizDist) * 180) / Math.PI;

  const attenuation = Math.min(
    1,
    Math.max(0.05, REF_DISTANCE_M / (REF_DISTANCE_M + ROLLOFF_FACTOR * Math.max(0, distance - REF_DISTANCE_M)))
  );

  const clampedGain = Math.min(1, Math.max(0, anchor.gain));
  const clampedDuck = Math.min(1, Math.max(0.1, masterDucking));
  const effectiveGain = anchor.enabled ? clampedGain * attenuation * clampedDuck : 0;

  const pan = Math.min(1, Math.max(-1, Math.sin(azimuthRad)));
  const panAngle = (pan + 1) * 0.25 * Math.PI;
  const backShadow = localForward < 0 ? 0.88 : 1;

  return {
    anchorId: anchor.id,
    active: anchor.enabled && effectiveGain > 0.001,
    distanceMeters: distance,
    azimuthDegrees,
    elevationDegrees,
    attenuation,
    leftGain: effectiveGain * Math.cos(panAngle) * backShadow,
    rightGain: effectiveGain * Math.sin(panAngle) * backShadow
  };
}
