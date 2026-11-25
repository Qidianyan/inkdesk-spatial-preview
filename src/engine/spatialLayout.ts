import type { LayoutPreset, PanelId, Vec3 } from '../data/artifacts';

export interface PanelPose {
  panelId: PanelId;
  visible: boolean;
  positionMeters: Vec3;
  yawDegrees: number;
  pitchDegrees: number;
  widthDp: number;
  heightDp: number;
  depthMeters: number;
}

export const MIN_COMFORT_RADIUS_M = 1.15;
export const MAX_COMFORT_RADIUS_M = 2.4;
const DP_PER_METER = 1160;
const EYE_HEIGHT_OFFSET_M = -0.06;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function panelOnArc(
  panelId: PanelId,
  headPos: Vec3,
  headYawDeg: number,
  azimuthOffsetDeg: number,
  radius: number,
  yOffset: number,
  widthDp: number,
  heightDp: number,
  visible: boolean
): PanelPose {
  const totalAngleRad = ((headYawDeg + azimuthOffsetDeg) * Math.PI) / 180;
  return {
    panelId,
    visible,
    positionMeters: {
      x: headPos.x + Math.sin(totalAngleRad) * radius,
      y: headPos.y + yOffset,
      z: headPos.z - Math.cos(totalAngleRad) * radius
    },
    yawDegrees: -(headYawDeg + azimuthOffsetDeg),
    pitchDegrees: yOffset < -0.1 ? 7 : 3,
    widthDp,
    heightDp,
    depthMeters: radius
  };
}

/**
 * 1:1 mirror of Kotlin SpatialPanelLayoutEngine.computeLayout().
 */
export function computeSpatialLayout(
  preset: LayoutPreset,
  headPos: Vec3 = { x: 0, y: 0, z: 0 },
  headYawDeg = 0,
  customRadiusMeters = 1.55
): Record<PanelId, PanelPose> {
  const radius = clamp(customRadiusMeters, MIN_COMFORT_RADIUS_M, MAX_COMFORT_RADIUS_M);

  if (preset === 'FOCUS_SINGLE') {
    const closerRadius = Math.max(MIN_COMFORT_RADIUS_M, radius - 0.18);
    return {
      AUDIO_FOCUS_LEFT: panelOnArc('AUDIO_FOCUS_LEFT', headPos, headYawDeg, -58, radius + 0.25, EYE_HEIGHT_OFFSET_M - 0.12, 380, 540, false),
      STAGE_CENTER: panelOnArc('STAGE_CENTER', headPos, headYawDeg, 0, closerRadius, EYE_HEIGHT_OFFSET_M, 1040, 720, true),
      NOTES_INSPECTOR_RIGHT: panelOnArc('NOTES_INSPECTOR_RIGHT', headPos, headYawDeg, 58, radius + 0.25, EYE_HEIGHT_OFFSET_M - 0.12, 400, 540, false)
    };
  }

  if (preset === 'SIDE_BY_SIDE_COMPARE') {
    return {
      AUDIO_FOCUS_LEFT: panelOnArc('AUDIO_FOCUS_LEFT', headPos, headYawDeg, -46, radius * 1.04, EYE_HEIGHT_OFFSET_M - 0.14, 380, 460, true),
      STAGE_CENTER: panelOnArc('STAGE_CENTER', headPos, headYawDeg, -17, radius, EYE_HEIGHT_OFFSET_M, 760, 640, true),
      NOTES_INSPECTOR_RIGHT: panelOnArc('NOTES_INSPECTOR_RIGHT', headPos, headYawDeg, 19, radius, EYE_HEIGHT_OFFSET_M, 540, 640, true)
    };
  }

  return {
    AUDIO_FOCUS_LEFT: panelOnArc('AUDIO_FOCUS_LEFT', headPos, headYawDeg, -35, radius * 0.96, EYE_HEIGHT_OFFSET_M - 0.02, 420, 600, true),
    STAGE_CENTER: panelOnArc('STAGE_CENTER', headPos, headYawDeg, 0, radius, EYE_HEIGHT_OFFSET_M, 820, 640, true),
    NOTES_INSPECTOR_RIGHT: panelOnArc('NOTES_INSPECTOR_RIGHT', headPos, headYawDeg, 35, radius * 0.96, EYE_HEIGHT_OFFSET_M - 0.02, 440, 600, true)
  };
}

export function hasHorizontalOverlap(a: PanelPose, b: PanelPose, minGapMeters = 0.04): boolean {
  if (!a.visible || !b.visible) return false;
  const dx = a.positionMeters.x - b.positionMeters.x;
  const dy = a.positionMeters.y - b.positionMeters.y;
  const dz = a.positionMeters.z - b.positionMeters.z;
  const dist = Math.hypot(dx, dy, dz);
  const halfWidths = (a.widthDp / DP_PER_METER + b.widthDp / DP_PER_METER) * 0.5 + minGapMeters;
  return dist < halfWidths;
}

export function isWithinComfortZone(pose: PanelPose, headPos: Vec3 = { x: 0, y: 0, z: 0 }): boolean {
  const dx = pose.positionMeters.x - headPos.x;
  const dy = pose.positionMeters.y - headPos.y;
  const dz = pose.positionMeters.z - headPos.z;
  const horiz = Math.hypot(dx, dz);
  return (
    horiz >= MIN_COMFORT_RADIUS_M - 1e-3 &&
    horiz <= MAX_COMFORT_RADIUS_M + 1e-3 &&
    Math.abs(dy) <= 0.35 &&
    Math.abs(pose.pitchDegrees) <= 18
  );
}
