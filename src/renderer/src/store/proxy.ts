import { create } from 'zustand';

import { AppError } from '@shared/errors';
import type { VideoInfo } from '@shared/types';

import { invoke, newJobId, subscribe } from '../api';

import { useAppStore } from './app';
import { toastError } from './toasts';

/**
 * Lower-quality H.264 stand-in for a clip Chromium cannot decode. Only the preview plays it;
 * every job (export, subtitles, audio mix) keeps reading the original.
 */
export interface ProxyState {
  /** Source the proxy (or the running job) belongs to; stale entries are ignored. */
  sourcePath: string | null;
  path: string | null;
  jobId: string | null;
  /** 0..1 while the job runs. */
  fraction: number;

  /** Start a proxy for `source` unless one exists or is already being made. */
  ensure: (source: VideoInfo) => Promise<void>;
  /** Forget the proxy (clip closed or replaced) and cancel a running job. */
  reset: () => void;
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  sourcePath: null,
  path: null,
  jobId: null,
  fraction: 0,

  ensure: async (source) => {
    const state = get();
    if (state.sourcePath === source.path && (state.path || state.jobId)) {
      return;
    }
    state.reset();
    const jobId = newJobId('proxy');
    set({ sourcePath: source.path, path: null, jobId, fraction: 0 });
    const unsubscribe = subscribe('video:proxyProgress', (progress) => {
      if (progress.jobId === jobId) {
        set({ fraction: progress.fraction });
      }
    });
    try {
      const { path } = await invoke('video:makeProxy', {
        jobId,
        path: source.path,
        encoder: useAppStore.getState().resolveEncoder(),
      });
      // Another clip may have been loaded meanwhile; its own job owns the store then.
      if (get().jobId === jobId) {
        set({ path, jobId: null, fraction: 1 });
      }
    } catch (err) {
      if (get().jobId === jobId) {
        set({ jobId: null });
        if (!(err instanceof AppError && err.code === 'EXPORT_CANCELLED')) {
          toastError(err, 'Could not prepare a preview for this video');
        }
      }
    } finally {
      unsubscribe();
    }
  },

  reset: () => {
    const { jobId } = get();
    if (jobId) {
      void invoke('video:cancelProxy', { jobId }).catch(() => undefined);
    }
    set({ sourcePath: null, path: null, jobId: null, fraction: 0 });
  },
}));

/** Proxy path to play for `source`, if one is ready. */
export const selectProxyPath =
  (source: VideoInfo | null) =>
  (s: ProxyState): string | null =>
    source !== null && s.sourcePath === source.path ? s.path : null;
