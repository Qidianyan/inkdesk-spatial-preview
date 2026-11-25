import React, { useState } from 'react';
import {
  LAYOUT_PRESETS,
  type ArtifactPart,
  type LayoutPreset,
  type SpatialArtifact,
  type SpatialNote
} from '../data/artifacts';
import { BookOpen, Download, FileText, Pin, Plus, RotateCcw, Ruler, Trash2, X } from 'lucide-react';

interface NotesInspectorProps {
  artifact: SpatialArtifact;
  selectedPart: ArtifactPart;
  comparePartId: string | null;
  caliperDistanceMm: number;
  layoutPreset: LayoutPreset;
  notes: SpatialNote[];
  markdownReport: string;
  onSelectPart: (partId: string) => void;
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
  notes,
  markdownReport,
  onSelectPart,
  onChangeComparePart,
  onAddNote,
  onTogglePin,
  onDeleteNote,
  onChangeLayoutPreset,
  onResetWorkspace
}) => {
  const [draft, setDraft] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  const artifactNotes = notes.filter((n) => n.artifactId === artifact.id);

  const handleSubmit = (e: React.FormEvent) => {
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
          <h2 className="panel-title">结构批注与空间手记</h2>
          <p className="panel-subtitle">右翼构件力学实时双向同步</p>
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
          <p>
            <strong>历史注记：</strong>
            {selectedPart.historicalNote}
          </p>
        </div>
      </div>

      {/* Add Spatial Note Form */}
      <form className="note-composer" onSubmit={handleSubmit}>
        <input
          type="text"
          data-testid="note-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`记录「${selectedPart.nameZh.split('（')[0]}」的结构观察或笔记…`}
          aria-label="新增空间便签"
        />
        <button type="submit" data-testid="note-submit-btn" className="note-add-btn">
          <Plus size={14} />
          <span>记入</span>
        </button>
      </form>

      {/* Spatial Notes List */}
      <div className="notes-list" data-testid="notes-list">
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
          <span>导出 Markdown 研学报告（{artifactNotes.length} 条批注）</span>
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
