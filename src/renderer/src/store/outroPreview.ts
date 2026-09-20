import { create } from 'zustand';

import { AppError } from '@shared/errors';

import { invoke, newJobId, subscribe } from '../api';

import { toastError } from './toasts';

/**
 * Alpha-capable copy of the outro the preview composites over the clip. The export always reads
 * the original file; this exists only because Chromium cannot decode ProRes (and friends).
 */
export interface OutroPreviewState {
  /** Outro the copy (or the running job) belongs to; stale entries are ignored. */
  outroPath: string | null;
  path: string | null;
  jobId: string | null;
  /** 0..1 while the copy is being rendered. */
  fraction: number;
  /** True when this outro cannot have a preview (not a library copy). */
  unavailable: boolean;

  ensure: (outroPath: string) => Promise<void>;
  reset: () => void;
}

export const useOutroPreviewStore = create<OutroPreviewState>((set, get) => ({
  outroPath: null,
  path: null,
  jobId: null,
  fraction: 0,
  unavailable: false,

  ensure: async (outroPath) => {
    const state = get();
    if (state.outroPath === outroPath && (state.path || state.jobId || state.unavailable)) {
      return;
    }
    state.reset();
    const jobId = newJobId('outro-preview');
    set({ outroPath, path: null, jobId, fraction: 0, unavailable: false });
    const unsubscribe = subscribe('outro:previewProgress', (progress) => {
      if (progress.jobId === jobId) {
        set({ fraction: progress.fraction });
      }
    });
    try {
      const { path } = await invoke('outro:preparePreview', { jobId, path: outroPath });
      if (get().jobId === jobId) {
        set({ path, jobId: null, fraction: 1, unavailable: path === null });
      }
    } catch (err) {
      if (get().jobId === jobId) {
        set({ jobId: null, unavailable: true });
        if (!(err instanceof AppError && err.code === 'EXPORT_CANCELLED')) {
          toastError(err, 'Could not prepare the outro preview');
        }
      }
    } finally {
      unsubscribe();
    }
  },

  reset: () => {
    const { jobId } = get();
    if (jobId) {
      void invoke('outro:cancelPreview', { jobId }).catch(() => undefined);
    }
    set({ outroPath: null, path: null, jobId: null, fraction: 0, unavailable: false });
  },
}));

/** Preview copy to composite for `outroPath`, if one is ready. */
export const selectOutroPreviewPath =
  (outroPath: string | null | undefined) =>
  (s: OutroPreviewState): string | null =>
    outroPath && s.outroPath === outroPath ? s.path : null;
