import type { ArtifactPart, SpatialArtifact, Vec3 } from '../data/artifacts';

export type CutawayAxis = 'Y' | 'X' | 'Z';

export interface CutawayPlaneState {
  enabled: boolean;
  axis: CutawayAxis;
  offsetMeters: number;
}

export interface AssemblyStepSpec {
  order: number;
  partId: string;
  nameZh: string;
  targetPosition: Vec3;
  stagedPosition: Vec3;
  initialYawDeg: number;
  guideHintZh: string;
  prerequisitePartId: string | null;
}

export interface AssemblyPartRuntime {
  partId: string;
  order: number;
  position: Vec3;
  yawDeg: number;
  locked: boolean;
}

export type SnapRejectReason =
  | 'SNAPPED'
  | 'OUT_OF_ORDER'
  | 'OUT_OF_DISTANCE'
  | 'OUT_OF_ANGLE'
  | 'ALREADY_LOCKED'
  | 'UNKNOWN_PART'
  | 'INVALID_INPUT';

export interface SnapProximityMetrics {
  valid: boolean;
  partId: string;
  distanceMeters: number;
  angleErrorDeg: number;
  withinDistance: boolean;
  withinAngle: boolean;
  isOrderValid: boolean;
  canSnap: boolean;
}

export interface MortiseAssemblyProgress {
  lockedCount: number;
  totalSteps: number;
  progressRatio: number;
  isComplete: boolean;
  activeStep: AssemblyStepSpec | null;
  activePartId: string | null;
}

export interface MortiseAssemblyState {
  artifactId: string;
  steps: AssemblyStepSpec[];
  parts: Record<string, AssemblyPartRuntime>;
  lockedOrder: string[];
  activeStepIndex: number;
  snapDistanceMeters: number;
  snapAngleDeg: number;
  cutaway: CutawayPlaneState;
  lastEventMessageZh: string;
}

export interface SnapAttemptResult {
  snapped: boolean;
  reason: SnapRejectReason;
  distanceMeters: number;
  angleErrorDeg: number;
  withinDistance: boolean;
  withinAngle: boolean;
  completedJustNow: boolean;
  messageZh: string;
  state: MortiseAssemblyState;
}

export interface MortiseAssemblyConfig {
  snapDistanceMeters?: number;
  snapAngleDeg?: number;
  cutaway?: Partial<CutawayPlaneState>;
}

export const DEFAULT_SNAP_DISTANCE_METERS = 0.22;
export const DEFAULT_SNAP_ANGLE_DEG = 16;
export const CUTAWAY_MIN_OFFSET = -0.85;
export const CUTAWAY_MAX_OFFSET = 0.95;
export const DEFAULT_CUTAWAY_OFFSET = 0.22;
export const MAX_STAGE_RADIUS_METERS = 2.4;

const ARTIFACT_STEP_ORDER: Record<string, string[]> = {
  dougong_bell: [
    'yongle_crest',
    'ludou',
    'huagong',
    'nidaogong',
    'jiaohudou',
    'ang_lever',
    'shuatou'
  ],
  armillary_sphere: [
    'dragon_base',
    'horizon_ring',
    'meridian_ring',
    'equatorial_ring',
    'ecliptic_ring',
    'sight_tube'
  ],
  xuande_censer: [
    'cedar_stand',
    'tripod_feet',
    'censer_body',
    'bridge_ears',
    'incense_tray',
    'lotus_lid'
  ],
  origami_pagoda: [
    'octa_plinth',
    'tier1_shell',
    'tier2_wings',
    'waist_rib',
    'upper_dome',
    'bronze_spire'
  ]
};

