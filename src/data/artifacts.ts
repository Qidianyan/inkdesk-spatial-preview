export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type PanelId = 'STAGE_CENTER' | 'AUDIO_FOCUS_LEFT' | 'NOTES_INSPECTOR_RIGHT';
export type LayoutPreset = 'SURROUND_ARC' | 'FOCUS_SINGLE' | 'SIDE_BY_SIDE_COMPARE';
export type AmbientLightingTheme = 'DAWN' | 'AFTERNOON' | 'CANDLELIGHT';
export type SoundAnchorId = 'PINE_WIND' | 'EAVES_RAIN' | 'CHARCOAL_TEA' | 'CHIME_BELLS';

export interface ArtifactPart {
  id: string;
  nameZh: string;
  nameEn: string;
  dynastyOrEra: string;
  materialZh: string;
  materialHex: string;
  basePosition: Vec3;
  explodeOffset: Vec3;
  dimensionsMm: Vec3;
  mechanicsPrinciple: string;
  historicalNote: string;
}

export interface SpatialArtifact {
  id: string;
  glbPath: string;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  eraZh: string;
  summaryZh: string;
  totalDimensionsMm: Vec3;
  parts: ArtifactPart[];
}

export interface SpatialAudioAnchor {
  id: SoundAnchorId;
  titleZh: string;
  subtitleZh: string;
  accentHex: string;
  enabled: boolean;
  gain: number;
  positionMeters: Vec3;
}

export interface SpatialNote {
  id: string;
  artifactId: string;
  partId: string;
  partNameZh: string;
  content: string;
  pinned: boolean;
  createdAtIso: string;
}

export interface FocusTimerState {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  completedSessions: number;
}

export const AMBIENT_THEMES: Record<
  AmbientLightingTheme,
  { labelZh: string; kelvin: number; descZh: string }
> = {
  DAWN: { labelZh: '晨曦', kelvin: 5400, descZh: '浅灰钛金玻璃 · 京都桧木柔光' },
  AFTERNOON: { labelZh: '午后', kelvin: 4300, descZh: '建筑暖石 · 拉丝古铜日光' },
  CANDLELIGHT: { labelZh: '烛夜', kelvin: 2700, descZh: '深钛炭磨砂玻璃 · 护眼暗调' }
};

export const LAYOUT_PRESETS: Record<
  LayoutPreset,
  { labelZh: string; subtitleZh: string }
> = {
  SURROUND_ARC: { labelZh: '环绕模式', subtitleZh: '三窗弧形环绕，沉浸研学协同' },
  FOCUS_SINGLE: { labelZh: '专注单窗', subtitleZh: '聚焦 3D 器物主舞台，收起双翼' },
  SIDE_BY_SIDE_COMPARE: { labelZh: '并排对比', subtitleZh: '3D 拆解台与结构批注平行对照' }
};

