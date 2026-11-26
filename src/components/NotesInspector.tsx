import React, { useState } from 'react';
import {
  LAYOUT_PRESETS,
  type ArtifactPart,
  type LayoutPreset,
  type SpatialArtifact,
  type SpatialNote
} from '../data/artifacts';
import type { CalloutPinTone, SpatialCalloutAnchor } from '../spatial/calloutAnchors';
import {
  BookOpen,
  Download,
  FileText,
  MapPin,
  Pin,
  Plus,
  RotateCcw,
  Ruler,
  Trash2,
  X
} from 'lucide-react';

interface NotesInspectorProps {
  artifact: SpatialArtifact;
  selectedPart: ArtifactPart;
  comparePartId: string | null;
  caliperDistanceMm: number;
  layoutPreset: LayoutPreset;
  calloutAnchors: SpatialCalloutAnchor[];
  selectedAnchorId: string | null;
  notes: SpatialNote[];
  markdownReport: string;
  onSelectPart: (partId: string) => void;
  onSelectAnchor: (anchorId: string) => void;
  onAddCustomAnchor: (
    titleZh: string,
    craftDetailZh: string,
    tone?: CalloutPinTone
  ) => { ok: boolean; errorZh: string | null };
  onDeleteCustomAnchor: (anchorId: string) => void;
  onChangeComparePart: (partId: string) => void;
  onAddNote: (content: string) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onChangeLayoutPreset: (preset: LayoutPreset) => void;
  onResetWorkspace: () => void;
}

