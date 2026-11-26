import { describe, expect, it } from 'vitest';
import { ARTIFACT_CATALOG, findArtifact } from '../../data/artifacts';
import {
  CUTAWAY_MAX_OFFSET,
  CUTAWAY_MIN_OFFSET,
  DEFAULT_SNAP_ANGLE_DEG,
  DEFAULT_SNAP_DISTANCE_METERS,
  assistSnapActiveStep,
  attemptSnapPart,
  completeAllMortiseAssembly,
  computeCutawayPlaneNormal,
  computePartApproachRatio,
  createMortiseAssemblyState,
  evaluateSnapProximity,
  getAssemblyProgress,
  isPointClippedByCutaway,
  moveAssemblyPart,
  normalizeAngleDeg,
  nudgeAssemblyPart,
  resetMortiseAssembly,
  sanitizeCutawayState,
  setPartApproachRatio,
  updateCutawayPlane
} from '../mortiseAssembly';

describe('MortiseAssemblyEngine (3D Interactive Mortise-and-Tenon Snap & Cutaway)', () => {
  it('initializes ordered bottom-to-top structural steps across all 4 exhibits', () => {
    for (const exhibit of ARTIFACT_CATALOG) {
      const state = createMortiseAssemblyState(exhibit);
      const progress = getAssemblyProgress(state);
      expect(state.steps).toHaveLength(exhibit.parts.length);
      expect(progress.lockedCount).toBe(0);
      expect(progress.totalSteps).toBe(exhibit.parts.length);
      expect(progress.progressRatio).toBe(0);
      expect(progress.isComplete).toBe(false);
      expect(progress.activePartId).toBe(state.steps[0].partId);
    }

    const dougong = createMortiseAssemblyState(findArtifact('dougong_bell'));
    expect(dougong.steps.map((s) => s.partId)).toEqual([
      'yongle_crest',
      'ludou',
      'huagong',
      'nidaogong',
      'jiaohudou',
      'ang_lever',
      'shuatou'
    ]);
  });

  it('rejects snapping when Euclidean distance exceeds snap tolerance', () => {
    const state = createMortiseAssemblyState(findArtifact('dougong_bell'));
    const first = state.steps[0];
    const farPos = {
      x: first.targetPosition.x + DEFAULT_SNAP_DISTANCE_METERS + 0.15,
      y: first.targetPosition.y,
      z: first.targetPosition.z
    };
    const res = attemptSnapPart(state, first.partId, farPos, 0);
    expect(res.snapped).toBe(false);
    expect(res.reason).toBe('OUT_OF_DISTANCE');
    expect(res.withinDistance).toBe(false);
    expect(res.withinAngle).toBe(true);
    expect(res.state.lockedOrder).toHaveLength(0);
  });

  it('rejects snapping when yaw angle error exceeds angular tolerance even at exact position', () => {
    const state = createMortiseAssemblyState(findArtifact('dougong_bell'));
    const first = state.steps[0];
    const res = attemptSnapPart(state, first.partId, first.targetPosition, DEFAULT_SNAP_ANGLE_DEG + 12);
    expect(res.snapped).toBe(false);
    expect(res.reason).toBe('OUT_OF_ANGLE');
    expect(res.withinDistance).toBe(true);
    expect(res.withinAngle).toBe(false);
    expect(res.state.parts[first.partId].locked).toBe(false);
  });

  it('snaps cleanly inside dual distance + angle tolerance and advances to next step', () => {
    const state = createMortiseAssemblyState(findArtifact('dougong_bell'));
    const first = state.steps[0];
    const nearPos = {
      x: first.targetPosition.x + 0.08,
      y: first.targetPosition.y - 0.05,
      z: first.targetPosition.z + 0.04
    };
    const res = attemptSnapPart(state, first.partId, nearPos, -9);
    expect(res.snapped).toBe(true);
    expect(res.reason).toBe('SNAPPED');
    expect(res.completedJustNow).toBe(false);
    expect(res.state.parts[first.partId].locked).toBe(true);
    expect(res.state.parts[first.partId].position).toEqual(first.targetPosition);
    expect(res.state.parts[first.partId].yawDeg).toBe(0);
    expect(getAssemblyProgress(res.state).activePartId).toBe(state.steps[1].partId);
  });

  it('enforces structural sequence guard and rejects out-of-order part snap', () => {
    const state = createMortiseAssemblyState(findArtifact('dougong_bell'));
    const third = state.steps[2];
    const res = attemptSnapPart(state, third.partId, third.targetPosition, 0);
    expect(res.snapped).toBe(false);
    expect(res.reason).toBe('OUT_OF_ORDER');
    expect(res.state.lockedOrder).toHaveLength(0);
    expect(res.messageZh).toContain(state.steps[0].nameZh);
  });

  it('completes full 7-step Yongle Dougong assembly and reports completedJustNow on final lock', () => {
    let state = createMortiseAssemblyState(findArtifact('dougong_bell'));
    for (let i = 0; i < state.steps.length; i++) {
      const step = state.steps[i];
      const res = attemptSnapPart(state, step.partId, step.targetPosition, 0);
      expect(res.snapped).toBe(true);
      expect(res.completedJustNow).toBe(i === state.steps.length - 1);
      state = res.state;
    }
    const progress = getAssemblyProgress(state);
    expect(progress.isComplete).toBe(true);
    expect(progress.lockedCount).toBe(7);
    expect(progress.progressRatio).toBe(1);
    expect(progress.activePartId).toBeNull();

    // Subsequent snap on locked part returns ALREADY_LOCKED
    const repeat = attemptSnapPart(state, 'ludou', state.steps[1].targetPosition, 0);
    expect(repeat.snapped).toBe(false);
    expect(repeat.reason).toBe('ALREADY_LOCKED');
  });

  it('supports accessible approach ratio slider, nudge, assist-snap, and clean reset', () => {
    let state = createMortiseAssemblyState(findArtifact('armillary_sphere'));
    const first = state.steps[0];

    state = setPartApproachRatio(state, first.partId, 0.5, 6);
    expect(computePartApproachRatio(state, first.partId)).toBeCloseTo(0.5, 2);

    state = nudgeAssemblyPart(state, first.partId, { x: 0.02, y: -0.02, z: 0 }, -4);
    expect(state.parts[first.partId].yawDeg).toBeCloseTo(2, 4);

    const assisted = assistSnapActiveStep(state);
    expect(assisted.snapped).toBe(true);
    expect(getAssemblyProgress(assisted.state).lockedCount).toBe(1);

    const completed = completeAllMortiseAssembly(assisted.state);
    expect(getAssemblyProgress(completed).isComplete).toBe(true);

    const reset = resetMortiseAssembly(completed);
    expect(getAssemblyProgress(reset).lockedCount).toBe(0);
    expect(getAssemblyProgress(reset).activePartId).toBe(first.partId);
  });

  it('clamps multi-axis cutaway plane offsets and evaluates clipping geometry accurately', () => {
    const state = createMortiseAssemblyState(findArtifact('dougong_bell'));
    const overHigh = updateCutawayPlane(state, { enabled: true, axis: 'Y', offsetMeters: 99 });
    expect(overHigh.cutaway.offsetMeters).toBe(CUTAWAY_MAX_OFFSET);

    const overLow = updateCutawayPlane(state, { enabled: true, axis: 'X', offsetMeters: -42 });
    expect(overLow.cutaway.offsetMeters).toBe(CUTAWAY_MIN_OFFSET);
    expect(computeCutawayPlaneNormal('X')).toEqual({ x: -1, y: 0, z: 0 });
    expect(computeCutawayPlaneNormal('Y')).toEqual({ x: 0, y: -1, z: 0 });
    expect(computeCutawayPlaneNormal('Z')).toEqual({ x: 0, y: 0, z: -1 });

    const yCut = sanitizeCutawayState({ enabled: true, axis: 'Y', offsetMeters: 0.1 });
    expect(isPointClippedByCutaway({ x: 0, y: 0.5, z: 0 }, yCut)).toBe(true);
    expect(isPointClippedByCutaway({ x: 0, y: -0.2, z: 0 }, yCut)).toBe(false);

    const zCut = sanitizeCutawayState({ enabled: true, axis: 'Z', offsetMeters: 0.0 });
    expect(isPointClippedByCutaway({ x: 0, y: 0, z: 0.3 }, zCut)).toBe(true);
    expect(isPointClippedByCutaway({ x: 0, y: 0, z: -0.3 }, zCut)).toBe(false);
  });

  it('safely guards against NaN and Infinity in coordinates, angles, and cutaway offsets', () => {
    const state = createMortiseAssemblyState(findArtifact('dougong_bell'));
    const first = state.steps[0];
    const origPos = { ...state.parts[first.partId].position };
    const origYaw = state.parts[first.partId].yawDeg;

    const afterNanMove = moveAssemblyPart(state, first.partId, { x: Number.NaN, y: 0, z: 0 }, Number.POSITIVE_INFINITY);
    expect(afterNanMove.parts[first.partId].position).toEqual(origPos);
    expect(afterNanMove.parts[first.partId].yawDeg).toBe(origYaw);

    const nanSnap = attemptSnapPart(state, first.partId, { x: 0, y: Number.NaN, z: 0 }, 0);
    expect(nanSnap.snapped).toBe(false);
    expect(nanSnap.reason).toBe('INVALID_INPUT');

    const infAngleSnap = attemptSnapPart(state, first.partId, first.targetPosition, Number.NEGATIVE_INFINITY);
    expect(infAngleSnap.snapped).toBe(false);
    expect(infAngleSnap.reason).toBe('INVALID_INPUT');

    const nanProx = evaluateSnapProximity(state, first.partId, { x: Number.NaN, y: 0, z: 0 }, 0);
    expect(nanProx.valid).toBe(false);
    expect(nanProx.canSnap).toBe(false);

    const nanCut = updateCutawayPlane(state, { enabled: true, offsetMeters: Number.NaN });
    expect(Number.isFinite(nanCut.cutaway.offsetMeters)).toBe(true);
    expect(normalizeAngleDeg(Number.NaN)).toBe(0);
    expect(normalizeAngleDeg(370)).toBeCloseTo(10, 5);
    expect(normalizeAngleDeg(-355)).toBeCloseTo(5, 5);
  });

  it('prevents moving already locked parts and clamps extreme drag coordinates to stage radius', () => {
    let state = createMortiseAssemblyState(findArtifact('xuande_censer'));
    const first = state.steps[0];
    const second = state.steps[1];

    const snapped = attemptSnapPart(state, first.partId, first.targetPosition, 0);
    state = snapped.state;

    const triedMoveLocked = moveAssemblyPart(state, first.partId, { x: 1.5, y: 1.5, z: 1.5 }, 45);
    expect(triedMoveLocked.parts[first.partId].position).toEqual(first.targetPosition);
    expect(triedMoveLocked.parts[first.partId].yawDeg).toBe(0);

    const farDrag = moveAssemblyPart(state, second.partId, { x: 50, y: 50, z: 50 }, 10);
    const r = Math.hypot(
      farDrag.parts[second.partId].position.x,
      farDrag.parts[second.partId].position.y,
      farDrag.parts[second.partId].position.z
    );
    expect(r).toBeLessThanOrEqual(2.4001);
  });

  it('returns UNKNOWN_PART safely for invalid part identifiers', () => {
    const state = createMortiseAssemblyState(findArtifact('origami_pagoda'));
    const res = attemptSnapPart(state, 'nonexistent_part', { x: 0, y: 0, z: 0 }, 0);
    expect(res.snapped).toBe(false);
    expect(res.reason).toBe('UNKNOWN_PART');
    const prox = evaluateSnapProximity(state, 'nonexistent_part');
    expect(prox.valid).toBe(false);
  });

  it('accepts boundary-exact distance and angle values inclusively', () => {
    const state = createMortiseAssemblyState(findArtifact('dougong_bell'), {
      snapDistanceMeters: 0.2,
      snapAngleDeg: 15
    });
    const first = state.steps[0];
    const exactBoundaryPos = {
      x: first.targetPosition.x + 0.2,
      y: first.targetPosition.y,
      z: first.targetPosition.z
    };
    const res = attemptSnapPart(state, first.partId, exactBoundaryPos, -15);
    expect(res.snapped).toBe(true);
    expect(res.reason).toBe('SNAPPED');
  });

  it('sanitizes extreme 1e200 drag vectors and double-NaN cutaway fallbacks cleanly', () => {
    const state = createMortiseAssemblyState(findArtifact('dougong_bell'));
    const first = state.steps[0];
    const huge = moveAssemblyPart(state, first.partId, { x: 1e200, y: 1e200, z: 0 }, 0);
    const p = huge.parts[first.partId].position;
    expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(2.4, 3);

    const doubleNanCut = sanitizeCutawayState(
      { enabled: true, axis: 'Z', offsetMeters: Number.NaN },
      { enabled: false, axis: 'Y', offsetMeters: Number.NaN }
    );
    expect(Number.isFinite(doubleNanCut.offsetMeters)).toBe(true);
  });

  it('keeps cutaway state chained monotonically across axis & offset updates without drift', () => {
    let state = createMortiseAssemblyState(findArtifact('armillary_sphere'));
    state = updateCutawayPlane(state, { enabled: true });
    state = updateCutawayPlane(state, { axis: 'X' });
    state = updateCutawayPlane(state, { offsetMeters: -0.35 });
    expect(state.cutaway).toEqual({ enabled: true, axis: 'X', offsetMeters: -0.35 });
  });
});
