import { describe, expect, it } from 'vitest';
import { ARTIFACT_CATALOG, INITIAL_NOTES, INITIAL_SOUND_ANCHORS, findArtifact } from '../../data/artifacts';
import { computePartPosition, easeOutCubic, measureDistanceMm } from '../explodedModel';
import { clampAnchorPosition, evaluateSpatialAudioAnchor } from '../spatialAudioMath';
import {
  MAX_COMFORT_RADIUS_M,
  MIN_COMFORT_RADIUS_M,
  computeSpatialLayout,
  hasHorizontalOverlap,
  isWithinComfortZone
} from '../spatialLayout';
import { formatFocusClock, generateStudyReportMarkdown } from '../studyReport';

describe('SpatialPanelLayoutEngine (TS parity with Kotlin)', () => {
  it('lays out 3 visible curved-arc windows with zero overlap inside comfort envelope', () => {
    const poses = computeSpatialLayout('SURROUND_ARC');
    expect(poses.AUDIO_FOCUS_LEFT.visible).toBe(true);
    expect(poses.STAGE_CENTER.visible).toBe(true);
    expect(poses.NOTES_INSPECTOR_RIGHT.visible).toBe(true);
    expect(poses.AUDIO_FOCUS_LEFT.positionMeters.x).toBeLessThan(-0.5);
    expect(poses.NOTES_INSPECTOR_RIGHT.positionMeters.x).toBeGreaterThan(0.5);
    expect(hasHorizontalOverlap(poses.AUDIO_FOCUS_LEFT, poses.STAGE_CENTER)).toBe(false);
    expect(hasHorizontalOverlap(poses.STAGE_CENTER, poses.NOTES_INSPECTOR_RIGHT)).toBe(false);
    expect(isWithinComfortZone(poses.AUDIO_FOCUS_LEFT)).toBe(true);
    expect(isWithinComfortZone(poses.STAGE_CENTER)).toBe(true);
    expect(isWithinComfortZone(poses.NOTES_INSPECTOR_RIGHT)).toBe(true);
  });

  it('parks wings in FOCUS_SINGLE and clamps radius bounds', () => {
    const focus = computeSpatialLayout('FOCUS_SINGLE');
    expect(focus.STAGE_CENTER.visible).toBe(true);
    expect(focus.AUDIO_FOCUS_LEFT.visible).toBe(false);
    expect(focus.NOTES_INSPECTOR_RIGHT.visible).toBe(false);

    const tooNear = computeSpatialLayout('SURROUND_ARC', { x: 0, y: 0, z: 0 }, 0, 0.3);
    const tooFar = computeSpatialLayout('SURROUND_ARC', { x: 0, y: 0, z: 0 }, 0, 9.0);
    expect(tooNear.STAGE_CENTER.depthMeters).toBeCloseTo(MIN_COMFORT_RADIUS_M, 4);
    expect(tooFar.STAGE_CENTER.depthMeters).toBeCloseTo(MAX_COMFORT_RADIUS_M, 4);
  });
});

describe('ExplodedModelController (TS parity with Kotlin)', () => {
  it('smoothly interpolates exploded offsets and increases caliper distance', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 5);
    expect(easeOutCubic(1)).toBe(1);

    const dougong = findArtifact('dougong_bell');
    const assembledMm = measureDistanceMm(dougong, 'ludou', 'shuatou', 0);
    const explodedMm = measureDistanceMm(dougong, 'ludou', 'shuatou', 1);
    expect(assembledMm).toBeGreaterThan(200);
    expect(explodedMm).toBeGreaterThan(assembledMm * 1.8);

    const shuatou = dougong.parts.find((p) => p.id === 'shuatou')!;
    const midPos = computePartPosition(shuatou, 0.5);
    expect(midPos.y).toBeGreaterThan(shuatou.basePosition.y);
  });
});

describe('SpatialAudioEngine (HRTF azimuth & distance attenuation)', () => {
  it('computes symmetric stereo pan and shifts front sound left when head turns right', () => {
    const front = {
      ...INITIAL_SOUND_ANCHORS[3],
      enabled: true,
      gain: 1,
      positionMeters: { x: 0, y: 0, z: -1.5 }
    };
    const straight = evaluateSpatialAudioAnchor(front, { x: 0, y: 0, z: 0 }, 0);
    const headRight = evaluateSpatialAudioAnchor(front, { x: 0, y: 0, z: 0 }, 45);

    expect(straight.leftGain).toBeCloseTo(straight.rightGain, 4);
    expect(headRight.azimuthDegrees).toBeLessThan(-40);
    expect(headRight.leftGain).toBeGreaterThan(headRight.rightGain);
  });

  it('attenuates distant sources and clamps room anchor bounds', () => {
    const near = {
      ...INITIAL_SOUND_ANCHORS[0],
      enabled: true,
      gain: 1,
      positionMeters: { x: 0, y: 0, z: -0.7 }
    };
    const far = { ...near, positionMeters: { x: 0, y: 0, z: -3.1 } };
    expect(evaluateSpatialAudioAnchor(near).attenuation).toBeGreaterThan(
      evaluateSpatialAudioAnchor(far).attenuation
    );

    const clamped = clampAnchorPosition({ x: 20, y: 9, z: -20 });
    expect(Math.hypot(clamped.x, clamped.z)).toBeCloseTo(3.5, 3);
    expect(clamped.y).toBe(1.4);
  });
});

describe('Study Report & Artifact Catalog', () => {
  it('contains 4 rich exhibits with shared binary GLB paths and exports complete Markdown study report', () => {
    expect(ARTIFACT_CATALOG).toHaveLength(4);
    for (const item of ARTIFACT_CATALOG) {
      expect(item.glbPath.startsWith('/models/')).toBe(true);
      expect(item.glbPath.endsWith('.glb')).toBe(true);
    }
    expect(formatFocusClock(25 * 60)).toBe('25:00');
    expect(formatFocusClock(75)).toBe('01:15');

    const md = generateStudyReportMarkdown({
      artifactId: 'dougong_bell',
      selectedPartId: 'ang_lever',
      comparePartId: 'ludou',
      explodeProgress: 0.65,
      crossSectionEnabled: true,
      layoutPreset: 'SURROUND_ARC',
      ambientTheme: 'DAWN',
      soundAnchors: INITIAL_SOUND_ANCHORS,
      focusTimer: { totalSeconds: 1500, remainingSeconds: 1200, isRunning: true, completedSessions: 2 },
      notes: INITIAL_NOTES
    });

    expect(md).toContain('永乐大钟斗拱榫卯');
    expect(md).toContain('下昂斜杠杆梁');
    expect(md).toContain('65%');
    expect(md).toContain('古刹松风');
    expect(md).toContain('空间卡尺测距');
  });
});
