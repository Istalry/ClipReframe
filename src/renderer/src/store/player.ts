import { create } from 'zustand';

/**
 * Playback state of the single <video> element. The element itself is stored so the vertical
 * preview can `drawImage` from it; it is registered by SourceStage on mount.
 */
export interface PlayerState {
  element: HTMLVideoElement | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  muted: boolean;
  /**
   * Rendered export mix played instead of the file's default track (multi-track clips only);
   * null = play the <video> element's own audio.
   */
  mixPath: string | null;
  /** True while ffmpeg renders the mix; the video's own audio plays meanwhile. */
  mixPending: boolean;

  register: (element: HTMLVideoElement | null) => void;
  setMix: (mixPath: string | null, pending?: boolean) => void;
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
  mixPath: null,
  mixPending: false,

  register: (element) => {
    set({ element, playing: false, currentTime: 0, duration: element?.duration ?? 0 });
  },
  setMix: (mixPath, pending = false) => {
    set({ mixPath, mixPending: pending });
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