const STEP_GUIDE_HINTS: Record<string, string> = {
  yongle_crest: '先安放永乐大钟蒲牢钟纽基准位，确立全构中轴。',
  ludou: '将栌斗（坐斗）对正中轴落位，展开十字斗口承托平面。',
  huagong: '将华拱沿前后向嵌入坐斗开口，形成第一级外挑悬臂。',
  nidaogong: '旋转泥道拱与华拱正交半榫咬合，锁定左右横系力。',
  jiaohudou: '落位交互斗与散斗垫群，分散拱端局部木纤维剪力。',
  ang_lever: '将朱漆下昂斜杠杆压入斗口，平衡屋檐外挑力矩。',
  shuatou: '压入顶层耍头与承重枋，彻底锁死整攒斗拱竖向自由度。',
  dragon_base: '先锚定四柱云龙十字底座，建立抗倾覆重心基准。',
  horizon_ring: '水平安放二十四方位地平经环，校准天文基准水平面。',
  meridian_ring: '直立嵌合子午双环，确立 39.9° 北极出地转轴。',
  equatorial_ring: '正交装入赤道刻度环，映射二十八宿赤经坐标。',
  ecliptic_ring: '按 23.5° 黄赤交角扣合朱铜黄道斜环。',
  sight_tube: '装入四游仪窥管，完成三辰嵌套天文测星闭环。',
  cedar_stand: '先安放紫檀海棠雕花座，隔热稳托铜炉本体。',
  tripod_feet: '三乳鼎足呈等边三角对位落座，形成底部对流间隙。',
  censer_body: '落位厚胎栗壳铜炉腹，构筑高热容蓄热腔体。',
  bridge_ears: '对齐双桥耳热阻结构，完善对称持握轮廓。',
  incense_tray: '轻置沉香篆印灰盘，保持草木灰微氧缓燃床面。',
  lotus_lid: '合上十二瓣镂空莲盖，引导香烟缓升成柱。',
  octa_plinth: '先固定八角须弥折面基座，分散塔身轴压。',
  tier1_shell: '扣合初层交替山谷折面筒壳，提升薄壁抗屈曲刚度。',
  tier2_wings: '嵌入中层竹绿菱形飞檐翼，构成环向加劲肋。',
  waist_rib: '卡入朱砂腰檐力学锁环，箍紧上下两层折面壳体。',
  upper_dome: '合拢顶层八瓣采光折穹，形成自承重灯笼空腔。',
  bronze_spire: '插入鎏金相轮塔刹中轴，收束整塔竖向配重。'
};

export function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidVec3(v: Vec3 | null | undefined): v is Vec3 {
  return Boolean(v) && isFiniteNumber(v!.x) && isFiniteNumber(v!.y) && isFiniteNumber(v!.z);
}

export function normalizeAngleDeg(deg: number): number {
  if (!isFiniteNumber(deg)) return 0;
  let normalized = ((deg + 180) % 360 + 360) % 360 - 180;
  if (normalized === -180) normalized = 180;
  return normalized;
}

export function clampStagePosition(pos: Vec3): Vec3 {
  const len = Math.hypot(pos.x, pos.y, pos.z);
  if (len <= MAX_STAGE_RADIUS_METERS || len === 0) {
    return { x: pos.x, y: pos.y, z: pos.z };
  }
  const scale = MAX_STAGE_RADIUS_METERS / len;
  return {
    x: pos.x * scale,
    y: pos.y * scale,
    z: pos.z * scale
  };
}

export function sanitizeCutawayState(
  patch?: Partial<CutawayPlaneState>,
  fallback?: CutawayPlaneState
): CutawayPlaneState {
  const base: CutawayPlaneState = fallback ?? {
    enabled: false,
    axis: 'Y',
    offsetMeters: DEFAULT_CUTAWAY_OFFSET
  };
  const nextAxis: CutawayAxis =
    patch?.axis === 'X' || patch?.axis === 'Y' || patch?.axis === 'Z' ? patch.axis : base.axis;
  const rawOffset = patch?.offsetMeters !== undefined ? patch.offsetMeters : base.offsetMeters;
  const safeOffset = isFiniteNumber(rawOffset)
    ? Math.min(CUTAWAY_MAX_OFFSET, Math.max(CUTAWAY_MIN_OFFSET, rawOffset))
    : base.offsetMeters;
  return {
    enabled: patch?.enabled !== undefined ? Boolean(patch.enabled) : base.enabled,
    axis: nextAxis,
    offsetMeters: safeOffset
  };
}

export function computeCutawayPlaneNormal(axis: CutawayAxis): Vec3 {
  if (axis === 'X') return { x: -1, y: 0, z: 0 };
  if (axis === 'Z') return { x: 0, y: 0, z: -1 };
  return { x: 0, y: -1, z: 0 };
}

