import React, { useRef, useState } from 'react';
import {
  AMBIENT_THEMES,
  type AmbientLightingTheme,
  type FocusTimerState,
  type SoundAnchorId,
  type SpatialAudioAnchor,
  type Vec3
} from '../data/artifacts';
import { clampAnchorPosition, evaluateSpatialAudioAnchor } from '../engine/spatialAudioMath';
import { formatFocusClock } from '../engine/studyReport';
import { Flame, Pause, Play, RotateCcw, Sun, Sunrise, Volume2, VolumeX } from 'lucide-react';

interface AudioFocusDockProps {
  anchors: SpatialAudioAnchor[];
  headYawDegrees: number;
  audioEngineActive: boolean;
  focusTimer: FocusTimerState;
  ambientTheme: AmbientLightingTheme;
  onToggleAudioEngine: () => void;
  onToggleAnchor: (id: SoundAnchorId) => void;
  onChangeAnchorGain: (id: SoundAnchorId, gain: number) => void;
  onMoveAnchor: (id: SoundAnchorId, pos: Vec3) => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSetAmbientTheme: (theme: AmbientLightingTheme) => void;
}

const RADAR_SIZE = 196;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_MAX_METERS = 2.6;

function worldToRadar(x: number, z: number): { cx: number; cy: number } {
  const scale = (RADAR_SIZE * 0.44) / RADAR_MAX_METERS;
  return {
    cx: RADAR_CENTER + x * scale,
    cy: RADAR_CENTER + z * scale
  };
}

function radarToWorld(px: number, py: number, currentY: number): Vec3 {
  const scale = (RADAR_SIZE * 0.44) / RADAR_MAX_METERS;
  const wx = (px - RADAR_CENTER) / scale;
  const wz = (py - RADAR_CENTER) / scale;
  return clampAnchorPosition({ x: wx, y: currentY, z: wz });
}

