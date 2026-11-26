import type { Vec3 } from '../data/artifacts';

export type StudioLightingPresetId = 'KYOTO_MORNING' | 'GALLERY_ZENITH' | 'WARM_LANTERN';
export type CalloutPinTone = 'CINNABAR' | 'BRONZE';

export interface CameraFocusTarget {
  yawRad: number;
  pitchRad: number;
  zoom: number;
}

export interface StudioLightingSpec {
  id: StudioLightingPresetId;
  labelZh: string;
  labelEn: string;
  kelvin: number;
  descriptionZh: string;
  azimuthDeg: number;
  elevationDeg: number;
  keyColorHex: number;
  keyIntensity: number;
  rimColorHex: number;
  rimIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  emberColorHex: number;
  emberIntensity: number;
  exposure: number;
  envMapIntensity: number;
}

export interface SpatialCalloutAnchor {
  id: string;
  artifactId: string;
  partId: string;
  localOffset: Vec3;
  titleZh: string;
  craftCategoryZh: string;
  eraOrPeriodZh: string;
  mechanicsSummaryZh: string;
  craftDetailZh: string;
  tone: CalloutPinTone;
  cameraFocus: CameraFocusTarget;
  isCustom: boolean;
  createdAtIso: string;
}

export interface SpatialAnchorState {
  activeArtifactId: string;
  anchorsByArtifact: Record<string, SpatialCalloutAnchor[]>;
  selectedAnchorId: string | null;
  showPinsIn3D: boolean;
  lightingPreset: StudioLightingPresetId;
}

export interface SelectAnchorResult {
  found: boolean;
  anchor: SpatialCalloutAnchor | null;
  partId: string | null;
  cameraFocus: CameraFocusTarget | null;
  state: SpatialAnchorState;
}

export interface AddCustomAnchorInput {
  artifactId: string;
  partId: string;
  titleZh: string;
  craftDetailZh: string;
  craftCategoryZh?: string;
  eraOrPeriodZh?: string;
  localOffset?: Vec3;
  tone?: CalloutPinTone;
  cameraFocus?: CameraFocusTarget;
  nowIso?: string;
}

export interface AnchorMutationResult {
  ok: boolean;
  anchor: SpatialCalloutAnchor | null;
  errorZh: string | null;
  state: SpatialAnchorState;
}

export const CUSTOM_ANCHORS_STORAGE_KEY = 'inkdesk_spatial_custom_callouts_v5';
export const MAX_LOCAL_OFFSET_M = 0.85;
export const MAX_TITLE_LENGTH = 36;
export const MAX_DETAIL_LENGTH = 260;

/**
 * Three strictly warm, zero-blue/cyan/teal/purple architectural lighting studio presets
 * engineered for Kyoto Hinoki wood, Ming cast bronze, and alabaster PBR surfaces.
 */