export function isPointClippedByCutaway(point: Vec3, cutaway: CutawayPlaneState): boolean {
  if (!cutaway.enabled || !isValidVec3(point) || !isFiniteNumber(cutaway.offsetMeters)) {
    return false;
  }
  const n = computeCutawayPlaneNormal(cutaway.axis);
  const signed = point.x * n.x + point.y * n.y + point.z * n.z + cutaway.offsetMeters;
  return signed < 0;
}

function buildStagedPosition(part: ArtifactPart, orderIndex: number): Vec3 {
  const lateralAngle = ((orderIndex % 2 === 0 ? 1 : -1) * (0.45 + orderIndex * 0.24));
  const radialPush = 0.56 + (orderIndex % 3) * 0.14;
  const staged: Vec3 = {
    x: part.basePosition.x + part.explodeOffset.x * 0.72 + Math.sin(lateralAngle) * radialPush,
    y: part.basePosition.y + part.explodeOffset.y * 0.62 + 0.18 + orderIndex * 0.05,
    z: part.basePosition.z + part.explodeOffset.z * 0.72 + Math.cos(lateralAngle) * 0.34
  };
  return clampStagePosition(staged);
}

function buildInitialYawDeg(orderIndex: number): number {
  const sign = orderIndex % 2 === 0 ? 1 : -1;
  return sign * (18 + (orderIndex % 3) * 8);
}

export function buildAssemblySteps(artifact: SpatialArtifact): AssemblyStepSpec[] {
  const preferredOrder = ARTIFACT_STEP_ORDER[artifact.id] ?? artifact.parts.map((p) => p.id);
  const byId = new Map(artifact.parts.map((p) => [p.id, p]));
  const orderedParts: ArtifactPart[] = [];

  for (const id of preferredOrder) {
    const found = byId.get(id);
    if (found) orderedParts.push(found);
  }
  for (const part of artifact.parts) {
    if (!orderedParts.some((p) => p.id === part.id)) {
      orderedParts.push(part);
    }
  }

  return orderedParts.map((part, idx) => ({
    order: idx,
    partId: part.id,
    nameZh: part.nameZh,
    targetPosition: { ...part.basePosition },
    stagedPosition: buildStagedPosition(part, idx),
    initialYawDeg: buildInitialYawDeg(idx),
    guideHintZh:
      STEP_GUIDE_HINTS[part.id] ?? `拖拽或微调「${part.nameZh}」对准铜金磁吸环落位咬合。`,
    prerequisitePartId: idx > 0 ? orderedParts[idx - 1].id : null
  }));
}

export function createMortiseAssemblyState(
  artifact: SpatialArtifact,
  config?: MortiseAssemblyConfig
): MortiseAssemblyState {
  const steps = buildAssemblySteps(artifact);
  const parts: Record<string, AssemblyPartRuntime> = {};
  for (const step of steps) {
    parts[step.partId] = {
      partId: step.partId,
      order: step.order,
      position: { ...step.stagedPosition },
      yawDeg: step.initialYawDeg,
      locked: false
    };
  }

  const snapDistanceMeters =
    config?.snapDistanceMeters !== undefined &&
    isFiniteNumber(config.snapDistanceMeters) &&
    config.snapDistanceMeters > 0
      ? config.snapDistanceMeters
      : DEFAULT_SNAP_DISTANCE_METERS;

  const snapAngleDeg =
    config?.snapAngleDeg !== undefined &&
    isFiniteNumber(config.snapAngleDeg) &&
    config.snapAngleDeg > 0
      ? config.snapAngleDeg
      : DEFAULT_SNAP_ANGLE_DEG;

  const firstStep = steps[0];
  return {
    artifactId: artifact.id,
    steps,
    parts,
    lockedOrder: [],
    activeStepIndex: 0,
    snapDistanceMeters,
    snapAngleDeg,
    cutaway: sanitizeCutawayState(config?.cutaway),
    lastEventMessageZh: firstStep
      ? `第 1 / ${steps.length} 步：请将「${firstStep.nameZh}」拖至铜金磁吸环对齐咬合。`
      : '请开始榫卯拼装。'
  };
}