export const ARTIFACT_CATALOG: SpatialArtifact[] = [
  {
    id: 'dougong_bell',
    glbPath: '/models/yongle_dougong.glb',
    titleZh: '永乐大钟斗拱榫卯',
    titleEn: 'Yongle Bell Dougong Joinery',
    subtitleZh: '明代官式重檐五踩斗拱 · 无钉柔性抗震节点',
    eraZh: '明永乐年间（约 1420 年）',
    summaryZh:
      '以层叠木构件通过燕尾榫与十字开口咬合，将大屋檐悬挑荷载逐级分散传导至立柱，在地震中以摩擦耗能实现百年不倒。',
    totalDimensionsMm: { x: 840, y: 680, z: 780 },
    parts: [
      {
        id: 'ludou',
        nameZh: '栌斗（坐斗）',
        nameEn: 'Ludou Capital Block',
        dynastyOrEra: '明代官式',
        materialZh: '老料楠木',
        materialHex: '#7B5438',
        basePosition: { x: 0, y: -0.42, z: 0 },
        explodeOffset: { x: 0, y: -0.58, z: 0 },
        dimensionsMm: { x: 320, y: 200, z: 320 },
        mechanicsPrinciple:
          '位于整组斗拱最底部柱头之上，以十字斗口承托华拱与泥道拱，将上部弯矩转化为均匀轴向压应力。',
        historicalNote:
          '《营造法式》称大斗，明清官式称坐斗，其斗耳与斗腰比例决定整攒斗拱模数（斗口制）。'
      },
      {
        id: 'huagong',
        nameZh: '华拱（翘）',
        nameEn: 'Huagong Cantilever Arm',
        dynastyOrEra: '明代官式',
        materialZh: '深雪松木',
        materialHex: '#9C6B43',
        basePosition: { x: 0, y: -0.14, z: 0 },
        explodeOffset: { x: 0, y: -0.1, z: 0.56 },
        dimensionsMm: { x: 140, y: 160, z: 660 },
        mechanicsPrinciple:
          '垂直于墙面伸出的双臂悬挑梁，承担屋檐外跳弯矩，与泥道拱形成正交十字锁定。',
        historicalNote:
          '单翘双昂结构中，华拱率先向外迈出一跳，为屋檐排水与深远出檐奠定第一级杠杆。'
      },
      {
        id: 'nidaogong',
        nameZh: '泥道拱（正心瓜拱）',
        nameEn: 'Nidaogong Transverse Arm',
        dynastyOrEra: '明代官式',
        materialZh: '黄花梨木',
        materialHex: '#B07C4F',
        basePosition: { x: 0, y: -0.12, z: 0 },
        explodeOffset: { x: -0.62, y: 0.05, z: 0 },
        dimensionsMm: { x: 620, y: 150, z: 130 },
        mechanicsPrinciple:
          '平行于建筑正面布置，与华拱在中心半榫咬合，抵御沿檐口方向的侧向剪切与扭转。',
        historicalNote:
          '因嵌于墙面泥道之上得名，是连接相邻攒斗拱、形成整体空间桁架的关键横系件。'
      },
      {
        id: 'jiaohudou',
        nameZh: '交互斗与散斗组',
        nameEn: 'Jiaohudou & Sandou Blocks',
        dynastyOrEra: '明代官式',
        materialZh: '温润柏木',
        materialHex: '#C59663',
        basePosition: { x: 0, y: 0.14, z: 0 },
        explodeOffset: { x: 0.55, y: 0.24, z: 0.28 },
        dimensionsMm: { x: 460, y: 110, z: 460 },
        mechanicsPrinciple:
          '分布于拱端与正交节点的小斗群，如同机械万向垫片，在多向受力下保持木纤维不发生局部劈裂。',
        historicalNote:
          '每只散斗底部均留暗销槽，与下层拱背木栓咬合，拆装全程不费一钉一铆。'
      },
      {
        id: 'ang_lever',
        nameZh: '下昂斜杠杆梁',
        nameEn: 'Inclined Ang Lever',
        dynastyOrEra: '明代官式',
        materialZh: '朱漆松木',
        materialHex: '#D9532F',
        basePosition: { x: 0, y: 0.28, z: 0.06 },
        explodeOffset: { x: 0, y: 0.42, z: 0.62 },
        dimensionsMm: { x: 135, y: 165, z: 760 },
        mechanicsPrinciple:
          '利用真实斜置杠杆原理，以内尾承接屋顶自重配重，平衡外檐挑出重量，极大减小立柱倾覆力矩。',
        historicalNote:
          '昂嘴削成锋利象鼻斜坡，既是力学翘板，也是殿宇檐下最具识别度的雕塑剪影。'
      },
      {
        id: 'shuatou',
        nameZh: '耍头与承重枋',
        nameEn: 'Shuatou & Lintel Beam',
        dynastyOrEra: '明代官式',
        materialZh: '古铜鎏金饰木',
        materialHex: '#C8A055',
        basePosition: { x: 0, y: 0.5, z: 0 },
        explodeOffset: { x: 0, y: 0.72, z: 0 },
        dimensionsMm: { x: 740, y: 150, z: 380 },
        mechanicsPrinciple:
          '最顶层压盖构件将椽望与檩条荷载汇集下传，锁死下方全部榫卯的竖向自由度。',
        historicalNote:
          '大钟寺藏经楼檐下重拱即借此收口，使木构屋盖与下方铸铜巨钟共享稳固声学空间。'
      },
      {
        id: 'yongle_crest',
        nameZh: '永乐大钟蒲牢钟纽',
        nameEn: 'Yongle Bell Pulao Crown',
        dynastyOrEra: '明永乐（北京大钟寺）',
        materialZh: '响铜合金',
        materialHex: '#B88D44',
        basePosition: { x: 0, y: -0.82, z: 0 },
        explodeOffset: { x: 0, y: -1.05, z: 0 },
        dimensionsMm: { x: 360, y: 320, z: 360 },
        mechanicsPrinciple:
          '钟体呈抛物线变壁厚壳体，口部加厚形成双基频拍音振动模态，传声数十里余音绵长。',
        historicalNote:
          '致敬决赛举办地北京大钟寺：全钟铸铭文 23 万余字，铜锡铅配比达声学黄金比例。'
      }
    ]
  },
  {
    id: 'armillary_sphere',
    glbPath: '/models/ming_armillary.glb',
    titleZh: '明代浑天仪',
    titleEn: 'Ming Bronze Armillary Sphere',
    subtitleZh: '中国古代球面天文坐标系 · 三辰嵌套测量仪',
    eraZh: '明正统年间（1437—1442 年）',
    summaryZh:
      '通过六合仪、三辰仪与四游仪三层同心青铜刻度环嵌套旋转，直接测得天体赤经、赤纬与黄道坐标。',
    totalDimensionsMm: { x: 920, y: 960, z: 920 },
    parts: [
      {
        id: 'horizon_ring',
        nameZh: '地平经环',
        nameEn: 'Horizon Azimuth Ring',
        dynastyOrEra: '明正统',
        materialZh: '铸青铜',
        materialHex: '#C8A055',
        basePosition: { x: 0, y: 0.12, z: 0 },
        explodeOffset: { x: 0, y: -0.35, z: 0 },
        dimensionsMm: { x: 840, y: 45, z: 840 },
        mechanicsPrinciple:
          '环面刻二十四方位与水槽水准沟，校平后构成整个天文仪器的基准参考水平面。',
        historicalNote:
          '明代紫金山天文台实存浑仪仍保留精密水槽，注水即知四方是否水平。'
      },
      {
        id: 'meridian_ring',
        nameZh: '子午双环',
        nameEn: 'Meridian Double Ring',
        dynastyOrEra: '明正统',
        materialZh: '古铜',
        materialHex: '#A67C3B',
        basePosition: { x: 0, y: 0.12, z: 0 },
        explodeOffset: { x: 0, y: 0.45, z: 0 },
        dimensionsMm: { x: 800, y: 800, z: 52 },
        mechanicsPrinciple:
          '正南北竖立的刚性主框架，两端精密钻孔确立天球南北极转轴，承受内部旋转环全部重量。',
        historicalNote:
          '北极出地高度依观象台纬度设定（北京约 39.9°），直观呈现天穹周日视运动。'
      },
      {
        id: 'equatorial_ring',
        nameZh: '赤道刻度环',
        nameEn: 'Equatorial Ring',
        dynastyOrEra: '明正统',
        materialZh: '鎏金青铜',
        materialHex: '#D6AE60',
        basePosition: { x: 0, y: 0.12, z: 0 },
        explodeOffset: { x: 0.55, y: 0.18, z: 0.35 },
        dimensionsMm: { x: 710, y: 42, z: 710 },
        mechanicsPrinciple:
          '与极轴严格正交，刻三百六十五度四分度之一，用于直读二十八宿入宿度（赤经）。',
        historicalNote:
          '中国古代天文学以赤道坐标体系为核心，较欧洲第谷时代早逾千年。'
      },
      {
        id: 'ecliptic_ring',
        nameZh: '黄道斜环',
        nameEn: 'Ecliptic Inclined Ring',
        dynastyOrEra: '明正统',
        materialZh: '朱铜合金',
        materialHex: '#D9532F',
        basePosition: { x: 0, y: 0.12, z: 0 },
        explodeOffset: { x: -0.55, y: 0.28, z: 0.35 },
        dimensionsMm: { x: 660, y: 38, z: 660 },
        mechanicsPrinciple:
          '与赤道环呈 23.5° 黄赤交角固定铆接，模拟太阳周年视运动轨迹与二十四节气节点。',
        historicalNote:
          '春秋二分点恰位于黄赤双环交接处，使历法推算具备直观空间几何映射。'
      },
      {
        id: 'sight_tube',
        nameZh: '四游仪与窥管',
        nameEn: 'Alidade Sighting Tube',
        dynastyOrEra: '明正统',
        materialZh: '精磨黄铜',
        materialHex: '#E2BE73',
        basePosition: { x: 0, y: 0.12, z: 0 },
        explodeOffset: { x: 0, y: 0.12, z: 0.72 },
        dimensionsMm: { x: 580, y: 70, z: 70 },
        mechanicsPrinciple:
          '可绕极轴与去极轴二自由度转动，瞄准目标星体后即可在双环游标同时读取角坐标。',
        historicalNote:
          '管内加设十字丝与细缝，减少肉眼视差，角度测量精度可达数角分。'
      },
      {
        id: 'dragon_base',
        nameZh: '云龙托架与十字底座',
        nameEn: 'Dragon Pillar Base',
        dynastyOrEra: '明正统',
        materialZh: '深棕铸铜',
        materialHex: '#4F3828',
        basePosition: { x: 0, y: -0.58, z: 0 },
        explodeOffset: { x: 0, y: -0.95, z: 0 },
        dimensionsMm: { x: 760, y: 320, z: 760 },
        mechanicsPrinciple:
          '四柱斜撑构成立体三角形稳定结构，降低整机重心并抑制大风引起的微幅晃动。',
        historicalNote:
          '底座四角雕铸行云盘龙，融汇宫廷铸造工艺与结构抗倾覆力学。'
      }
    ]
  },
  {
    id: 'xuande_censer',
    glbPath: '/models/xuande_censer.glb',
    titleZh: '宋式宣德炉',
    titleEn: 'Song-Ming Xuande Censer',
    subtitleZh: '文人书房铜炉典范 · 热对流篆香声景容器',
    eraZh: '宋韵明制（15 世纪）',
    summaryZh:
      '融合失蜡法精铸厚胎铜器与自然空气热对流通道，香烟经镂空莲瓣盖缓升聚而不散，是东方书房的静心锚点。',
    totalDimensionsMm: { x: 240, y: 260, z: 240 },
    parts: [
      {
        id: 'lotus_lid',
        nameZh: '镂空莲瓣炉盖',
        nameEn: 'Openwork Lotus Lid',
        dynastyOrEra: '明宣德制式',
        materialZh: '鎏金古铜',
        materialHex: '#C8A055',
        basePosition: { x: 0, y: 0.42, z: 0 },
        explodeOffset: { x: 0, y: 0.88, z: 0 },
        dimensionsMm: { x: 176, y: 78, z: 176 },
        mechanicsPrinciple:
          '顶孔与周缘莲瓣孔形成伯努利微压差，引导香烟形成缓慢层流烟柱而不受侧风吹散。',
        historicalNote:
          '盖纽多作瑞兽或含苞青莲，开合严丝合缝以控氧延缓香篆燃速。'
      },
      {
        id: 'incense_tray',
        nameZh: '沉香篆印灰盘',
        nameEn: 'Ash & Incense Seal Tray',
        dynastyOrEra: '宋式书房',
        materialZh: '香灰细砂',
        materialHex: '#D9CDB8',
        basePosition: { x: 0, y: 0.18, z: 0 },
        explodeOffset: { x: 0, y: 0.46, z: 0.32 },
        dimensionsMm: { x: 154, y: 32, z: 154 },
        mechanicsPrinciple:
          '多孔轻质草木灰层具有极低导热系数，既向香粉底部缓供微氧，又隔绝高温传至炉底。',
        historicalNote:
          '宋人打香篆常以一篆燃尽计时约两刻半（近 25 分钟），与现代番茄专注周期异曲同工。'
      },
      {
        id: 'censer_body',
        nameZh: '蚰龙厚胎铜炉腹',
        nameEn: 'Thick-Walled Bronze Body',
        dynastyOrEra: '明宣德',
        materialZh: '栗壳色精铜',
        materialHex: '#7D4B2A',
        basePosition: { x: 0, y: -0.02, z: 0 },
        explodeOffset: { x: 0, y: 0, z: 0 },
        dimensionsMm: { x: 210, y: 118, z: 210 },
        mechanicsPrinciple:
          '高热容厚铜壁在燃香阶段均匀蓄热，避免局部过热产生焦糊味，令沉香油脂温和挥发。',
        historicalNote:
          '传说风磨铜经十二炼铸成，经手盘养后呈现出温润如秋栗般的包浆光泽。'
      },
      {
        id: 'bridge_ears',
        nameZh: '双桥耳（冲天/蚰耳）',
        nameEn: 'Twin Arched Handles',
        dynastyOrEra: '宋式明炉',
        materialZh: '古铜包浆',
        materialHex: '#B07E43',
        basePosition: { x: 0, y: 0.08, z: 0 },
        explodeOffset: { x: 0.68, y: 0.14, z: 0 },
        dimensionsMm: { x: 240, y: 65, z: 38 },
        mechanicsPrinciple:
          '对称弧耳截面积收窄形成热阻桥，减少炉腹热量传导至持握部位，兼顾移炉手感与轮廓张力。',
        historicalNote:
          '宣德炉谱以耳式定品，桥耳、蚰耳最受明代江南文人案头推崇。'
      },
      {
        id: 'tripod_feet',
        nameZh: '三乳鼎足',
        nameEn: 'Three Tripod Feet',
        dynastyOrEra: '明宣德',
        materialZh: '精铸铜足',
        materialHex: '#8C5835',
        basePosition: { x: 0, y: -0.3, z: 0 },
        explodeOffset: { x: 0, y: -0.45, z: 0.24 },
        dimensionsMm: { x: 170, y: 52, z: 170 },
        mechanicsPrinciple:
          '三点定面几何原则保证在不平整木案上绝不晃动，同时在炉底形成空气对流散热间隙。',
        historicalNote:
          '三足呈等边三角分布，承袭商周礼器鼎足的庄重气度而化繁为简。'
      },
      {
        id: 'cedar_stand',
        nameZh: '紫檀海棠雕花座',
        nameEn: 'Carved Cedar Pedestal',
        dynastyOrEra: '明清案头',
        materialZh: '深雪松/紫檀',
        materialHex: '#3D2B1F',
        basePosition: { x: 0, y: -0.52, z: 0 },
        explodeOffset: { x: 0, y: -0.88, z: 0 },
        dimensionsMm: { x: 236, y: 44, z: 236 },
        mechanicsPrinciple:
          '宽底矮座扩大支撑多边形并隔离铜炉余温，保护书案漆面不受烫伤。',
        historicalNote:
          '器座相配为明式书房清供规矩，深木色反衬栗壳铜炉的暖金光晕。'
      }
    ]
  },
  {
    id: 'origami_pagoda',
    glbPath: '/models/origami_pagoda.glb',
    titleZh: '空间折纸几何塔',
    titleEn: 'Spatial Origami Pagoda',
    subtitleZh: '参数化折面薄壳塔 · 东方古塔与现代折纸力学融合',
    eraZh: '当代空间计算构型（2026）',
    summaryZh:
      '受应县木塔八角收分与三浦折纸（Miura-ori）薄壳启发，以零胶水可展折面层叠出高刚度轻量化空间结构。',
    totalDimensionsMm: { x: 420, y: 880, z: 420 },
    parts: [
      {
        id: 'octa_plinth',
        nameZh: '八角须弥折面基座',
        nameEn: 'Octagonal Folded Plinth',
        dynastyOrEra: '参数化构型',
        materialZh: '深雪松木板',
        materialHex: '#4B3425',
        basePosition: { x: 0, y: -0.66, z: 0 },
        explodeOffset: { x: 0, y: -0.96, z: 0 },
        dimensionsMm: { x: 420, y: 120, z: 420 },
        mechanicsPrinciple:
          '八边形折边将塔身集中荷载均匀扩散至地基，抗风压各向同性远优于方形截面。',
        historicalNote:
          '呼应辽代应县木塔八角平面，现代数字制造以单片激光切折成形。'
      },
      {
        id: 'tier1_shell',
        nameZh: '初层折面筒壳',
        nameEn: 'Tier-1 Pleated Shell',
        dynastyOrEra: '折纸薄壳',
        materialZh: '雪花石膏宣纸板',
        materialHex: '#EFE6D6',
        basePosition: { x: 0, y: -0.34, z: 0 },
        explodeOffset: { x: 0, y: -0.44, z: 0.36 },
        dimensionsMm: { x: 350, y: 200, z: 350 },
        mechanicsPrinciple:
          '交替山谷折痕大幅提高薄壁截面惯性矩，使 2mm 纸板承受自身百倍以上的竖向轴压。',
        historicalNote:
          '展开后为单一连续平面网图，便于在空间计算界面中演示二维到三维的拓扑折叠。'
      },
      {
        id: 'tier2_wings',
        nameZh: '中层菱形飞檐翼',
        nameEn: 'Tier-2 Diamond Eave Wings',
        dynastyOrEra: '折纸薄壳',
        materialZh: '竹叶墨绿染纸',
        materialHex: '#3F5E46',
        basePosition: { x: 0, y: -0.02, z: 0 },
        explodeOffset: { x: 0.56, y: 0.02, z: 0 },
        dimensionsMm: { x: 330, y: 175, z: 330 },
        mechanicsPrinciple:
          '外挑菱形折翼充当环向加劲肋，有效抑制薄壳受压屈曲，并形成柔光漫反射遮阳檐。',
        historicalNote:
          '以竹叶墨绿点缀暖白宣纸折面，降低 XR 头显长时间注视下的高光视觉疲劳。'
      },
      {
        id: 'waist_rib',
        nameZh: '腰檐力学锁环',
        nameEn: 'Waist Compression Ring',
        dynastyOrEra: '参数化构型',
        materialZh: '朱柿漆木',
        materialHex: '#D9532F',
        basePosition: { x: 0, y: 0.24, z: 0 },
        explodeOffset: { x: -0.54, y: 0.28, z: 0 },
        dimensionsMm: { x: 260, y: 68, z: 260 },
        mechanicsPrinciple:
          '作为层间刚性箍环约束折纸壳体径向扩张，实现上下两层折面的快速卡扣装配。',
        historicalNote:
          '借用古建平坐层构造思想，以一抹朱柿色标定整塔黄金分割腰线。'
      },
      {
        id: 'upper_dome',
        nameZh: '顶层采光折穹',
        nameEn: 'Upper Origami Lantern Dome',
        dynastyOrEra: '折纸薄壳',
        materialZh: '暖象牙柔光纸',
        materialHex: '#F5EFE6',
        basePosition: { x: 0, y: 0.48, z: 0 },
        explodeOffset: { x: 0, y: 0.64, z: -0.34 },
        dimensionsMm: { x: 210, y: 165, z: 210 },
        mechanicsPrinciple:
          '八瓣折面向上收拢成自承重穹顶壳，内部空腔可嵌入漫射柔光体作为空间灯笼。',
        historicalNote:
          '在烛夜模式下成为室内柔和主光源，映射出温暖的几何折影。'
      },
      {
        id: 'bronze_spire',
        nameZh: '鎏金相轮塔刹',
        nameEn: 'Gilt Bronze Finial Spire',
        dynastyOrEra: '东方建筑意象',
        materialZh: '香槟古铜',
        materialHex: '#C8A055',
        basePosition: { x: 0, y: 0.78, z: 0 },
        explodeOffset: { x: 0, y: 1.08, z: 0 },
        dimensionsMm: { x: 92, y: 210, z: 92 },
        mechanicsPrinciple:
          '中心穿心轴杆拉结上层穹顶与塔身，兼具配重调谐阻尼与空间视觉垂直标尺作用。',
        historicalNote:
          '由覆钵、相轮与宝珠抽象化演进而成，为整座参数化折纸塔赋予东方神韵。'
      }
    ]
  }
];

