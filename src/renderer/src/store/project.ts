import { create } from 'zustand';

import { defaultAudioSelection } from '@shared/audio';
import {
  clampSplitRatio,
  fitRectToAspect,
  getRegionAspect,
  toNormalizedAspect,
  type FrameSize,
  type RegionKind,
} from '@shared/geometry/layout';
import { createDefaultSettings } from '@shared/presets/schema';
import type {
  AudioSelection,
  LayoutMode,
  ProjectSettings,
  Rect,
  SubtitleCue,
  SubtitleSettings,
  SubtitleStyle,
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
  /** Preset the current settings were loaded from, for "Update" and the modified indicator. */
  activePresetId: string | null;
  dirty: boolean;
  selectedRect: RegionKind | null;
  loadingSource: boolean;
  /** Per-clip track choice; never part of a preset. */
  audio: AudioSelection;
  /** True while the track dialog should be shown (multi-track clip just loaded, or "change"). */
  pendingAudioChoice: boolean;

  loadSource: (path: string) => Promise<void>;
  clearSource: () => void;
  applySettings: (settings: ProjectSettings, presetId: string | null) => Promise<void>;
  setLayout: (layout: LayoutMode) => void;
  setSplitRatio: (ratio: number) => void;
  setRect: (kind: RegionKind, rect: Rect) => void;
  selectRect: (kind: RegionKind | null) => void;
  updateSubtitles: (patch: Partial<Omit<SubtitleSettings, 'style'>>) => void;
  updateStyle: (patch: Partial<SubtitleStyle>) => void;
  setCues: (cues: SubtitleCue[]) => void;
  updateCue: (id: string, patch: Partial<Omit<SubtitleCue, 'id'>>) => void;
  deleteCue: (id: string) => void;
  setOutro: (path: string | null) => Promise<void>;
  markSaved: (presetId: string) => void;
  setAudioSelection: (audio: AudioSelection) => void;
  openAudioChoice: () => void;
  dismissAudioChoice: () => void;
}

const NO_AUDIO: AudioSelection = { transcribeTracks: [], exportTracks: [] };

const frameOf = (source: VideoInfo | null): FrameSize => source ?? DEFAULT_FRAME;

/** Re-fit both rects to the aspect their output region demands. */
function refitRects(settings: ProjectSettings, frame: FrameSize): ProjectSettings {
  const webcamAspect = toNormalizedAspect(
    getRegionAspect('split', settings.splitRatio, 'webcam'),
    frame,
  );
  const gameplayAspect = toNormalizedAspect(
    getRegionAspect(settings.layout, settings.splitRatio, 'gameplay'),
    frame,
  );
  return {
    ...settings,
    webcamRect: fitRectToAspect(settings.webcamRect, webcamAspect),
    gameplayRect: fitRectToAspect(settings.gameplayRect, gameplayAspect),
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
    activePresetId: null,
    dirty: false,
    selectedRect: null,
    loadingSource: false,
    audio: NO_AUDIO,
    pendingAudioChoice: false,

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

    setLayout: (layout) => {
      const frame = frameOf(get().source);
      patchSettings((s) => refitRects({ ...s, layout }, frame));
      if (layout === 'fill' && get().selectedRect === 'webcam') {
        set({ selectedRect: 'gameplay' });
      }
    },

    setSplitRatio: (ratio) => {
      const frame = frameOf(get().source);
      patchSettings((s) => refitRects({ ...s, splitRatio: clampSplitRatio(ratio) }, frame));
    },

    setRect: (kind, rect) => {
      patchSettings((s) =>
        kind === 'webcam' ? { ...s, webcamRect: rect } : { ...s, gameplayRect: rect },
      );
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
      const { info, missing } = await probeOutro(path);
      patchSettings((s) => ({ ...s, outro: path && info ? { path } : null }));
      set({ outroInfo: info, outroMissing: missing });
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
  };
});