export function getAssemblyProgress(state: MortiseAssemblyState): MortiseAssemblyProgress {
  const totalSteps = state.steps.length;
  const lockedCount = state.lockedOrder.length;
  const activeStep =
    state.activeStepIndex >= 0 && state.activeStepIndex < totalSteps
      ? state.steps[state.activeStepIndex]
      : null;
  return {
    lockedCount,
    totalSteps,
    progressRatio: totalSteps === 0 ? 1 : lockedCount / totalSteps,
    isComplete: totalSteps > 0 && lockedCount >= totalSteps,
    activeStep,
    activePartId: activeStep ? activeStep.partId : null
  };
}

export function evaluateSnapProximity(
  state: MortiseAssemblyState,
  partId: string,
  candidatePos?: Vec3,
  candidateYawDeg?: number
): SnapProximityMetrics {
  const step = state.steps.find((s) => s.partId === partId);
  const runtime = state.parts[partId];
  if (!step || !runtime) {
    return {
      valid: false,
      partId,
      distanceMeters: Number.POSITIVE_INFINITY,
      angleErrorDeg: 180,
      withinDistance: false,
      withinAngle: false,
      isOrderValid: false,
      canSnap: false
    };
  }

  const pos = candidatePos ?? runtime.position;
  const yaw = candidateYawDeg !== undefined ? candidateYawDeg : runtime.yawDeg;
  if (!isValidVec3(pos) || !isFiniteNumber(yaw)) {
    return {
      valid: false,
      partId,
      distanceMeters: Number.POSITIVE_INFINITY,
      angleErrorDeg: 180,
      withinDistance: false,
      withinAngle: false,
      isOrderValid: false,
      canSnap: false
    };
  }

  const distanceMeters = Math.hypot(
    pos.x - step.targetPosition.x,
    pos.y - step.targetPosition.y,
    pos.z - step.targetPosition.z
  );
  const angleErrorDeg = Math.abs(normalizeAngleDeg(yaw));
  const activeStep = state.steps[state.activeStepIndex] ?? null;
  const isOrderValid = Boolean(activeStep && activeStep.partId === partId && !runtime.locked);
  const withinDistance = distanceMeters <= state.snapDistanceMeters;
  const withinAngle = angleErrorDeg <= state.snapAngleDeg;

  return {
    valid: true,
    partId,
    distanceMeters,
    angleErrorDeg,
    withinDistance,
    withinAngle,
    isOrderValid,
    canSnap: isOrderValid && withinDistance && withinAngle
  };
}

export function moveAssemblyPart(
  state: MortiseAssemblyState,
  partId: string,
  nextPos: Vec3,
  nextYawDeg?: number
): MortiseAssemblyState {
  const runtime = state.parts[partId];
  if (!runtime || runtime.locked) return state;

  const safePos = isValidVec3(nextPos) ? clampStagePosition(nextPos) : runtime.position;
  const safeYaw =
    nextYawDeg !== undefined
      ? isFiniteNumber(nextYawDeg)
        ? normalizeAngleDeg(nextYawDeg)
        : runtime.yawDeg
      : runtime.yawDeg;

  return {
    ...state,
    parts: {
      ...state.parts,
      [partId]: {
        ...runtime,
        position: safePos,
        yawDeg: safeYaw
      }
    }
  };
}

export function nudgeAssemblyPart(
  state: MortiseAssemblyState,
  partId: string,
  deltaPos: Vec3,
  deltaYawDeg = 0
): MortiseAssemblyState {
  const runtime = state.parts[partId];
  if (!runtime || runtime.locked) return state;
  if (!isValidVec3(deltaPos) || !isFiniteNumber(deltaYawDeg)) return state;
  return moveAssemblyPart(
    state,
    partId,
    {
      x: runtime.position.x + deltaPos.x,
      y: runtime.position.y + deltaPos.y,
      z: runtime.position.z + deltaPos.z
    },
    runtime.yawDeg + deltaYawDeg
  );
}