export const STUDIO_LIGHTING_PRESETS: Record<StudioLightingPresetId, StudioLightingSpec> = {
  KYOTO_MORNING: {
    id: 'KYOTO_MORNING',
    labelZh: '京都晨光',
    labelEn: 'Kyoto Morning',
    kelvin: 5200,
    descriptionZh: '斜角 48° 柔暖自然晨光，凸显桧木年轮漫反射与清晰榫槽层次',
    azimuthDeg: 38,
    elevationDeg: 48,
    keyColorHex: 0xfff6e8,
    keyIntensity: 1.95,
    rimColorHex: 0xe6bd80,
    rimIntensity: 1.05,
    hemiSkyHex: 0xfaf7f1,
    hemiGroundHex: 0x625a4e,
    hemiIntensity: 0.94,
    emberColorHex: 0xd98548,
    emberIntensity: 0.38,
    exposure: 1.06,
    envMapIntensity: 1.22
  },
  GALLERY_ZENITH: {
    id: 'GALLERY_ZENITH',
    labelZh: '美术馆顶光',
    labelEn: 'Gallery Zenith',
    kelvin: 4400,
    descriptionZh: '74° 高位展馆洗墙顶光，拉高倒角卷杀雕塑明暗比与古铜金属光泽',
    azimuthDeg: 14,
    elevationDeg: 74,
    keyColorHex: 0xfff0d6,
    keyIntensity: 2.28,
    rimColorHex: 0xd8a85c,
    rimIntensity: 1.28,
    hemiSkyHex: 0xf6f1e7,
    hemiGroundHex: 0x4a453d,
    hemiIntensity: 0.68,
    emberColorHex: 0xc98a3a,
    emberIntensity: 0.48,
    exposure: 1.09,
    envMapIntensity: 1.38
  },
  WARM_LANTERN: {
    id: 'WARM_LANTERN',
    labelZh: '宋代烛映',
    labelEn: 'Warm Lantern',
    kelvin: 2450,
    descriptionZh: '24° 低角度摇曳暖烛侧光，勾勒宋明书房沉静金铜高光与深邃木影',
    azimuthDeg: -52,
    elevationDeg: 24,
    keyColorHex: 0xffbe76,
    keyIntensity: 2.38,
    rimColorHex: 0xe8924c,
    rimIntensity: 1.65,
    hemiSkyHex: 0xebd2b0,
    hemiGroundHex: 0x2d261f,
    hemiIntensity: 0.46,
    emberColorHex: 0xd64527,
    emberIntensity: 1.48,
    exposure: 1.16,
    envMapIntensity: 1.46
  }
};

export const STUDIO_LIGHTING_ORDER: StudioLightingPresetId[] = [
  'KYOTO_MORNING',
  'GALLERY_ZENITH',
  'WARM_LANTERN'
];

