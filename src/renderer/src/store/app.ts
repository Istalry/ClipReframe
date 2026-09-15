import { create } from 'zustand';

import { resolveEncoder, type VideoEncoder } from '@shared/export/encoders';

import { invoke } from '../api';

export type EncoderPreference = 'auto' | 'cpu';

const ENCODER_PREF_KEY = 'clipreframe.encoderPreference';

function readPreference(): EncoderPreference {
  try {
    return localStorage.getItem(ENCODER_PREF_KEY) === 'cpu' ? 'cpu' : 'auto';
  } catch {
    return 'auto';
  }
}

function writePreference(value: EncoderPreference): void {
  try {
    localStorage.setItem(ENCODER_PREF_KEY, value);
  } catch {
    /* storage unavailable — the preference just does not stick */
  }
}

/** Machine-level state: what this PC can do and how the user wants to use it. Never in presets. */
export interface AppState {
  /** GPU encoders that passed the start-up probe; null until the main process answered. */
  hardwareEncoders: VideoEncoder[] | null;
  encoderPreference: EncoderPreference;

  loadCapabilities: () => Promise<void>;
  setEncoderPreference: (preference: EncoderPreference) => void;
  /** Concrete encoder for the next export. */
  resolveEncoder: () => VideoEncoder;
}

export const useAppStore = create<AppState>((set, get) => ({
  hardwareEncoders: null,
  encoderPreference: readPreference(),

  loadCapabilities: async () => {
    try {
      const { hardwareEncoders } = await invoke('app:capabilities', undefined);
      set({ hardwareEncoders });
    } catch {
      // Detection failing only means CPU encoding; main logged the cause.
      set({ hardwareEncoders: [] });
    }
  },

  setEncoderPreference: (encoderPreference) => {
    writePreference(encoderPreference);
    set({ encoderPreference });
  },

  resolveEncoder: () => resolveEncoder(get().encoderPreference, get().hardwareEncoders ?? []),
}));