export function setPartApproachRatio(
  state: MortiseAssemblyState,
  partId: string,
  approachRatio: number,
  overrideYawDeg?: number
): MortiseAssemblyState {
  const step = state.steps.find((s) => s.partId === partId);
  const runtime = state.parts[partId];
  if (!step || !runtime || runtime.locked || !isFiniteNumber(approachRatio)) return state;
  const t = Math.min(1, Math.max(0, approachRatio));
  const nextPos: Vec3 = {
    x: step.stagedPosition.x + (step.targetPosition.x - step.stagedPosition.x) * t,
    y: step.stagedPosition.y + (step.targetPosition.y - step.stagedPosition.y) * t,
    z: step.stagedPosition.z + (step.targetPosition.z - step.stagedPosition.z) * t
  };
  const nextYaw =
    overrideYawDeg !== undefined && isFiniteNumber(overrideYawDeg)
      ? overrideYawDeg
      : runtime.yawDeg;
  return moveAssemblyPart(state, partId, nextPos, nextYaw);
}

export function computePartApproachRatio(state: MortiseAssemblyState, partId: string): number {
  const step = state.steps.find((s) => s.partId === partId);
  const runtime = state.parts[partId];
  if (!step || !runtime) return 0;
  if (runtime.locked) return 1;
  const totalDist = Math.hypot(
    step.stagedPosition.x - step.targetPosition.x,
    step.stagedPosition.y - step.targetPosition.y,
    step.stagedPosition.z - step.targetPosition.z
  );
  if (totalDist <= 1e-5) return 1;
  const curDist = Math.hypot(
    runtime.position.x - step.targetPosition.x,
    runtime.position.y - step.targetPosition.y,
    runtime.position.z - step.targetPosition.z
  );
  return Math.min(1, Math.max(0, 1 - curDist / totalDist));
}

export function attemptSnapPart(
  state: MortiseAssemblyState,
  partId: string,
  candidatePos?: Vec3,
  candidateYawDeg?: number
): SnapAttemptResult {
  const step = state.steps.find((s) => s.partId === partId);
  const runtime = state.parts[partId];
  if (!step || !runtime) {
    return {
      snapped: false,
      reason: 'UNKNOWN_PART',
      distanceMeters: Number.POSITIVE_INFINITY,
      angleErrorDeg: 180,
      withinDistance: false,
      withinAngle: false,
      completedJustNow: false,
      messageZh: `未找到构件 ${partId}。`,
      state
    };
  }

  if (runtime.locked) {
    return {
      snapped: false,
      reason: 'ALREADY_LOCKED',
      distanceMeters: 0,
      angleErrorDeg: 0,
      withinDistance: true,
      withinAngle: true,
      completedJustNow: false,
      messageZh: `「${step.nameZh}」已完成咬合锁定。`,
      state
    };
  }

  const pos = candidatePos ?? runtime.position;
  const yaw = candidateYawDeg !== undefined ? candidateYawDeg : runtime.yawDeg;
  if (!isValidVec3(pos) || !isFiniteNumber(yaw)) {
    return {
      snapped: false,
      reason: 'INVALID_INPUT',
      distanceMeters: Number.POSITIVE_INFINITY,
      angleErrorDeg: 180,
      withinDistance: false,
      withinAngle: false,
      completedJustNow: false,
      messageZh: '坐标或角度参数异常（NaN/Infinity），已保持上一有效位置。',
      state
    };
  }

  const activeStep = state.steps[state.activeStepIndex] ?? null;
  const proximity = evaluateSnapProximity(state, partId, pos, yaw);

  if (!activeStep || activeStep.partId !== partId) {
    const needName = activeStep ? activeStep.nameZh : '前置构件';
    const msg = `拼装顺序保护：请先将「${needName}」落位咬合，再安装「${step.nameZh}」。`;
    return {
      snapped: false,
      reason: 'OUT_OF_ORDER',
      distanceMeters: proximity.distanceMeters,
      angleErrorDeg: proximity.angleErrorDeg,
      withinDistance: proximity.withinDistance,
      withinAngle: proximity.withinAngle,
      completedJustNow: false,
      messageZh: msg,
      state: { ...state, lastEventMessageZh: msg }
    };
  }

  const movedState = moveAssemblyPart(state, partId, pos, yaw);

  if (!proximity.withinDistance) {
    const msg = `距离榫口尚差 ${Math.round(proximity.distanceMeters * 1000)} mm（需 ≤ ${Math.round(state.snapDistanceMeters * 1000)} mm）。`;
    return {
      snapped: false,
      reason: 'OUT_OF_DISTANCE',
      distanceMeters: proximity.distanceMeters,
      angleErrorDeg: proximity.angleErrorDeg,
      withinDistance: false,
      withinAngle: proximity.withinAngle,
      completedJustNow: false,
      messageZh: msg,
      state: { ...movedState, lastEventMessageZh: msg }
    };
  }

  if (!proximity.withinAngle) {
    const msg = `榫头偏角 ${proximity.angleErrorDeg.toFixed(1)}° 尚未对齐（需 ≤ ${state.snapAngleDeg.toFixed(0)}°）。`;
    return {
      snapped: false,
      reason: 'OUT_OF_ANGLE',
      distanceMeters: proximity.distanceMeters,
      angleErrorDeg: proximity.angleErrorDeg,
      withinDistance: true,
      withinAngle: false,
      completedJustNow: false,
      messageZh: msg,
      state: { ...movedState, lastEventMessageZh: msg }
    };
  }

  const nextLockedOrder = [...state.lockedOrder, partId];
  const nextActiveIndex = state.activeStepIndex + 1;
  const completedJustNow = nextLockedOrder.length >= state.steps.length;
  const nextStep = state.steps[nextActiveIndex] ?? null;
  const msg = completedJustNow
    ? `全器 ${state.steps.length} 件榫卯严丝合缝咬合完成！`
    : `「${step.nameZh}」清脆咬合落位！下一步：对齐「${nextStep!.nameZh}」。`;

  const nextState: MortiseAssemblyState = {
    ...movedState,
    parts: {
      ...movedState.parts,
      [partId]: {
        ...movedState.parts[partId],
        position: { ...step.targetPosition },
        yawDeg: 0,
        locked: true
      }
    },
    lockedOrder: nextLockedOrder,
    activeStepIndex: nextActiveIndex,
    lastEventMessageZh: msg
  };

  return {
    snapped: true,
    reason: 'SNAPPED',
    distanceMeters: proximity.distanceMeters,
    angleErrorDeg: proximity.angleErrorDeg,
    withinDistance: true,
    withinAngle: true,
    completedJustNow,
    messageZh: msg,
    state: nextState
  };
}