export const BUILTIN_CALLOUT_ANCHORS: SpatialCalloutAnchor[] = [
  // 1. Yongle Bell Dougong (4 pins)
  {
    id: 'pin_dougong_ludou',
    artifactId: 'dougong_bell',
    partId: 'ludou',
    localOffset: { x: 0.34, y: 0.14, z: 0.24 },
    titleZh: '十字斗口模数基座',
    craftCategoryZh: '力学支点',
    eraOrPeriodZh: '明永乐十八年（约 1420）· 官式斗口制',
    mechanicsSummaryZh: '上部双轴悬挑弯矩在此转化为柱头均匀轴压。',
    craftDetailZh: '坐斗开正交十字斗口，华拱与泥道拱互锁咬合，在地震水平剪力下通过木纤维微幅摩擦耗能。',
    tone: 'BRONZE',
    cameraFocus: { yawRad: 0.42, pitchRad: 0.22, zoom: 3.45 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_dougong_ang',
    artifactId: 'dougong_bell',
    partId: 'ang_lever',
    localOffset: { x: 0.18, y: 0.22, z: 0.42 },
    titleZh: '象鼻下昂斜杠杆',
    craftCategoryZh: '悬挑配重',
    eraOrPeriodZh: '明代官式重檐五踩 · 无铁钉结构',
    mechanicsSummaryZh: '以屋顶内侧自重为配重，抵消深远外檐悬挑倾覆力矩。',
    craftDetailZh: '昂嘴削制象鼻斜坡，兼具雨水导流与力流指示作用，是藏经楼檐下最具辨识度的朱漆雕塑剪影。',
    tone: 'CINNABAR',
    cameraFocus: { yawRad: 0.88, pitchRad: 0.28, zoom: 3.35 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_dougong_huagong',
    artifactId: 'dougong_bell',
    partId: 'huagong',
    localOffset: { x: -0.28, y: 0.18, z: 0.32 },
    titleZh: '卷杀曲拱半榫锁口',
    craftCategoryZh: '木作工艺',
    eraOrPeriodZh: '营造法式四瓣卷杀 · 桧木/楠木精作',
    mechanicsSummaryZh: '拱底弧线削减受拉边缘应力集中，提升外挑刚度。',
    craftDetailZh: '与泥道拱正交开半榫，不借一钉一铆即锁定水平扭转自由度，便于百年后无损拆换单件糟朽木料。',
    tone: 'BRONZE',
    cameraFocus: { yawRad: -0.62, pitchRad: 0.24, zoom: 3.55 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_dougong_bell',
    artifactId: 'dougong_bell',
    partId: 'yongle_crest',
    localOffset: { x: 0.28, y: 0.08, z: 0.28 },
    titleZh: '大钟寺永乐蒲牢钟纽',
    craftCategoryZh: '声学地标',
    eraOrPeriodZh: '明永乐年间 · 铸造工期逾三年',
    mechanicsSummaryZh: '变壁厚抛物线铜壳激发出双基频拍音，声传数十里。',
    craftDetailZh: '致敬 PICO Space Program 决赛地标北京大钟寺：全钟内外阳铸铭文 23 万余字，铜锡铅配比达声学黄金律。',
    tone: 'CINNABAR',
    cameraFocus: { yawRad: 0.36, pitchRad: -0.14, zoom: 3.3 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },

  // 2. Ming Bronze Armillary Sphere (4 pins)
  {
    id: 'pin_armillary_horizon',
    artifactId: 'armillary_sphere',
    partId: 'horizon_ring',
    localOffset: { x: 0.48, y: 0.14, z: 0.26 },
    titleZh: '二十四方位水准沟',
    craftCategoryZh: '基准校准',
    eraOrPeriodZh: '明正统二年—七年（1437—1442）',
    mechanicsSummaryZh: '环面精刻环形水槽，注水即成绝对水平天文参考面。',
    craftDetailZh: '紫金山天文台实存浑仪仍保留精密水准槽与 24 方位凸耳，保证数百年观星零倾角漂移。',
    tone: 'BRONZE',
    cameraFocus: { yawRad: 0.55, pitchRad: 0.32, zoom: 3.6 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_armillary_ecliptic',
    artifactId: 'armillary_sphere',
    partId: 'ecliptic_ring',
    localOffset: { x: -0.32, y: 0.34, z: 0.28 },
    titleZh: '23.5° 黄赤交角铆接',
    craftCategoryZh: '天球几何',
    eraOrPeriodZh: '明正统官铸 · 朱铜刻度镶嵌',
    mechanicsSummaryZh: '与赤道环固定交角 23.5°，直映太阳周年视运动轨迹。',
    craftDetailZh: '春秋二分点恰落于黄赤双环交接铆钉处，使二十四节气推演具备三维直观实体坐标。',
    tone: 'CINNABAR',
    cameraFocus: { yawRad: -0.48, pitchRad: 0.26, zoom: 3.4 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_armillary_meridian',
    artifactId: 'armillary_sphere',
    partId: 'meridian_ring',
    localOffset: { x: 0.08, y: 0.46, z: 0.34 },
    titleZh: '北京 39.9° 北极出地轴',
    craftCategoryZh: '旋转主架',
    eraOrPeriodZh: '北京古观象台纬度制式',
    mechanicsSummaryZh: '双子午环夹持 12 枚铜铆柱，承载三辰仪全重并定极轴。',
    craftDetailZh: '北极轴仰角按观象台地理纬度钻孔精配，令天穹周日视运动在双环间平滑复现。',
    tone: 'BRONZE',
    cameraFocus: { yawRad: 1.05, pitchRad: 0.18, zoom: 3.55 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_armillary_dragon',
    artifactId: 'armillary_sphere',
    partId: 'dragon_base',
    localOffset: { x: 0.36, y: 0.1, z: -0.22 },
    titleZh: '四柱云龙抗风底座',
    craftCategoryZh: '铸铜结构',
    eraOrPeriodZh: '明代宫廷失蜡精铸 · 重逾数吨',
    mechanicsSummaryZh: '四柱 S 形斜撑构成空间三角稳固基座，抑制高台风振。',
    craftDetailZh: '行云盘龙既是皇家仪制纹饰，也通过变截面铸铜腿把数吨环体荷载稳稳导入十字底梁。',
    tone: 'CINNABAR',
    cameraFocus: { yawRad: 0.68, pitchRad: -0.1, zoom: 3.65 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },

  // 3. Song-Ming Xuande Censer (4 pins)
  {
    id: 'pin_censer_lid',
    artifactId: 'xuande_censer',
    partId: 'lotus_lid',
    localOffset: { x: 0.28, y: 0.18, z: 0.18 },
    titleZh: '十二瓣莲盖伯努利烟道',
    craftCategoryZh: '热流体力学',
    eraOrPeriodZh: '明宣德三年（1428）· 失蜡镂空铸造',
    mechanicsSummaryZh: '顶孔与周缘莲瓣形成微压差，稳定层流香烟笔直缓升。',
    craftDetailZh: '盖沿子母口严密咬合以控氧防侧风，让沉香细烟聚而不散，营造书房静心视觉焦点。',
    tone: 'BRONZE',
    cameraFocus: { yawRad: 0.5, pitchRad: 0.34, zoom: 3.35 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_censer_tray',
    artifactId: 'xuande_censer',
    partId: 'incense_tray',
    localOffset: { x: -0.32, y: 0.14, z: 0.24 },
    titleZh: '四圈沉香篆 · 两刻半计时',
    craftCategoryZh: '书房仪式',
    eraOrPeriodZh: '宋代文人香谱 · 约 25 分钟一篆',
    mechanicsSummaryZh: '低导热多孔香灰床供氧隔热，匀速缓燃不焦不熄。',
    craftDetailZh: '古人打香篆以一盘燃尽约两刻半（近 25 分钟）计功课，与左翼沉浸番茄专注钟跨越千年同频。',
    tone: 'CINNABAR',
    cameraFocus: { yawRad: -0.45, pitchRad: 0.42, zoom: 3.2 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_censer_body',
    artifactId: 'xuande_censer',
    partId: 'censer_body',
    localOffset: { x: 0.38, y: 0.04, z: 0.22 },
    titleZh: '十二炼栗壳包浆厚胎',
    craftCategoryZh: '冶金工艺',
    eraOrPeriodZh: '明代风磨铜十二炼 · 栗壳色皮壳',
    mechanicsSummaryZh: '高热容厚铜壁均匀蓄热，令沉香油脂温和挥发无烟焦味。',
    craftDetailZh: '在宋代烛映 2450K 侧光下，64 段精密旋削铜腹呈现深邃温润的秋栗金铜高光过渡。',
    tone: 'BRONZE',
    cameraFocus: { yawRad: 0.72, pitchRad: 0.12, zoom: 3.3 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_censer_ears',
    artifactId: 'xuande_censer',
    partId: 'bridge_ears',
    localOffset: { x: 0.42, y: 0.16, z: -0.14 },
    titleZh: '对称桥耳热阻结构',
    craftCategoryZh: '人因设计',
    eraOrPeriodZh: '宋韵明炉 · 江南案头清供典范',
    mechanicsSummaryZh: '收窄截面积构成热阻桥，减少炉腹高温传至双耳持握区。',
    craftDetailZh: '宣德炉谱以耳式定雅俗，流畅弧耳兼顾移炉防烫手功能与东方器物轮廓张力。',
    tone: 'CINNABAR',
    cameraFocus: { yawRad: 1.24, pitchRad: 0.2, zoom: 3.4 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },

  // 4. Spatial Origami Pagoda (4 pins)
  {
    id: 'pin_pagoda_shell',
    artifactId: 'origami_pagoda',
    partId: 'tier1_shell',
    localOffset: { x: 0.36, y: 0.12, z: 0.24 },
    titleZh: '三浦交替山谷折痕筒壳',
    craftCategoryZh: '薄壳力学',
    eraOrPeriodZh: '当代参数化计算构型（2026）',
    mechanicsSummaryZh: '折面几何显著提高截面惯性矩，薄板可承受百倍自重轴压。',
    craftDetailZh: '单片平面折网无需胶水即可空间展开锁形，将古典八角塔身转译为可计算折纸薄壳。',
    tone: 'BRONZE',
    cameraFocus: { yawRad: 0.52, pitchRad: 0.18, zoom: 3.55 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_pagoda_wings',
    artifactId: 'origami_pagoda',
    partId: 'tier2_wings',
    localOffset: { x: -0.36, y: 0.16, z: 0.26 },
    titleZh: '菱形飞檐环向加劲肋',
    craftCategoryZh: '抗屈曲构造',
    eraOrPeriodZh: '致敬应县木塔八角收分比例',
    mechanicsSummaryZh: '外挑菱形折翼抑制筒壳侧向局部屈曲，同时柔化顶部漫反射。',
    craftDetailZh: '桧木暖色与竹叶苔绿折面搭配，避免高反光视觉疲劳，适配 XR 头显长时间研读。',
    tone: 'BRONZE',
    cameraFocus: { yawRad: -0.64, pitchRad: 0.26, zoom: 3.45 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_pagoda_waist',
    artifactId: 'origami_pagoda',
    partId: 'waist_rib',
    localOffset: { x: 0.32, y: 0.1, z: -0.22 },
    titleZh: '朱砂腰檐力学锁环',
    craftCategoryZh: '层间卡扣',
    eraOrPeriodZh: '仿古建平坐层构造 · 黄金分割腰线',
    mechanicsSummaryZh: '刚性闭环箍紧上下折面径向扩张，实现快速插接装配。',
    craftDetailZh: '以极克制朱砂漆木环点睛全塔腰线，在空间剖面切片模式下可清晰透视内部锁槽。',
    tone: 'CINNABAR',
    cameraFocus: { yawRad: 0.84, pitchRad: 0.24, zoom: 3.35 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  },
  {
    id: 'pin_pagoda_spire',
    artifactId: 'origami_pagoda',
    partId: 'bronze_spire',
    localOffset: { x: 0.24, y: 0.18, z: 0.24 },
    titleZh: '鎏金七重相轮塔刹',
    craftCategoryZh: '竖向调谐',
    eraOrPeriodZh: '东方古塔相轮意象 · 古铜精铸',
    mechanicsSummaryZh: '中心穿心轴杆拉结采光折穹并充当顶部配重调谐标尺。',
    craftDetailZh: '在美术馆顶光 4400K 照射下，七重相轮边缘呈现锐利古铜高光，收束整塔竖向节奏。',
    tone: 'CINNABAR',
    cameraFocus: { yawRad: 0.3, pitchRad: 0.38, zoom: 3.3 },
    isCustom: false,
    createdAtIso: '2026-11-25T09:00:00+08:00'
  }
];

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function sanitizeLocalOffset(offset?: Vec3 | null): Vec3 {
  if (!offset || !isFiniteNum(offset.x) || !isFiniteNum(offset.y) || !isFiniteNum(offset.z)) {
    return { x: 0.28, y: 0.16, z: 0.24 };
  }
  const clamp = (n: number) => Math.min(MAX_LOCAL_OFFSET_M, Math.max(-MAX_LOCAL_OFFSET_M, n));
  return {
    x: clamp(offset.x),
    y: clamp(offset.y),
    z: clamp(offset.z)
  };
}

export function computeDirectionalLightVector(presetId: StudioLightingPresetId, radius = 5.8): Vec3 {
  const spec = STUDIO_LIGHTING_PRESETS[presetId] ?? STUDIO_LIGHTING_PRESETS.KYOTO_MORNING;
  const az = (spec.azimuthDeg * Math.PI) / 180;
  const el = (spec.elevationDeg * Math.PI) / 180;
  const safeR = isFiniteNum(radius) && radius > 0 ? radius : 5.8;
  return {
    x: safeR * Math.cos(el) * Math.sin(az),
    y: safeR * Math.sin(el),
    z: safeR * Math.cos(el) * Math.cos(az)
  };
}

export function resolveAnchorWorldPosition(anchor: SpatialCalloutAnchor, partLivePosition: Vec3): Vec3 {
  const safePart =
    partLivePosition &&
    isFiniteNum(partLivePosition.x) &&
    isFiniteNum(partLivePosition.y) &&
    isFiniteNum(partLivePosition.z)
      ? partLivePosition
      : { x: 0, y: 0, z: 0 };
  const safeOffset = sanitizeLocalOffset(anchor.localOffset);
  return {
    x: safePart.x + safeOffset.x,
    y: safePart.y + safeOffset.y,
    z: safePart.z + safeOffset.z
  };
}

export function isValidLightingPreset(id: unknown): id is StudioLightingPresetId {
  return id === 'KYOTO_MORNING' || id === 'GALLERY_ZENITH' || id === 'WARM_LANTERN';
}

export function createSpatialAnchorState(
  activeArtifactId = 'dougong_bell',
  customAnchors: SpatialCalloutAnchor[] = [],
  lightingPreset: StudioLightingPresetId = 'KYOTO_MORNING'
): SpatialAnchorState {
  const anchorsByArtifact: Record<string, SpatialCalloutAnchor[]> = {};
  for (const pin of BUILTIN_CALLOUT_ANCHORS) {
    if (!anchorsByArtifact[pin.artifactId]) {
      anchorsByArtifact[pin.artifactId] = [];
    }
    anchorsByArtifact[pin.artifactId].push({ ...pin, localOffset: { ...pin.localOffset }, cameraFocus: { ...pin.cameraFocus } });
  }
  for (const custom of customAnchors) {
    if (!custom || !custom.artifactId || !custom.partId || !custom.titleZh?.trim()) continue;
    if (!anchorsByArtifact[custom.artifactId]) {
      anchorsByArtifact[custom.artifactId] = [];
    }
    if (anchorsByArtifact[custom.artifactId].some((a) => a.id === custom.id)) continue;
    anchorsByArtifact[custom.artifactId].push({
      ...custom,
      localOffset: sanitizeLocalOffset(custom.localOffset),
      isCustom: true
    });
  }

  const activeList = anchorsByArtifact[activeArtifactId] ?? [];
  return {
    activeArtifactId,
    anchorsByArtifact,
    selectedAnchorId: activeList[0]?.id ?? null,
    showPinsIn3D: true,
    lightingPreset: isValidLightingPreset(lightingPreset) ? lightingPreset : 'KYOTO_MORNING'
  };
}

export function getAnchorsForArtifact(
  state: SpatialAnchorState,
  artifactId = state.activeArtifactId
): SpatialCalloutAnchor[] {
  return state.anchorsByArtifact[artifactId] ?? [];
}

export function getSelectedAnchor(state: SpatialAnchorState): SpatialCalloutAnchor | null {
  if (!state.selectedAnchorId) return null;
  for (const list of Object.values(state.anchorsByArtifact)) {
    const found = list.find((a) => a.id === state.selectedAnchorId);
    if (found) return found;
  }
  return null;
}

export function switchAnchorArtifact(
  state: SpatialAnchorState,
  nextArtifactId: string
): SpatialAnchorState {
  const list = state.anchorsByArtifact[nextArtifactId] ?? [];
  return {
    ...state,
    activeArtifactId: nextArtifactId,
    selectedAnchorId: list[0]?.id ?? null
  };
}

export function selectCalloutAnchor(
  state: SpatialAnchorState,
  anchorId: string
): SelectAnchorResult {
  for (const [artifactId, list] of Object.entries(state.anchorsByArtifact)) {
    const found = list.find((a) => a.id === anchorId);
    if (found) {
      const nextState: SpatialAnchorState = {
        ...state,
        activeArtifactId: artifactId,
        selectedAnchorId: found.id
      };
      return {
        found: true,
        anchor: found,
        partId: found.partId,
        cameraFocus: { ...found.cameraFocus },
        state: nextState
      };
    }
  }
  return {
    found: false,
    anchor: null,
    partId: null,
    cameraFocus: null,
    state
  };
}

export function syncSelectedAnchorToPart(
  state: SpatialAnchorState,
  artifactId: string,
  partId: string
): SpatialAnchorState {
  const list = state.anchorsByArtifact[artifactId] ?? [];
  const matched = list.find((a) => a.partId === partId);
  if (!matched) {
    return state;
  }
  return {
    ...state,
    activeArtifactId: artifactId,
    selectedAnchorId: matched.id
  };
}

export function addCustomCalloutAnchor(
  state: SpatialAnchorState,
  input: AddCustomAnchorInput
): AnchorMutationResult {
  const title = (input.titleZh ?? '').trim();
  const detail = (input.craftDetailZh ?? '').trim();
  if (!title) {
    return {
      ok: false,
      anchor: null,
      errorZh: '请先输入空间批注钉标题（不能为空）。',
      state
    };
  }
  if (!detail) {
    return {
      ok: false,
      anchor: null,
      errorZh: '请补充构造力学或工艺批注内容（不能为空）。',
      state
    };
  }
  if (!input.artifactId || !input.partId) {
    return {
      ok: false,
      anchor: null,
      errorZh: '未指定绑定的三维展品或构件。',
      state
    };
  }

  const existing = state.anchorsByArtifact[input.artifactId] ?? [];
  const customIndex = existing.filter((a) => a.isCustom).length;
  const fallbackOffset: Vec3 = {
    x: (customIndex % 2 === 0 ? 1 : -1) * (0.26 + (customIndex % 3) * 0.08),
    y: 0.22 + (customIndex % 3) * 0.07,
    z: 0.24
  };
  const safeTitle = title.slice(0, MAX_TITLE_LENGTH);
  const safeDetail = detail.slice(0, MAX_DETAIL_LENGTH);
  const nowIso = input.nowIso ?? new Date().toISOString().slice(0, 19);
  const id = `pin_custom_${input.artifactId}_${Date.now()}_${customIndex + 1}`;

  const anchor: SpatialCalloutAnchor = {
    id,
    artifactId: input.artifactId,
    partId: input.partId,
    localOffset: sanitizeLocalOffset(input.localOffset ?? fallbackOffset),
    titleZh: safeTitle,
    craftCategoryZh: (input.craftCategoryZh ?? '自定义空间钉').trim() || '自定义空间钉',
    eraOrPeriodZh: (input.eraOrPeriodZh ?? '现场研学批注').trim() || '现场研学批注',
    mechanicsSummaryZh: safeDetail.slice(0, 64),
    craftDetailZh: safeDetail,
    tone: input.tone === 'BRONZE' ? 'BRONZE' : 'CINNABAR',
    cameraFocus: input.cameraFocus ?? {
      yawRad: (customIndex % 2 === 0 ? 1 : -1) * 0.62,
      pitchRad: 0.26,
      zoom: 3.45
    },
    isCustom: true,
    createdAtIso: nowIso
  };

  const nextState: SpatialAnchorState = {
    ...state,
    activeArtifactId: input.artifactId,
    anchorsByArtifact: {
      ...state.anchorsByArtifact,
      [input.artifactId]: [...existing, anchor]
    },
    selectedAnchorId: anchor.id
  };

  return {
    ok: true,
    anchor,
    errorZh: null,
    state: nextState
  };
}

export function deleteCustomCalloutAnchor(
  state: SpatialAnchorState,
  anchorId: string
): AnchorMutationResult {
  for (const [artifactId, list] of Object.entries(state.anchorsByArtifact)) {
    const target = list.find((a) => a.id === anchorId);
    if (!target) continue;
    if (!target.isCustom) {
      return {
        ok: false,
        anchor: target,
        errorZh: '馆藏标准构造锚点不可删除，仅支持删除自定义空间批注钉。',
        state
      };
    }
    const filtered = list.filter((a) => a.id !== anchorId);
    const nextSelected =
      state.selectedAnchorId === anchorId ? filtered[0]?.id ?? null : state.selectedAnchorId;
    return {
      ok: true,
      anchor: target,
      errorZh: null,
      state: {
        ...state,
        anchorsByArtifact: {
          ...state.anchorsByArtifact,
          [artifactId]: filtered
        },
        selectedAnchorId: nextSelected
      }
    };
  }
  return {
    ok: false,
    anchor: null,
    errorZh: `未找到锚点 ${anchorId}。`,
    state
  };
}

export function setStudioLightingPreset(
  state: SpatialAnchorState,
  presetId: StudioLightingPresetId
): SpatialAnchorState {
  if (!isValidLightingPreset(presetId)) return state;
  return {
    ...state,
    lightingPreset: presetId
  };
}

export function setShowPinsIn3D(state: SpatialAnchorState, visible: boolean): SpatialAnchorState {
  return {
    ...state,
    showPinsIn3D: Boolean(visible)
  };
}

export function extractCustomAnchors(state: SpatialAnchorState): SpatialCalloutAnchor[] {
  const result: SpatialCalloutAnchor[] = [];
  for (const list of Object.values(state.anchorsByArtifact)) {
    for (const item of list) {
      if (item.isCustom) result.push(item);
    }
  }
  return result;
}

export function serializeCustomAnchors(state: SpatialAnchorState): string {
  return JSON.stringify(extractCustomAnchors(state));
}

export function deserializeCustomAnchors(rawJson: string | null | undefined): SpatialCalloutAnchor[] {
  if (!rawJson || typeof rawJson !== 'string') return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];
    const valid: SpatialCalloutAnchor[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.artifactId === 'string' &&
        typeof item.partId === 'string' &&
        typeof item.titleZh === 'string' &&
        item.titleZh.trim().length > 0 &&
        typeof item.craftDetailZh === 'string' &&
        item.craftDetailZh.trim().length > 0
      ) {
        const rawFocus = item.cameraFocus;
        const safeFocus: CameraFocusTarget =
          rawFocus &&
          isFiniteNum(rawFocus.yawRad) &&
          isFiniteNum(rawFocus.pitchRad) &&
          isFiniteNum(rawFocus.zoom)
            ? {
                yawRad: rawFocus.yawRad,
                pitchRad: Math.max(-1.0, Math.min(1.0, rawFocus.pitchRad)),
                zoom: Math.max(2.4, Math.min(5.2, rawFocus.zoom))
              }
            : { yawRad: 0.56, pitchRad: 0.25, zoom: 3.5 };
        valid.push({
          id: item.id,
          artifactId: item.artifactId,
          partId: item.partId,
          localOffset: sanitizeLocalOffset(item.localOffset),
          titleZh: item.titleZh.trim().slice(0, MAX_TITLE_LENGTH),
          craftCategoryZh:
            typeof item.craftCategoryZh === 'string' && item.craftCategoryZh.trim()
              ? item.craftCategoryZh.trim()
              : '自定义空间钉',
          eraOrPeriodZh:
            typeof item.eraOrPeriodZh === 'string' && item.eraOrPeriodZh.trim()
              ? item.eraOrPeriodZh.trim()
              : '现场研学批注',
          mechanicsSummaryZh:
            typeof item.mechanicsSummaryZh === 'string' && item.mechanicsSummaryZh.trim()
              ? item.mechanicsSummaryZh.trim()
              : item.craftDetailZh.trim().slice(0, 64),
          craftDetailZh: item.craftDetailZh.trim().slice(0, MAX_DETAIL_LENGTH),
          tone: item.tone === 'BRONZE' ? 'BRONZE' : 'CINNABAR',
          cameraFocus: safeFocus,
          isCustom: true,
          createdAtIso: typeof item.createdAtIso === 'string' ? item.createdAtIso : '2026-11-25T10:00:00+08:00'
        });
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export function loadPersistedCustomAnchors(storage?: Pick<Storage, 'getItem'> | null): SpatialCalloutAnchor[] {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return [];
    return deserializeCustomAnchors(store.getItem(CUSTOM_ANCHORS_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function savePersistedCustomAnchors(
  state: SpatialAnchorState,
  storage?: Pick<Storage, 'setItem'> | null
): boolean {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return false;
    store.setItem(CUSTOM_ANCHORS_STORAGE_KEY, serializeCustomAnchors(state));
    return true;
  } catch {
    return false;
  }
}