export const INITIAL_SOUND_ANCHORS: SpatialAudioAnchor[] = [
  {
    id: 'PINE_WIND',
    titleZh: '古刹松风',
    subtitleZh: '左前松林微风穿堂',
    accentHex: '#3F5E46',
    enabled: true,
    gain: 0.72,
    positionMeters: { x: -1.35, y: 0.35, z: -1.1 }
  },
  {
    id: 'EAVES_RAIN',
    titleZh: '檐下雨滴',
    subtitleZh: '右前瓦当细雨轻敲',
    accentHex: '#C8A055',
    enabled: true,
    gain: 0.56,
    positionMeters: { x: 1.3, y: 0.45, z: -0.95 }
  },
  {
    id: 'CHARCOAL_TEA',
    titleZh: '炭火烹茶',
    subtitleZh: '近侧泥炉松炭沸水',
    accentHex: '#D9532F',
    enabled: true,
    gain: 0.64,
    positionMeters: { x: -0.75, y: -0.25, z: -0.65 }
  },
  {
    id: 'CHIME_BELLS',
    titleZh: '编钟泛音',
    subtitleZh: '远景青铜礼乐余韵',
    accentHex: '#B0853E',
    enabled: false,
    gain: 0.45,
    positionMeters: { x: 0.95, y: 0.2, z: -1.85 }
  }
];

