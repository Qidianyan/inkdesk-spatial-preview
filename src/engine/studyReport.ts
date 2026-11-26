import {
  AMBIENT_THEMES,
  LAYOUT_PRESETS,
  findArtifact,
  findPart,
  type AmbientLightingTheme,
  type FocusTimerState,
  type LayoutPreset,
  type SpatialAudioAnchor,
  type SpatialNote
} from '../data/artifacts';
import {
  STUDIO_LIGHTING_PRESETS,
  type SpatialCalloutAnchor,
  type StudioLightingPresetId
} from '../spatial/calloutAnchors';
import { measureDistanceMm } from './explodedModel';

export function formatFocusClock(remainingSeconds: number): string {
  const safe = Math.max(0, Math.floor(remainingSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface StudyReportInput {
  artifactId: string;
  selectedPartId: string;
  comparePartId: string | null;
  explodeProgress: number;
  crossSectionEnabled: boolean;
  layoutPreset: LayoutPreset;
  ambientTheme: AmbientLightingTheme;
  lightingPreset?: StudioLightingPresetId;
  calloutAnchors?: SpatialCalloutAnchor[];
  soundAnchors: SpatialAudioAnchor[];
  focusTimer: FocusTimerState;
  notes: SpatialNote[];
}

export function generateStudyReportMarkdown(input: StudyReportInput): string {
  const artifact = findArtifact(input.artifactId);
  const part = findPart(artifact.id, input.selectedPartId);
  const artifactNotes = input.notes.filter((n) => n.artifactId === artifact.id);
  const activeSounds = input.soundAnchors.filter((a) => a.enabled);
  const theme = AMBIENT_THEMES[input.ambientTheme];
  const layout = LAYOUT_PRESETS[input.layoutPreset];
  const studio = STUDIO_LIGHTING_PRESETS[input.lightingPreset ?? 'KYOTO_MORNING'];
  const caliperMm = input.comparePartId
    ? measureDistanceMm(artifact, part.id, input.comparePartId, input.explodeProgress)
    : 0;

  const lines: string[] = [
    `# 砚境空间 · 研学报告：${artifact.titleZh}`,
    '',
    `- **英文名称**：${artifact.titleEn}`,
    `- **年代与制式**：${artifact.eraZh}`,
    `- **当前空间布局**：${layout.labelZh} | 界面色温：${theme.labelZh}（${theme.kelvin}K） | 展台影棚：${studio.labelZh}（${studio.kelvin}K）`,
    `- **拆解进度**：${Math.round(input.explodeProgress * 100)}% | 剖面模式：${input.crossSectionEnabled ? '开启' : '关闭'}`,
    `- **专注计时**：已累计完成 ${input.focusTimer.completedSessions} 个番茄钟（当前剩余 ${formatFocusClock(input.focusTimer.remainingSeconds)}）`,
    '',
    '## 器物综述',
    artifact.summaryZh,
    '',
    `## 当前检视构件：${part.nameZh}（${part.nameEn}）`,
    `- **材质**：${part.materialZh}`,
    `- **尺寸（mm）**：${part.dimensionsMm.x} × ${part.dimensionsMm.y} × ${part.dimensionsMm.z}`
  ];

  if (caliperMm > 0 && input.comparePartId) {
    const cmpPart = findPart(artifact.id, input.comparePartId);
    lines.push(`- **空间卡尺测距（至 ${cmpPart.nameZh}）**：${caliperMm.toFixed(1)} mm`);
  }

  lines.push(
    `- **力学原理**：${part.mechanicsPrinciple}`,
    `- **历史注记**：${part.historicalNote}`
  );

  if (input.calloutAnchors && input.calloutAnchors.length > 0) {
    lines.push('', `## 3D 空间批注锚点（共 ${input.calloutAnchors.length} 枚）`);
    for (const pin of input.calloutAnchors) {
      const tag = pin.isCustom ? '[自定义空间钉] ' : `[${pin.craftCategoryZh}] `;
      lines.push(`- ${tag}**${pin.titleZh}**（${pin.eraOrPeriodZh}）：${pin.craftDetailZh}`);
    }
  }

  lines.push('', '## 空间声景锚点配置');

  if (activeSounds.length === 0) {
    lines.push('- 当前所有空间声源处于静音状态');
  } else {
    for (const a of activeSounds) {
      lines.push(
        `- **${a.titleZh}**：音量 ${Math.round(a.gain * 100)}% | 空间坐标 (${a.positionMeters.x.toFixed(2)}m, ${a.positionMeters.y.toFixed(2)}m, ${a.positionMeters.z.toFixed(2)}m)`
      );
    }
  }

  lines.push('', `## 空间手记（共 ${artifactNotes.length} 条）`);
  if (artifactNotes.length === 0) {
    lines.push('- 暂无手记记录');
  } else {
    for (const n of artifactNotes) {
      const pinTag = n.pinned ? '[置顶] ' : '';
      lines.push(`- ${pinTag}**[${n.partNameZh}]** ${n.content} _(${n.createdAtIso})_`);
    }
  }

  return `${lines.join('\n')}\n`;
}
