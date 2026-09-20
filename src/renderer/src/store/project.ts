import { create } from 'zustand';

import { defaultAudioSelection } from '@shared/audio';
import {
  activeSegmentIndex,
  addCut,
  cutsOf,
  removeCut as removeSegmentCut,
  segmentsFromCuts,
  segmentsOf,
  setSegmentLayout,
  type Cut,
  type Segment,
} from '@shared/cuts/segments';
import { clampTrim, isWholeClip } from '@shared/export/trim';
import {
  clampSplitRatio,
  fitRectToAspect,
  gameplayAspectFor,
  getRegionAspect,
  toNormalizedAspect,
  type FrameSize,
  type RectKind,
  type RegionKind,
} from '@shared/geometry/layout';
import { createDefaultSettings } from '@shared/presets/schema';
import type {
  AudioSelection,
  LayoutMode,
  OutroPlacement,
  ProjectSettings,
  Rect,
  SubtitleCue,
  SubtitleSettings,
  SubtitleStyle,
  TrimRange,
  VideoInfo,
} from '@shared/types';

import { invoke } from '../api';

import { toastError, useToastStore } from './toasts';

const DEFAULT_FRAME: FrameSize = { width: 1920, height: 1080 };

export interface ProjectState {
  source: VideoInfo | null;
  settings: ProjectSettings;
  cues: SubtitleCue[];
  /** Probed metadata of `settings.outro.path`, null when unset or missing. */
  outroInfo: VideoInfo | null;
  outroMissing: boolean;
  /** True while a picked outro is being copied into the app's library. */
  outroImporting: boolean;
  /** Preset the current settings were loaded from, for "Update" and the modified indicator. */
  activePresetId: string | null;
  dirty: boolean;
  selectedRect: RegionKind | null;
  loadingSource: boolean;
  /** Per-clip track choice; never part of a preset. */
  audio: AudioSelection;
  /** True while the track dialog should be shown (multi-track clip just loaded, or "change"). */
  pendingAudioChoice: boolean;
  /** Portion of the clip to export; null = whole clip. Per clip, never part of a preset. */
  trim: TrimRange | null;
  /**
   * Layout changes inside the clip. `settings.layout` covers the clip up to the first cut, so
   * an empty list behaves exactly like a project without cuts. Per clip, never in a preset.
   */
  cuts: Cut[];

  loadSource: (path: string) => Promise<void>;
  clearSource: () => void;
  applySettings: (settings: ProjectSettings, presetId: string | null) => Promise<void>;
  /** Sets the layout of the segment under `time` (the base layout when there are no cuts). */
  setLayout: (layout: LayoutMode, time?: number) => void;
  setSplitRatio: (ratio: number) => void;
  setRect: (kind: RectKind, rect: Rect) => void;
  selectRect: (kind: RegionKind | null) => void;
  updateSubtitles: (patch: Partial<Omit<SubtitleSettings, 'style'>>) => void;
  updateStyle: (patch: Partial<SubtitleStyle>) => void;
  setCues: (cues: SubtitleCue[]) => void;
  updateCue: (id: string, patch: Partial<Omit<SubtitleCue, 'id'>>) => void;
  deleteCue: (id: string) => void;
  setOutro: (path: string | null) => Promise<void>;
  setOutroMode: (mode: OutroPlacement) => void;
  markSaved: (presetId: string) => void;
  setAudioSelection: (audio: AudioSelection) => void;
  openAudioChoice: () => void;
  dismissAudioChoice: () => void;
  /** Set both bounds at once (null clears); a range covering the whole clip also clears. */
  setTrim: (trim: TrimRange | null) => void;
  setTrimStart: (time: number) => void;
  setTrimEnd: (time: number) => void;
  /** Split the segment under the playhead; the new one inherits its layout. */
  addCutAt: (time: number) => void;
  removeCut: (index: number) => void;
  setSegmentLayoutAt: (index: number, layout: LayoutMode) => void;
  setCutsFromDetection: (times: readonly number[]) => void;
  clearCuts: () => void;
}