export const NotesInspector: React.FC<NotesInspectorProps> = ({
  artifact,
  selectedPart,
  comparePartId,
  caliperDistanceMm,
  layoutPreset,
  calloutAnchors,
  selectedAnchorId,
  notes,
  markdownReport,
  onSelectPart,
  onSelectAnchor,
  onAddCustomAnchor,
  onDeleteCustomAnchor,
  onChangeComparePart,
  onAddNote,
  onTogglePin,
  onDeleteNote,
  onChangeLayoutPreset,
  onResetWorkspace
}) => {
  const [pinTitle, setPinTitle] = useState('');
  const [pinDetail, setPinDetail] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [draft, setDraft] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  const artifactNotes = notes.filter((n) => n.artifactId === artifact.id);

  const handleSubmitAnchor = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onAddCustomAnchor(pinTitle, pinDetail, 'CINNABAR');
    if (!res.ok) {
      setPinError(res.errorZh);
      return;
    }
    setPinError(null);
    setPinTitle('');
    setPinDetail('');
  };

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onAddNote(draft.trim());
    setDraft('');
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `砚境空间_${artifact.titleZh}_研学报告.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      className="spatial-panel wing-panel right-wing"
      aria-label="右翼悬浮窗 C：空间手记与结构批注面板"
      data-testid="panel-notes-right"
    >
      <header className="panel-header compact">
        <div>
          <h2 className="panel-title">空间锚点与结构批注</h2>
          <p className="panel-subtitle">右翼构件与 3D 批注钉双向聚焦</p>
        </div>
        <button
          type="button"
          className="icon-pill-btn"
          onClick={onResetWorkspace}
          title="一键重置三窗口空间排布"
        >
          <RotateCcw size={13} />
          <span>重置三窗</span>
        </button>
      </header>

      {/* Multi-Window Layout Mode Switcher */}
      <div className="layout-preset-bar" role="group" aria-label="三窗口空间排布模式">
        {(Object.keys(LAYOUT_PRESETS) as LayoutPreset[]).map((key) => {
          const item = LAYOUT_PRESETS[key];
          return (
            <button
              key={key}
              type="button"
              data-testid={`layout-${key}`}
              className={`layout-preset-btn ${layoutPreset === key ? 'active' : ''}`}
              onClick={() => onChangeLayoutPreset(key)}
            >
              {item.labelZh}
            </button>
          );
        })}
      </div>

      {/* Live Bidirectional Synced Structural Part Inspector */}
      <div className="inspector-card" data-testid="inspector-card">
        <div className="inspector-head">
          <div className="inspector-title-row">
            <span className="part-swatch" style={{ backgroundColor: selectedPart.materialHex }} />
            <div>
              <h3 data-testid="inspector-part-name">{selectedPart.nameZh}</h3>
              <small>{selectedPart.nameEn} · {selectedPart.materialZh}</small>
            </div>
          </div>
          <span className="era-badge">{selectedPart.dynastyOrEra}</span>
        </div>

        <div className="inspector-metrics">
          <span>
            尺寸：{selectedPart.dimensionsMm.x} × {selectedPart.dimensionsMm.y} × {selectedPart.dimensionsMm.z} mm
          </span>
          <label className="caliper-select-label">
            <Ruler size={12} />
            <span>测距至</span>
            <select
              value={comparePartId ?? ''}
              onChange={(e) => onChangeComparePart(e.target.value)}
            >
              {artifact.parts
                .filter((p) => p.id !== selectedPart.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameZh.split('（')[0]}
                  </option>
                ))}
            </select>
            <strong>{caliperDistanceMm.toFixed(1)} mm</strong>
          </label>
        </div>

        <div className="inspector-knowledge">
          <p>
            <strong>力学原理：</strong>
            {selectedPart.mechanicsPrinciple}
          </p>
        </div>
      </div>

      {/* Add Custom 3D Spatial Callout Pin (persisted to localStorage) */}
      <form className="callout-composer" onSubmit={handleSubmitAnchor} data-testid="callout-composer">
        <div className="callout-composer-head">
          <span className="callout-section-title">
            <MapPin size={12} /> 钉入「{selectedPart.nameZh.split('（')[0]}」
          </span>
          <button
            type="button"
            className="inline-mode-link"
            onClick={() => setShowNoteComposer((v) => !v)}
          >
            {showNoteComposer ? '收起手记' : `手记 (${artifactNotes.length})`}
          </button>
        </div>
        <div className="callout-composer-row">
          <input
            type="text"
            data-testid="callout-title-input"
            value={pinTitle}
            onChange={(e) => {
              setPinTitle(e.target.value);
              if (pinError) setPinError(null);
            }}
            placeholder="批注钉标题（如：燕尾榫防滑槽）"
            aria-label="自定义空间批注钉标题"
          />
          <button type="submit" data-testid="callout-submit-btn" className="note-add-btn">
            <Plus size={13} />
            <span>钉入</span>
          </button>
        </div>
        <input
          type="text"
          data-testid="callout-detail-input"
          className="callout-detail-input"
          value={pinDetail}
          onChange={(e) => {
            setPinDetail(e.target.value);
            if (pinError) setPinError(null);
          }}
          placeholder="输入构造力学、工期或工艺批注（自动持久化）…"
          aria-label="自定义空间批注钉内容"
        />
        {pinError && (
          <p className="callout-error-text" role="alert" data-testid="callout-error">
            {pinError}
          </p>
        )}
      </form>

      {/* Scrollable Bidirectional Spatial Callout Pins + Optional Sticky Notes */}
      <div className="notes-list" data-testid="callout-anchors-list">
        {calloutAnchors.map((anchor) => {
          const isFocused = anchor.id === selectedAnchorId;
          return (
            <article
              key={anchor.id}
              data-testid={`anchor-card-${anchor.id}`}
              className={`callout-pin-card ${isFocused ? 'focused' : ''}`}
            >
              <div className="note-card-top">
                <button
                  type="button"
                  data-testid={`anchor-focus-btn-${anchor.id}`}
                  className={`callout-jump-btn ${isFocused ? 'active' : ''}`}
                  onClick={() => onSelectAnchor(anchor.id)}
                  title="点击推镜聚焦该 3D 空间锚点钉"
                >
                  <span className={`callout-dot tone-${anchor.tone.toLowerCase()}`} />
                  <span>{anchor.titleZh}</span>
                </button>
                <div className="note-card-actions">
                  <span className="callout-cat-tag">{anchor.isCustom ? '自定义钉' : anchor.craftCategoryZh}</span>
                  {anchor.isCustom && (
                    <button
                      type="button"
                      data-testid={`anchor-delete-btn-${anchor.id}`}
                      className="mini-icon-btn danger"
                      onClick={() => onDeleteCustomAnchor(anchor.id)}
                      title="删除自定义空间批注钉"
                      aria-label={`删除 ${anchor.titleZh}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              {isFocused && (
                <div className="callout-expanded-body" data-testid="callout-expanded-detail">
                  <p className="callout-era-line">{anchor.eraOrPeriodZh}</p>
                  <p className="note-body">{anchor.craftDetailZh}</p>
                </div>
              )}
            </article>
          );
        })}

        {showNoteComposer && (
          <>
            <form className="note-composer" onSubmit={handleSubmitNote}>
              <input
                type="text"
                data-testid="note-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`记录「${selectedPart.nameZh.split('（')[0]}」的研学手记…`}
                aria-label="新增空间便签"
              />
              <button type="submit" data-testid="note-submit-btn" className="note-add-btn">
                <Plus size={14} />
                <span>记入</span>
              </button>
            </form>
            {artifactNotes.map((note) => (
              <article key={note.id} className={`note-card ${note.pinned ? 'pinned' : ''}`}>
                <div className="note-card-top">
                  <button
                    type="button"
                    className="note-part-jump"
                    onClick={() => onSelectPart(note.partId)}
                    title="点击定位至对应 3D 构件"
                  >
                    <BookOpen size={11} />
                    <span>{note.partNameZh}</span>
                  </button>
                  <div className="note-card-actions">
                    <button
                      type="button"
                      className={`mini-icon-btn ${note.pinned ? 'pinned' : ''}`}
                      onClick={() => onTogglePin(note.id)}
                      title={note.pinned ? '取消置顶' : '置顶便签'}
                    >
                      <Pin size={12} />
                    </button>
                    <button
                      type="button"
                      className="mini-icon-btn danger"
                      onClick={() => onDeleteNote(note.id)}
                      title="删除便签"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="note-body">{note.content}</p>
              </article>
            ))}
          </>
        )}
      </div>

      {/* Export Markdown Report Footer */}
      <div className="inspector-footer">
        <button
          type="button"
          data-testid="open-report-btn"
          className="action-btn bronze full-width"
          onClick={() => setShowReportModal(true)}
        >
          <FileText size={14} />
          <span>导出研学报告（{calloutAnchors.length} 钉 · {artifactNotes.length} 记）</span>
        </button>
      </div>

      {showReportModal && (
        <div className="report-drawer-backdrop" role="dialog" aria-modal="true" aria-label="Markdown 研学报告预览">
          <div className="report-drawer">
            <div className="report-drawer-head">
              <strong>研学报告预览（Markdown）</strong>
              <div className="report-drawer-actions">
                <button type="button" className="action-btn primary" onClick={handleDownloadMarkdown}>
                  <Download size={13} />
                  <span>下载 .md</span>
                </button>
                <button type="button" className="mini-icon-btn" onClick={() => setShowReportModal(false)} aria-label="关闭">
                  <X size={16} />
                </button>
              </div>
            </div>
            <pre className="report-preview-code" data-testid="markdown-report-preview">
              {markdownReport}
            </pre>
          </div>
        </div>
      )}
    </aside>
  );
};
