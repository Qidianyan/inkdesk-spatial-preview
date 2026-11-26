import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  INITIAL_NOTES,
  INITIAL_SOUND_ANCHORS,
  LAYOUT_PRESETS,
  findArtifact,
  findPart,
  type AmbientLightingTheme,
  type FocusTimerState,
  type LayoutPreset,
  type SoundAnchorId,
  type SpatialAudioAnchor,
  type SpatialNote,
  type Vec3
} from './data/artifacts';
import {
  assistSnapActiveStep,
  attemptSnapPart,
  createMortiseAssemblyState,
  getAssemblyProgress,
  moveAssemblyPart,
  resetMortiseAssembly,
  sanitizeCutawayState,
  setPartApproachRatio,
  updateCutawayPlane,
  type CutawayPlaneState,
  type MortiseAssemblyState
} from './assembly/mortiseAssembly';
import { measureDistanceMm } from './engine/explodedModel';
import { computeSpatialLayout } from './engine/spatialLayout';
import { generateStudyReportMarkdown } from './engine/studyReport';
import { WebSpatialSoundscapeEngine } from './engine/webSpatialAudio';
import { AudioFocusDock } from './components/AudioFocusDock';
import { SpatialStage3D, type StageInteractionMode } from './components/SpatialStage3D';
import { NotesInspector } from './components/NotesInspector';

export interface SnapPulseEvent {
  nonce: number;
  partId: string;
  position: Vec3;
  isComplete: boolean;
}