export const AudioFocusDock: React.FC<AudioFocusDockProps> = ({
  anchors,
  headYawDegrees,
  audioEngineActive,
  focusTimer,
  ambientTheme,
  onToggleAudioEngine,
  onToggleAnchor,
  onChangeAnchorGain,
  onMoveAnchor,
  onToggleTimer,
  onResetTimer,
  onSetAmbientTheme
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingId, setDraggingId] = useState<SoundAnchorId | null>(null);

  const renderStates = anchors.map((a) => evaluateSpatialAudioAnchor(a, { x: 0, y: 0, z: 0 }, headYawDegrees));
  const stateById = Object.fromEntries(renderStates.map((s) => [s.anchorId, s]));

  const handleRadarMove = (ev: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * RADAR_SIZE;
    const y = ((ev.clientY - rect.top) / rect.height) * RADAR_SIZE;
    const target = anchors.find((a) => a.id === draggingId);
    if (!target) return;
    onMoveAnchor(draggingId, radarToWorld(x, y, target.positionMeters.y));
  };

  const timerProgress =
    focusTimer.totalSeconds > 0
      ? (focusTimer.totalSeconds - focusTimer.remainingSeconds) / focusTimer.totalSeconds
      : 0;
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const dashOffset = ringCircumference * (1 - timerProgress);

  return (
    <aside
      className="spatial-panel wing-panel left-wing"
      aria-label="左翼悬浮窗 B：空间声景锚点与专注计时坞"
      data-testid="panel-audio-left"
    >
      <header className="panel-header compact">
        <div>
          <h2 className="panel-title">空间声景与专注坞</h2>
          <p className="panel-subtitle">左翼四路 HRTF 声源锚点</p>
        </div>
        <button
          type="button"
          data-testid="audio-engine-btn"
          className={`audio-master-btn ${audioEngineActive ? 'active' : ''}`}
          onClick={onToggleAudioEngine}
        >
          {audioEngineActive ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>{audioEngineActive ? 'HRTF 已开启' : '开启空间音频'}</span>
        </button>
      </header>

      {/* Interactive 3D Spatial Sound Radar Map */}
      <div className="acoustic-radar-card">
        <div className="radar-header">
          <span>3D 声源坐标（拖拽锚点）</span>
          <span className="radar-yaw">视点 {headYawDegrees > 0 ? `+${headYawDegrees}` : headYawDegrees}°</span>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
          className="acoustic-radar-svg"
          data-testid="acoustic-radar-svg"
          onPointerMove={handleRadarMove}
          onPointerUp={() => setDraggingId(null)}
          onPointerLeave={() => setDraggingId(null)}
        >
          {/* Distance rings: 1m, 2m */}
          <circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_SIZE * 0.17} className="radar-ring" />
          <circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_SIZE * 0.34} className="radar-ring" />
          <circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_SIZE * 0.46} className="radar-ring outer" />
          <line x1={RADAR_CENTER} y1={10} x2={RADAR_CENTER} y2={RADAR_SIZE - 10} className="radar-axis" />
          <line x1={10} y1={RADAR_CENTER} x2={RADAR_SIZE - 10} y2={RADAR_CENTER} className="radar-axis" />

          {/* Listener FOV cone rotated by headYawDegrees */}
          <g transform={`translate(${RADAR_CENTER}, ${RADAR_CENTER}) rotate(${headYawDegrees})`}>
            <path d="M 0 0 L -28 -54 A 60 60 0 0 1 28 -54 Z" className="listener-fov" />
            <circle cx={0} cy={0} r={8} className="listener-head" />
            <polygon points="0,-13 -4,-6 4,-6" className="listener-nose" />
          </g>

          {/* 4 Movable Sound Anchors */}
          {anchors.map((anchor) => {
            const pos = worldToRadar(anchor.positionMeters.x, anchor.positionMeters.z);
            return (
              <g
                key={anchor.id}
                data-testid={`radar-anchor-${anchor.id}`}
                className={`radar-anchor ${anchor.enabled ? 'enabled' : 'muted'}`}
                transform={`translate(${pos.cx}, ${pos.cy})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingId(anchor.id);
                }}
              >
                {anchor.enabled && (
                  <circle cx={0} cy={0} r={14 + anchor.gain * 6} fill={anchor.accentHex} fillOpacity={0.18} />
                )}
                <circle cx={0} cy={0} r={9} fill={anchor.enabled ? anchor.accentHex : '#8B7968'} stroke="#F5EFE6" strokeWidth={2} />
                <text x={0} y={20} textAnchor="middle" className="radar-anchor-label">
                  {anchor.titleZh.slice(0, 2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 4 Sound Anchor Channels with Live L/R Binaural Telemetry */}
      <div className="anchor-list">
        {anchors.map((anchor) => {
          const st = stateById[anchor.id];
          const pct = Math.round(anchor.gain * 100);
          return (
            <div key={anchor.id} className={`anchor-row ${anchor.enabled ? 'active' : 'muted'}`}>
              <div className="anchor-top">
                <label className="anchor-toggle-label">
                  <input
                    type="checkbox"
                    checked={anchor.enabled}
                    onChange={() => onToggleAnchor(anchor.id)}
                  />
                  <span>
                    <strong>{anchor.titleZh}</strong>
                    <small>
                      方位 {Math.round(st.azimuthDegrees)}° · {st.distanceMeters.toFixed(2)}m
                    </small>
                  </span>
                </label>
                <div className="binaural-meters" title="实时左右耳 HRTF 增益">
                  <span>L {Math.round(st.leftGain * 100)}</span>
                  <span>R {Math.round(st.rightGain * 100)}</span>
                </div>
              </div>
              <input
                type="range"
                className="ink-range slim"
                min={0}
                max={100}
                value={pct}
                aria-label={`${anchor.titleZh}音量`}
                aria-valuetext={`${anchor.titleZh}音量 ${pct}%`}
                style={
                  {
                    '--attr-min': 0,
                    '--attr-max': 100,
                    '--control-value': pct
                  } as React.CSSProperties
                }
                onChange={(e) => onChangeAnchorGain(anchor.id, Number(e.target.value) / 100)}
              />
            </div>
          );
        })}
      </div>

      {/* 25-Minute Immersive Pomodoro Focus Timer */}
      <div className="pomodoro-card">
        <div className="pomodoro-ring-wrap">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={ringRadius} className="pomo-track" />
            <circle
              cx="32"
              cy="32"
              r={ringRadius}
              className="pomo-progress"
              strokeDasharray={ringCircumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="pomo-sessions">{focusTimer.completedSessions}轮</span>
        </div>
        <div className="pomodoro-meta">
          <span className="pomo-label">沉浸研学番茄钟</span>
          <strong className="pomo-clock" data-testid="pomo-clock">
            {formatFocusClock(focusTimer.remainingSeconds)}
          </strong>
        </div>
        <div className="pomodoro-actions">
          <button
            type="button"
            data-testid="pomo-toggle-btn"
            className="pomo-btn primary"
            onClick={onToggleTimer}
            title={focusTimer.isRunning ? '暂停专注' : '开始专注'}
          >
            {focusTimer.isRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button type="button" className="pomo-btn" onClick={onResetTimer} title="重置 25:00">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Ambient Color Temperature Switcher */}
      <div className="ambience-switcher" role="group" aria-label="环境光色温切换">
        {(Object.keys(AMBIENT_THEMES) as AmbientLightingTheme[]).map((themeKey) => {
          const item = AMBIENT_THEMES[themeKey];
          const active = ambientTheme === themeKey;
          return (
            <button
              key={themeKey}
              type="button"
              data-testid={`theme-${themeKey}`}
              className={`ambience-btn ${active ? 'active' : ''}`}
              onClick={() => onSetAmbientTheme(themeKey)}
            >
              {themeKey === 'DAWN' ? (
                <Sunrise size={13} />
              ) : themeKey === 'AFTERNOON' ? (
                <Sun size={13} />
              ) : (
                <Flame size={13} />
              )}
              <span>{item.labelZh}</span>
              <small>{item.kelvin}K</small>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