export function assistSnapActiveStep(state: MortiseAssemblyState): SnapAttemptResult {
  const activeStep = state.steps[state.activeStepIndex];
  if (!activeStep) {
    return {
      snapped: false,
      reason: 'ALREADY_LOCKED',
      distanceMeters: 0,
      angleErrorDeg: 0,
      withinDistance: true,
      withinAngle: true,
      completedJustNow: false,
      messageZh: '全部构件均已咬合完成，可切换剖面切片透视内部榫槽。',
      state
    };
  }
  return attemptSnapPart(state, activeStep.partId, activeStep.targetPosition, 0);
}

export function resetMortiseAssembly(state: MortiseAssemblyState): MortiseAssemblyState {
  const parts: Record<string, AssemblyPartRuntime> = {};
  for (const step of state.steps) {
    parts[step.partId] = {
      partId: step.partId,
      order: step.order,
      position: { ...step.stagedPosition },
      yawDeg: step.initialYawDeg,
      locked: false
    };
  }
  const firstStep = state.steps[0];
  return {
    ...state,
    parts,
    lockedOrder: [],
    activeStepIndex: 0,
    lastEventMessageZh: firstStep
      ? `已一键复位散件：第 1 / ${state.steps.length} 步，请对齐「${firstStep.nameZh}」。`
      : '已复位。'
  };
}

export function completeAllMortiseAssembly(state: MortiseAssemblyState): MortiseAssemblyState {
  const parts: Record<string, AssemblyPartRuntime> = {};
  const lockedOrder: string[] = [];
  for (const step of state.steps) {
    parts[step.partId] = {
      partId: step.partId,
      order: step.order,
      position: { ...step.targetPosition },
      yawDeg: 0,
      locked: true
    };
    lockedOrder.push(step.partId);
  }
  return {
    ...state,
    parts,
    lockedOrder,
    activeStepIndex: state.steps.length,
    lastEventMessageZh: `全部 ${state.steps.length} 件榫卯已一键合榫落位。`
  };
}

export function updateCutawayPlane(
  state: MortiseAssemblyState,
  patch: Partial<CutawayPlaneState>
): MortiseAssemblyState {
  return {
    ...state,
    cutaway: sanitizeCutawayState(patch, state.cutaway)
  };
}