export const App: React.FC = () => {
  const [artifactId, setArtifactId] = useState<string>('dougong_bell');
  const [selectedPartId, setSelectedPartId] = useState<string>('ang_lever');
  const [comparePartId, setComparePartId] = useState<string | null>('ludou');
  const [stageMode, setStageMode] = useState<StageInteractionMode>('EXPLORE');
  const [explodeProgress, setExplodeProgress] = useState<number>(0.26);
  const [assemblyState, setAssemblyState] = useState<MortiseAssemblyState>(() =>
    createMortiseAssemblyState(findArtifact('dougong_bell'))
  );
  const assemblyStateRef = useRef<MortiseAssemblyState>(assemblyState);
  assemblyStateRef.current = assemblyState;
  const cutaway = assemblyState.cutaway;
  const [snapPulse, setSnapPulse] = useState<SnapPulseEvent | null>(null);
  const [sfxMuted, setSfxMuted] = useState<boolean>(false);
  const [autoOrbit, setAutoOrbit] = useState<boolean>(true);
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>('SURROUND_ARC');
  const [ambientTheme, setAmbientTheme] = useState<AmbientLightingTheme>('DAWN');
  const [headYawDegrees, setHeadYawDegrees] = useState<number>(0);
  const [soundAnchors, setSoundAnchors] = useState<SpatialAudioAnchor[]>(INITIAL_SOUND_ANCHORS);
  const [audioEngineActive, setAudioEngineActive] = useState<boolean>(false);
  const [notes, setNotes] = useState<SpatialNote[]>(INITIAL_NOTES);
  const [focusTimer, setFocusTimer] = useState<FocusTimerState>({
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    completedSessions: 1
  });

  const audioRef = useRef<WebSpatialSoundscapeEngine | null>(null);
  if (!audioRef.current) {
    audioRef.current = new WebSpatialSoundscapeEngine();
  }

  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setSfxMuted(sfxMuted);
  }, [sfxMuted]);

  useEffect(() => {
    if (audioEngineActive) {
      audioRef.current?.sync(soundAnchors, headYawDegrees);
    }
  }, [audioEngineActive, soundAnchors, headYawDegrees]);

  useEffect(() => {
    if (!focusTimer.isRunning) return;
    const id = window.setInterval(() => {
      setFocusTimer((prev) => {
        if (!prev.isRunning) return prev;
        if (prev.remainingSeconds <= 1) {
          return {
            ...prev,
            remainingSeconds: 0,
            isRunning: false,
            completedSessions: prev.completedSessions + 1
          };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [focusTimer.isRunning]);

  const artifact = useMemo(() => findArtifact(artifactId), [artifactId]);
  const selectedPart = useMemo(() => findPart(artifact.id, selectedPartId), [artifact.id, selectedPartId]);
  const panelPoses = useMemo(
    () => computeSpatialLayout(layoutPreset, { x: 0, y: 0, z: 0 }, headYawDegrees),
    [layoutPreset, headYawDegrees]
  );

  const caliperDistanceMm = useMemo(() => {
    if (!comparePartId) return 0;
    return measureDistanceMm(artifact, selectedPart.id, comparePartId, explodeProgress);
  }, [artifact, selectedPart.id, comparePartId, explodeProgress]);

  const markdownReport = useMemo(
    () =>
      generateStudyReportMarkdown({
        artifactId: artifact.id,
        selectedPartId: selectedPart.id,
        comparePartId,
        explodeProgress,
        crossSectionEnabled: cutaway.enabled,
        layoutPreset,
        ambientTheme,
        soundAnchors,
        focusTimer,
        notes
      }),
    [
      artifact.id,
      selectedPart.id,
      comparePartId,
      explodeProgress,
      cutaway.enabled,
      layoutPreset,
      ambientTheme,
      soundAnchors,
      focusTimer,
      notes
    ]
  );

  const commitAssemblyState = (next: MortiseAssemblyState) => {
    assemblyStateRef.current = next;
    setAssemblyState(next);
  };

  const handleSelectArtifact = (nextId: string) => {
    const next = findArtifact(nextId);
    const nextCutaway = sanitizeCutawayState({ enabled: false }, assemblyStateRef.current.cutaway);
    const nextAssembly = createMortiseAssemblyState(next, { cutaway: nextCutaway });
    setArtifactId(next.id);
    commitAssemblyState(nextAssembly);
    setSnapPulse(null);
    const firstActive = getAssemblyProgress(nextAssembly).activePartId ?? next.parts[0].id;
    setSelectedPartId(stageMode === 'ASSEMBLY' ? firstActive : next.parts[0].id);
    setComparePartId(next.parts[1]?.id ?? null);
    setExplodeProgress(0.22);
  };

  const handleSetStageMode = (nextMode: StageInteractionMode) => {
    setStageMode(nextMode);
    if (nextMode === 'ASSEMBLY') {
      setAutoOrbit(false);
      const activeId = getAssemblyProgress(assemblyStateRef.current).activePartId;
      if (activeId) {
        setSelectedPartId(activeId);
      }
    }
  };

  const handleSelectPart = (partId: string) => {
    setSelectedPartId(partId);
    if (comparePartId === partId) {
      const other = artifact.parts.find((p) => p.id !== partId);
      setComparePartId(other?.id ?? null);
    }
  };

  const handleUpdateCutaway = (patch: Partial<CutawayPlaneState>) => {
    const next = updateCutawayPlane(assemblyStateRef.current, patch);
    commitAssemblyState(next);
  };

  const handleMoveAssemblyPart = (partId: string, nextPos: Vec3, nextYawDeg?: number) => {
    const next = moveAssemblyPart(assemblyStateRef.current, partId, nextPos, nextYawDeg);
    commitAssemblyState(next);
  };

  const handleSetApproachRatio = (partId: string, ratio: number, yawDeg?: number) => {
    const next = setPartApproachRatio(assemblyStateRef.current, partId, ratio, yawDeg);
    commitAssemblyState(next);
  };

  const emitSnapFeedback = (
    partId: string,
    snapped: boolean,
    reason: string,
    completedJustNow: boolean,
    nextState: MortiseAssemblyState
  ) => {
    if (snapped) {
      const prog = getAssemblyProgress(nextState);
      audioRef.current?.playHinokiSnapSound(prog.progressRatio);
      if (completedJustNow) {
        audioRef.current?.playAssemblyCompleteChime();
      }
      const step = nextState.steps.find((s) => s.partId === partId);
      if (step) {
        setSnapPulse({
          nonce: Date.now() + Math.random(),
          partId,
          position: step.targetPosition,
          isComplete: completedJustNow
        });
      }
      const nextActive = prog.activePartId ?? partId;
      setSelectedPartId(nextActive);
    } else if (reason === 'OUT_OF_ORDER') {
      audioRef.current?.playSnapRejectThud();
    }
  };

  const handleAttemptSnapPart = (partId: string, candidatePos?: Vec3, candidateYawDeg?: number) => {
    const result = attemptSnapPart(assemblyStateRef.current, partId, candidatePos, candidateYawDeg);
    commitAssemblyState(result.state);
    emitSnapFeedback(partId, result.snapped, result.reason, result.completedJustNow, result.state);
  };

  const handleAssistSnapActive = () => {
    const activeId = getAssemblyProgress(assemblyStateRef.current).activePartId;
    const result = assistSnapActiveStep(assemblyStateRef.current);
    commitAssemblyState(result.state);
    if (activeId) {
      emitSnapFeedback(activeId, result.snapped, result.reason, result.completedJustNow, result.state);
    }
  };

  const handleResetAssembly = () => {
    const next = resetMortiseAssembly(assemblyStateRef.current);
    commitAssemblyState(next);
    setSnapPulse(null);
    const firstId = getAssemblyProgress(next).activePartId;
    if (firstId) setSelectedPartId(firstId);
  };

  const handleToggleAudioEngine = async () => {
    if (!audioRef.current) return;
    if (audioEngineActive) {
      audioRef.current.stop();
      setAudioEngineActive(false);
    } else {
      const started = await audioRef.current.start(soundAnchors, headYawDegrees);
      setAudioEngineActive(started);
    }
  };

  const handleToggleAnchor = (id: SoundAnchorId) => {
    setSoundAnchors((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const handleChangeAnchorGain = (id: SoundAnchorId, gain: number) => {
    setSoundAnchors((prev) => prev.map((a) => (a.id === id ? { ...a, gain } : a)));
  };

  const handleMoveAnchor = (id: SoundAnchorId, pos: Vec3) => {
    setSoundAnchors((prev) => prev.map((a) => (a.id === id ? { ...a, positionMeters: pos } : a)));
  };

  const handleAddNote = (content: string) => {
    const nowIso = new Date().toISOString().slice(0, 19);
    const note: SpatialNote = {
      id: `note_${Date.now()}`,
      artifactId: artifact.id,
      partId: selectedPart.id,
      partNameZh: selectedPart.nameZh,
      content,
      pinned: false,
      createdAtIso: nowIso
    };
    setNotes((prev) => [note, ...prev]);
  };

  const handleResetWorkspace = () => {
    setLayoutPreset('SURROUND_ARC');
    setHeadYawDegrees(0);
    setExplodeProgress(0.26);
    handleUpdateCutaway({ enabled: false, axis: 'Y', offsetMeters: 0.22 });
  };

  const leftVisible = panelPoses.AUDIO_FOCUS_LEFT.visible;
  const rightVisible = panelPoses.NOTES_INSPECTOR_RIGHT.visible;

  return (
    <div className={`inkdesk-viewport theme-${ambientTheme.toLowerCase()}`} data-layout={layoutPreset}>
      {/* Subtle XR Spatial Passthrough Architectural Backdrop */}
      <div className="xr-backdrop-grid" aria-hidden="true" />
      <div className="xr-ambient-glow" aria-hidden="true" />

      {/* Top PICO Spatial Multi-Window HUD Bar */}
      <header className="spatial-hud-bar">
        <div className="brand-lockup">
          <svg className="brand-mark" width="32" height="32" viewBox="0 0 36 36" aria-hidden="true">
            <rect x="2" y="2" width="32" height="32" rx="9" fill="#232220" stroke="#C98A3A" strokeWidth="1.5" />
            <path d="M9 14 H27 M12 19 H24 M15 10 V26 M21 10 V26" stroke="#F2F0EC" strokeWidth="2.0" strokeLinecap="round" />
            <circle cx="18" cy="18" r="3.2" fill="#D64527" />
          </svg>
          <div>
            <h1>砚境空间 · InkDesk Spatial</h1>
            <p>PICO Spatial SDK 6.2.8 浅灰钛金石面 × 京都桧木三窗空间书房</p>
          </div>
        </div>

        <div className="hud-controls">
          <div className="head-yaw-control">
            <label htmlFor="head-yaw-slider">头部朝向（HRTF）</label>
            <input
              id="head-yaw-slider"
              data-testid="head-yaw-slider"
              className="ink-range slim"
              type="range"
              min={-60}
              max={60}
              step={1}
              value={headYawDegrees}
              aria-valuetext={`头部朝向 ${headYawDegrees} 度`}
              style={
                {
                  '--attr-min': -60,
                  '--attr-max': 60,
                  '--control-value': headYawDegrees
                } as React.CSSProperties
              }
              onChange={(e) => setHeadYawDegrees(Number(e.target.value))}
            />
            <span className="yaw-readout">{headYawDegrees > 0 ? `+${headYawDegrees}°` : `${headYawDegrees}°`}</span>
          </div>

          <div className="hud-status-badge">
            <span className="status-dot" />
            <span>
              {LAYOUT_PRESETS[layoutPreset].labelZh} · 视距 {panelPoses.STAGE_CENTER.depthMeters.toFixed(2)}m ·{' '}
              {(leftVisible ? 1 : 0) + 1 + (rightVisible ? 1 : 0)} 空间窗在线
            </span>
          </div>
        </div>
      </header>

      {/* Three Floating Curved-Arc Spatial Windows */}
      <main
        className={`spatial-workspace layout-${layoutPreset.toLowerCase()}`}
        style={
          {
            '--head-shift-x': `${-headYawDegrees * 0.28}px`
          } as React.CSSProperties
        }
      >
        {leftVisible && (
          <div className="window-slot slot-left">
            <AudioFocusDock
              anchors={soundAnchors}
              headYawDegrees={headYawDegrees}
              audioEngineActive={audioEngineActive}
              focusTimer={focusTimer}
              ambientTheme={ambientTheme}
              onToggleAudioEngine={handleToggleAudioEngine}
              onToggleAnchor={handleToggleAnchor}
              onChangeAnchorGain={handleChangeAnchorGain}
              onMoveAnchor={handleMoveAnchor}
              onToggleTimer={() =>
                setFocusTimer((prev) => ({
                  ...prev,
                  remainingSeconds: prev.remainingSeconds <= 0 ? prev.totalSeconds : prev.remainingSeconds,
                  isRunning: !prev.isRunning
                }))
              }
              onResetTimer={() =>
                setFocusTimer((prev) => ({
                  ...prev,
                  remainingSeconds: prev.totalSeconds,
                  isRunning: false
                }))
              }
              onSetAmbientTheme={setAmbientTheme}
            />
          </div>
        )}

        <div className="window-slot slot-center">
          <SpatialStage3D
            artifact={artifact}
            selectedPartId={selectedPart.id}
            comparePartId={comparePartId}
            stageMode={stageMode}
            explodeProgress={explodeProgress}
            cutaway={cutaway}
            assemblyState={assemblyState}
            snapPulse={snapPulse}
            sfxMuted={sfxMuted}
            ambientTheme={ambientTheme}
            autoOrbit={autoOrbit}
            caliperDistanceMm={caliperDistanceMm}
            onSelectArtifact={handleSelectArtifact}
            onSelectPart={handleSelectPart}
            onSetStageMode={handleSetStageMode}
            onChangeExplode={setExplodeProgress}
            onUpdateCutaway={handleUpdateCutaway}
            onMoveAssemblyPart={handleMoveAssemblyPart}
            onSetApproachRatio={handleSetApproachRatio}
            onAttemptSnapPart={handleAttemptSnapPart}
            onAssistSnapActive={handleAssistSnapActive}
            onResetAssembly={handleResetAssembly}
            onToggleSfxMuted={() => setSfxMuted((m) => !m)}
            onToggleAutoOrbit={() => setAutoOrbit((v) => !v)}
          />
        </div>

        {rightVisible && (
          <div className="window-slot slot-right">
            <NotesInspector
              artifact={artifact}
              selectedPart={selectedPart}
              comparePartId={comparePartId}
              caliperDistanceMm={caliperDistanceMm}
              layoutPreset={layoutPreset}
              notes={notes}
              markdownReport={markdownReport}
              onSelectPart={handleSelectPart}
              onChangeComparePart={setComparePartId}
              onAddNote={handleAddNote}
              onTogglePin={(id) =>
                setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)))
              }
              onDeleteNote={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
              onChangeLayoutPreset={setLayoutPreset}
              onResetWorkspace={handleResetWorkspace}
            />
          </div>
        )}
      </main>

      {/* Bottom Spatial Dock Bar */}
      <footer className="spatial-dock-footer">
        {layoutPreset === 'FOCUS_SINGLE' ? (
          <button type="button" className="restore-wings-pill" onClick={() => setLayoutPreset('SURROUND_ARC')}>
            展开左右双翼空间窗（环绕模式）
          </button>
        ) : (
          <div className="pico-grab-indicator">
            <span className="grab-bar" />
            <span>MIT Open Source · Kotlin Jetpack Compose + PICO Spatial SDK 6.2.8</span>
          </div>
        )}
      </footer>
    </div>
  );
};