export const INITIAL_NOTES: SpatialNote[] = [
  {
    id: 'note_1',
    artifactId: 'dougong_bell',
    partId: 'ang_lever',
    partNameZh: '下昂斜杠杆梁',
    content: '将拆解滑块拉至 65% 可清晰观测下昂斜尾与坐斗的杠杆支点关系，无需铁钉即可平衡挑檐弯矩。',
    pinned: true,
    createdAtIso: '2026-11-23T14:20:00+08:00'
  },
  {
    id: 'note_2',
    artifactId: 'dougong_bell',
    partId: 'ludou',
    partNameZh: '栌斗（坐斗）',
    content: '坐斗十字开口构成模数基准，华拱与泥道拱在此正交锁定，形成抗震阻尼核心。',
    pinned: false,
    createdAtIso: '2026-11-23T14:28:00+08:00'
  },
  {
    id: 'note_3',
    artifactId: 'armillary_sphere',
    partId: 'ecliptic_ring',
    partNameZh: '黄道斜环',
    content: '黄赤交角 23.5° 在空间环绕视野中一目了然，二分点正好与赤道环相交。',
    pinned: true,
    createdAtIso: '2026-11-23T15:05:00+08:00'
  },
  {
    id: 'note_4',
    artifactId: 'origami_pagoda',
    partId: 'tier2_wings',
    partNameZh: '中层菱形飞檐翼',
    content: '竹叶墨绿菱形折翼充当环向加劲肋，展开拆解后可清晰观察山谷折痕与腰檐锁环的咬合关系。',
    pinned: true,
    createdAtIso: '2026-11-23T15:40:00+08:00'
  }
];

export function findArtifact(id: string): SpatialArtifact {
  return ARTIFACT_CATALOG.find((item) => item.id === id) ?? ARTIFACT_CATALOG[0];
}

export function findPart(artifactId: string, partId: string): ArtifactPart {
  const artifact = findArtifact(artifactId);
  return artifact.parts.find((part) => part.id === partId) ?? artifact.parts[0];
}