const NO_AUDIO: AudioSelection = { transcribeTracks: [], exportTracks: [] };

const RECT_FIELD: Record<RectKind, 'webcamRect' | 'gameplayRect' | 'fillRect'> = {
  webcam: 'webcamRect',
  gameplay: 'gameplayRect',
  fill: 'fillRect',
};

const frameOf = (source: VideoInfo | null): FrameSize => source ?? DEFAULT_FRAME;

/** The clip's segments. Components must memoise this — it builds a new array every call. */
export const getSegments = (state: Pick<ProjectState, 'settings' | 'cuts'>): Segment[] =>
  segmentsOf(state.settings.layout, state.cuts);

/** Re-fit every rect to the aspect its output region demands (both layouts, always). */
function refitRects(settings: ProjectSettings, frame: FrameSize): ProjectSettings {
  const webcamAspect = toNormalizedAspect(
    getRegionAspect('split', settings.splitRatio, 'webcam'),
    frame,
  );
  return {
    ...settings,
    webcamRect: fitRectToAspect(settings.webcamRect, webcamAspect),
    gameplayRect: fitRectToAspect(
      settings.gameplayRect,
      gameplayAspectFor('split', settings.splitRatio, frame),
    ),
    fillRect: fitRectToAspect(
      settings.fillRect,
      gameplayAspectFor('fill', settings.splitRatio, frame),
    ),
  };
}

async function probeOutro(
  path: string | null,
): Promise<{ info: VideoInfo | null; missing: boolean }> {
  if (!path) {
    return { info: null, missing: false };
  }
  const exists = await invoke('app:fileExists', { path });
  if (!exists) {
    return { info: null, missing: true };
  }
  try {
    return { info: await invoke('video:probe', { path }), missing: false };
  } catch (err) {
    toastError(err, 'Could not read the outro video');
    return { info: null, missing: true };
  }
}

