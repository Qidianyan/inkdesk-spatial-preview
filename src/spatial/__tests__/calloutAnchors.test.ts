import { describe, expect, it } from 'vitest';
import { ARTIFACT_CATALOG, findArtifact } from '../../data/artifacts';
import {
  attemptSnapPart,
  createMortiseAssemblyState,
  updateCutawayPlane
} from '../../assembly/mortiseAssembly';
import {
  BUILTIN_CALLOUT_ANCHORS,
  CUSTOM_ANCHORS_STORAGE_KEY,
  MAX_LOCAL_OFFSET_M,
  STUDIO_LIGHTING_ORDER,
  STUDIO_LIGHTING_PRESETS,
  addCustomCalloutAnchor,
  computeDirectionalLightVector,
  createSpatialAnchorState,
  deleteCustomCalloutAnchor,
  deserializeCustomAnchors,
  getAnchorsForArtifact,
  getSelectedAnchor,
  loadPersistedCustomAnchors,
  resolveAnchorWorldPosition,
  savePersistedCustomAnchors,
  selectCalloutAnchor,
  setShowPinsIn3D,
  setStudioLightingPreset,
  switchAnchorArtifact,
  syncSelectedAnchorToPart
} from '../calloutAnchors';

describe('SpatialCalloutAnchors & Museum Lighting Studio (TS parity with Kotlin)', () => {
  it('registers 4 curated architectural callout pins for every exhibit with valid bound partIds', () => {
    const state = createSpatialAnchorState('dougong_bell');
    expect(BUILTIN_CALLOUT_ANCHORS).toHaveLength(16);
    for (const exhibit of ARTIFACT_CATALOG) {
      const pins = getAnchorsForArtifact(state, exhibit.id);
      expect(pins).toHaveLength(4);
      for (const pin of pins) {
        expect(exhibit.parts.some((p) => p.id === pin.partId)).toBe(true);
        expect(pin.isCustom).toBe(false);
        expect(pin.titleZh.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('supports bidirectional 3D anchor selection and part-to-anchor synchronization', () => {
    let state = createSpatialAnchorState('dougong_bell');
    const selected = selectCalloutAnchor(state, 'pin_dougong_ang');
    expect(selected.found).toBe(true);
    expect(selected.partId).toBe('ang_lever');
    expect(selected.cameraFocus).not.toBeNull();
    expect(getSelectedAnchor(selected.state)?.id).toBe('pin_dougong_ang');

    state = syncSelectedAnchorToPart(selected.state, 'dougong_bell', 'yongle_crest');
    expect(state.selectedAnchorId).toBe('pin_dougong_bell');

    const unknown = selectCalloutAnchor(state, 'pin_nonexistent');
    expect(unknown.found).toBe(false);
    expect(unknown.partId).toBeNull();
  });

  it('adds custom spatial callout pin, binds to active part, and protects built-in pins on delete', () => {
    const init = createSpatialAnchorState('dougong_bell');
    const added = addCustomCalloutAnchor(init, {
      artifactId: 'dougong_bell',
      partId: 'shuatou',
      titleZh: '耍头承重榫槽',
      craftDetailZh: '顶层耍头锁死全部下层木构竖向自由度。',
      tone: 'BRONZE'
    });
    expect(added.ok).toBe(true);
    expect(added.anchor).not.toBeNull();
    expect(added.anchor?.isCustom).toBe(true);
    expect(added.state.selectedAnchorId).toBe(added.anchor?.id);
    expect(getAnchorsForArtifact(added.state, 'dougong_bell')).toHaveLength(5);

    // Built-in museum pin cannot be deleted
    const denyBuiltin = deleteCustomCalloutAnchor(added.state, 'pin_dougong_ludou');
    expect(denyBuiltin.ok).toBe(false);
    expect(getAnchorsForArtifact(denyBuiltin.state, 'dougong_bell')).toHaveLength(5);

    // Custom pin deletes cleanly and falls back selectedAnchorId
    const deleted = deleteCustomCalloutAnchor(added.state, added.anchor!.id);
    expect(deleted.ok).toBe(true);
    expect(getAnchorsForArtifact(deleted.state, 'dougong_bell')).toHaveLength(4);
    expect(deleted.state.selectedAnchorId).toBe('pin_dougong_ludou');
  });

  it('rejects empty/whitespace title or detail when adding custom callout pins', () => {
    const state = createSpatialAnchorState('dougong_bell');
    const emptyTitle = addCustomCalloutAnchor(state, {
      artifactId: 'dougong_bell',
      partId: 'ludou',
      titleZh: '   ',
      craftDetailZh: '有效内容'
    });
    expect(emptyTitle.ok).toBe(false);
    expect(emptyTitle.errorZh).toContain('标题');

    const emptyDetail = addCustomCalloutAnchor(state, {
      artifactId: 'dougong_bell',
      partId: 'ludou',
      titleZh: '有效标题',
      craftDetailZh: '   \t\n '
    });
    expect(emptyDetail.ok).toBe(false);
    expect(emptyDetail.errorZh).toContain('内容');
    expect(getAnchorsForArtifact(emptyDetail.state, 'dougong_bell')).toHaveLength(4);
  });

  it('persists custom callout pins cleanly to storage and survives corrupt JSON payloads', () => {
    const mem = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      }
    };

    const base = createSpatialAnchorState('xuande_censer');
    const added = addCustomCalloutAnchor(base, {
      artifactId: 'xuande_censer',
      partId: 'censer_body',
      titleZh: '栗壳铜胎包浆点',
      craftDetailZh: '烛光侧照下呈现温润古铜折射。'
    });
    expect(savePersistedCustomAnchors(added.state, fakeStorage)).toBe(true);
    expect(mem.has(CUSTOM_ANCHORS_STORAGE_KEY)).toBe(true);

    const restoredCustom = loadPersistedCustomAnchors(fakeStorage);
    expect(restoredCustom).toHaveLength(1);
    expect(restoredCustom[0].titleZh).toBe('栗壳铜胎包浆点');

    const rehydrated = createSpatialAnchorState('xuande_censer', restoredCustom);
    expect(getAnchorsForArtifact(rehydrated, 'xuande_censer')).toHaveLength(5);

    // Corrupt JSON / non-array payloads degrade safely to []
    expect(deserializeCustomAnchors('{invalid json')).toEqual([]);
    expect(deserializeCustomAnchors('{"not":"array"}')).toEqual([]);
    expect(deserializeCustomAnchors(null)).toEqual([]);
  });

  it('enforces strictly warm zero-blue/cyan/teal/purple color specs across all 3 studio lighting presets', () => {
    expect(STUDIO_LIGHTING_ORDER).toEqual(['KYOTO_MORNING', 'GALLERY_ZENITH', 'WARM_LANTERN']);
    for (const id of STUDIO_LIGHTING_ORDER) {
      const spec = STUDIO_LIGHTING_PRESETS[id];
      expect(spec.kelvin).toBeGreaterThanOrEqual(2200);
      expect(spec.kelvin).toBeLessThanOrEqual(5500);
      expect(spec.keyIntensity).toBeGreaterThan(1.0);
      expect(spec.exposure).toBeGreaterThan(0.8);
      for (const hex of [spec.keyColorHex, spec.rimColorHex, spec.hemiSkyHex, spec.hemiGroundHex, spec.emberColorHex]) {
        const r = (hex >> 16) & 0xff;
        const g = (hex >> 8) & 0xff;
        const b = hex & 0xff;
        // Pure warm architectural spectrum: red channel >= green >= blue (no blue/cyan/purple dominance)
        expect(r).toBeGreaterThanOrEqual(g);
        expect(g).toBeGreaterThanOrEqual(b);
      }
      const vec = computeDirectionalLightVector(id, 5.8);
      expect(Math.hypot(vec.x, vec.y, vec.z)).toBeCloseTo(5.8, 3);
      expect(vec.y).toBeGreaterThan(0);
    }
  });

  it('updates studio lighting preset and 3D pin visibility safely', () => {
    let state = createSpatialAnchorState('dougong_bell');
    state = setStudioLightingPreset(state, 'WARM_LANTERN');
    expect(state.lightingPreset).toBe('WARM_LANTERN');

    state = setStudioLightingPreset(state, 'INVALID_BLUE_NEON' as never);
    expect(state.lightingPreset).toBe('WARM_LANTERN');

    state = setShowPinsIn3D(state, false);
    expect(state.showPinsIn3D).toBe(false);
  });

  it('sanitizes NaN/out-of-bounds local offsets and resolves world position safely', () => {
    const state = createSpatialAnchorState('dougong_bell');
    const added = addCustomCalloutAnchor(state, {
      artifactId: 'dougong_bell',
      partId: 'ludou',
      titleZh: '越界偏移测试',
      craftDetailZh: '测试超大局部偏移钳制与 NaN 兜底。',
      localOffset: { x: 99, y: -99, z: 0.2 }
    });
    expect(added.ok).toBe(true);
    expect(added.anchor?.localOffset.x).toBe(MAX_LOCAL_OFFSET_M);
    expect(added.anchor?.localOffset.y).toBe(-MAX_LOCAL_OFFSET_M);

    const worldFromNanPart = resolveAnchorWorldPosition(added.anchor!, {
      x: Number.NaN,
      y: 0,
      z: 0
    });
    expect(Number.isFinite(worldFromNanPart.x)).toBe(true);
    expect(worldFromNanPart.x).toBeCloseTo(MAX_LOCAL_OFFSET_M, 4);
  });

  it('switches artifact anchors cleanly without losing custom pins on previous exhibit', () => {
    let state = createSpatialAnchorState('dougong_bell');
    const added = addCustomCalloutAnchor(state, {
      artifactId: 'dougong_bell',
      partId: 'ludou',
      titleZh: '坐斗斗耳标注',
      craftDetailZh: '切换展品后仍保留于永乐斗拱。'
    });
    state = switchAnchorArtifact(added.state, 'origami_pagoda');
    expect(state.activeArtifactId).toBe('origami_pagoda');
    expect(state.selectedAnchorId).toBe('pin_pagoda_shell');
    expect(getAnchorsForArtifact(state, 'dougong_bell')).toHaveLength(5);
  });

  it('coexists cleanly with mortise snap assembly and multi-axis architectural cutaway with zero conflict', () => {
    const exhibit = findArtifact('dougong_bell');
    let assembly = createMortiseAssemblyState(exhibit);
    assembly = updateCutawayPlane(assembly, { enabled: true, axis: 'Y', offsetMeters: 0.18 });
    const first = assembly.steps[0];
    const snapped = attemptSnapPart(assembly, first.partId, first.targetPosition, 0);
    expect(snapped.snapped).toBe(true);

    let anchors = createSpatialAnchorState(exhibit.id);
    anchors = setStudioLightingPreset(anchors, 'GALLERY_ZENITH');
    const pin = selectCalloutAnchor(anchors, 'pin_dougong_bell');
    expect(pin.found).toBe(true);
    const livePartPos = snapped.state.parts[pin.partId!].position;
    const worldPin = resolveAnchorWorldPosition(pin.anchor!, livePartPos);
    expect(Number.isFinite(worldPin.y)).toBe(true);
    expect(snapped.state.cutaway.enabled).toBe(true);
    expect(pin.state.lightingPreset).toBe('GALLERY_ZENITH');
  });
});
