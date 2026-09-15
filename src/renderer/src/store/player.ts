import { create } from 'zustand';

/**
 * Playback state of the single <video> element. The element itself is stored so the vertical
 * preview can `drawImage` from it; it is registered by SourceStage on mount.
 */
interface PlayerState {
  element: HTMLVideoElement | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  muted: boolean;

  register: (element: HTMLVideoElement | null) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  togglePlay: () => void;
  toggleMute: () => void;
  seek: (time: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  element: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  muted: false,

  register: (element) => {
    set({ element, playing: false, currentTime: 0, duration: element?.duration ?? 0 });
  },
  setPlaying: (playing) => {
    set({ playing });
  },
  setCurrentTime: (currentTime) => {
    set({ currentTime });
  },
  setDuration: (duration) => {
    set({ duration });
  },
  togglePlay: () => {
    const el = get().element;
    if (!el) {
      return;
    }
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  },
  toggleMute: () => {
    const el = get().element;
    const muted = !get().muted;
    if (el) {
      el.muted = muted;
    }
    set({ muted });
  },
  seek: (time) => {
    const el = get().element;
    if (el) {
      el.currentTime = Math.max(0, Math.min(el.duration || 0, time));
    }
  },
}));