export const useProjectStore = create<ProjectState>((set, get) => {
  const patchSettings = (updater: (s: ProjectSettings) => ProjectSettings): void => {
    set((state) => ({ settings: updater(state.settings), dirty: true }));
  };

  return {
    source: null,
    settings: createDefaultSettings(),
    cues: [],
    outroInfo: null,
    outroMissing: false,
    outroImporting: false,
    activePresetId: null,
    dirty: false,
    selectedRect: null,
    loadingSource: false,
    audio: NO_AUDIO,
    pendingAudioChoice: false,
    trim: null,
    cuts: [],

    loadSource: async (path) => {
      set({ loadingSource: true });
      try {
        const info = await invoke('video:probe', { path });
        set((state) => ({
          source: info,
          cues: [],
          selectedRect: null,
          settings: refitRects(state.settings, info),
          audio: defaultAudioSelection(info),
          pendingAudioChoice: info.audioTracks.length > 1,
          trim: null,
          cuts: [],
        }));
        if (Math.abs(info.width / info.height - 16 / 9) > 0.02) {
          useToastStore
            .getState()
            .push(
              'info',
              'This video is not 16:9',
              'Rectangles still work, but presets may need adjusting.',
            );
        }
      } catch (err) {
        toastError(err, 'Could not open this video');
      } finally {
        set({ loadingSource: false });
      }
    },

    clearSource: () => {
      set({
        source: null,
        cues: [],
        selectedRect: null,
        audio: NO_AUDIO,
        pendingAudioChoice: false,
        trim: null,
        cuts: [],
      });
    },

    applySettings: async (settings, presetId) => {
      const { info, missing } = await probeOutro(settings.outro?.path ?? null);
      set((state) => ({
        settings: refitRects(settings, frameOf(state.source)),
        activePresetId: presetId,
        dirty: false,
        outroInfo: info,
        outroMissing: missing,
      }));
      if (missing) {
        useToastStore
          .getState()
          .push('error', 'Outro video not found', settings.outro?.path ?? undefined);
      }
    },

    setLayout: (layout, time = 0) => {
      get().setSegmentLayoutAt(activeSegmentIndex(getSegments(get()), time), layout);
    },

    setSplitRatio: (ratio) => {
      const frame = frameOf(get().source);
      patchSettings((s) => refitRects({ ...s, splitRatio: clampSplitRatio(ratio) }, frame));
    },

    setRect: (kind, rect) => {
      patchSettings((s) => ({ ...s, [RECT_FIELD[kind]]: rect }));
    },

    selectRect: (kind) => {
      set({ selectedRect: kind });
    },

    updateSubtitles: (patch) => {
      patchSettings((s) => ({ ...s, subtitles: { ...s.subtitles, ...patch } }));
    },

    updateStyle: (patch) => {
      patchSettings((s) => ({
        ...s,
        subtitles: { ...s.subtitles, style: { ...s.subtitles.style, ...patch } },
      }));
    },

    setCues: (cues) => {
      set({ cues });
    },

    updateCue: (id, patch) => {
      set((state) => ({ cues: state.cues.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    },

    deleteCue: (id) => {
      set((state) => ({ cues: state.cues.filter((c) => c.id !== id) }));
    },

    setOutro: async (path) => {
      // Keep our own copy so the preset survives the original being moved or deleted.
      let stored = path;
      if (path) {
        set({ outroImporting: true });
        try {
          stored = (await invoke('outro:import', { path })).path;
        } catch (err) {
          toastError(err, 'Could not copy the outro video');
          set({ outroImporting: false });
          return;
        }
      }
      const { info, missing } = await probeOutro(stored);
      patchSettings((s) => ({
        ...s,
        outro: stored && info ? { path: stored, mode: s.outro?.mode ?? 'after' } : null,
      }));
      set({ outroInfo: info, outroMissing: missing, outroImporting: false });
    },

    setOutroMode: (mode) => {
      patchSettings((s) => (s.outro ? { ...s, outro: { ...s.outro, mode } } : s));
    },

    markSaved: (presetId) => {
      set({ activePresetId: presetId, dirty: false });
    },

    setAudioSelection: (audio) => {
      set({ audio, pendingAudioChoice: false });
    },

    openAudioChoice: () => {
      set({ pendingAudioChoice: true });
    },

    dismissAudioChoice: () => {
      set({ pendingAudioChoice: false });
    },

    setTrim: (trim) => {
      const duration = get().source?.duration ?? 0;
      const clamped = trim ? clampTrim(trim, duration) : null;
      set({ trim: isWholeClip(clamped, duration) ? null : clamped });
    },

    setTrimStart: (time) => {
      const { trim, source } = get();
      get().setTrim({ start: time, end: trim?.end ?? source?.duration ?? 0 });
    },

    addCutAt: (time) => {
      const duration = get().source?.duration ?? 0;
      set((state) => ({
        cuts: cutsOf(addCut(getSegments(state), time, duration)).cuts,
      }));
    },

    removeCut: (index) => {
      set((state) => ({ cuts: cutsOf(removeSegmentCut(getSegments(state), index)).cuts }));
    },

    setSegmentLayoutAt: (index, layout) => {
      const frame = frameOf(get().source);
      const segments = setSegmentLayout(getSegments(get()), index, layout);
      const { layout: base, cuts } = cutsOf(segments);
      set({ cuts });
      patchSettings((s) => refitRects({ ...s, layout: base }, frame));
      if (layout === 'fill' && get().selectedRect === 'webcam') {
        set({ selectedRect: 'gameplay' });
      }
    },

    setCutsFromDetection: (times) => {
      const state = get();
      const segments = segmentsFromCuts(times, state.settings.layout, state.source?.duration ?? 0);
      set({ cuts: cutsOf(segments).cuts });
    },

    clearCuts: () => {
      set({ cuts: [] });
    },

    setTrimEnd: (time) => {
      const { trim } = get();
      get().setTrim({ start: trim?.start ?? 0, end: time });
    },
  };
});
