import { create } from 'zustand';

import type { Preset, ProjectSettings } from '@shared/types';

import { invoke } from '../api';

import { useProjectStore } from './project';
import { toastError, useToastStore } from './toasts';

export interface PresetState {
  presets: Preset[];
  defaultPresetId: string | null;
  loaded: boolean;

  load: () => Promise<void>;
  /** Apply a preset to the current project. */
  apply: (id: string) => Promise<void>;
  /** Create a new preset from the current project settings. */
  saveAs: (name: string, settings: ProjectSettings) => Promise<void>;
  /** Overwrite an existing preset with the current project settings. */
  update: (id: string, settings: ProjectSettings) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setDefault: (id: string | null) => Promise<void>;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [],
  defaultPresetId: null,
  loaded: false,

  load: async () => {
    try {
      const file = await invoke('presets:list', undefined);
      set({ presets: file.presets, defaultPresetId: file.defaultPresetId, loaded: true });
    } catch (err) {
      // A corrupt file has already been reset by main; show why and continue with an empty list.
      toastError(err, 'Could not load presets');
      set({ presets: [], defaultPresetId: null, loaded: true });
    }
  },

  apply: async (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) {
      return;
    }
    const { layout, splitRatio, webcamRect, gameplayRect, fillRect, subtitles, outro } = preset;
    await useProjectStore
      .getState()
      .applySettings(
        { layout, splitRatio, webcamRect, gameplayRect, fillRect, subtitles, outro },
        id,
      );
  },

  saveAs: async (name, settings) => {
    try {
      const preset = await invoke('presets:save', { name, settings });
      set({ presets: [...get().presets, preset] });
      useProjectStore.getState().markSaved(preset.id);
      useToastStore.getState().push('success', `Preset "${name}" saved`);
    } catch (err) {
      toastError(err, 'Could not save preset');
    }
  },

  update: async (id, settings) => {
    const existing = get().presets.find((p) => p.id === id);
    if (!existing) {
      return;
    }
    try {
      const preset = await invoke('presets:save', { id, name: existing.name, settings });
      set({ presets: get().presets.map((p) => (p.id === id ? preset : p)) });
      useProjectStore.getState().markSaved(id);
      useToastStore.getState().push('success', `Preset "${preset.name}" updated`);
    } catch (err) {
      toastError(err, 'Could not update preset');
    }
  },

  remove: async (id) => {
    try {
      const file = await invoke('presets:delete', { id });
      set({ presets: file.presets, defaultPresetId: file.defaultPresetId });
      if (useProjectStore.getState().activePresetId === id) {
        // The settings live on in the project, they just no longer belong to a saved preset.
        useProjectStore.setState({ activePresetId: null, dirty: true });
      }
    } catch (err) {
      toastError(err, 'Could not delete preset');
    }
  },

  setDefault: async (id) => {
    try {
      const file = await invoke('presets:setDefault', { id });
      set({ defaultPresetId: file.defaultPresetId });
    } catch (err) {
      toastError(err, 'Could not set default preset');
    }
  },
}));
