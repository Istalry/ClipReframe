import { create } from 'zustand';

import { AppError } from '@shared/errors';
import type { ExportProgress, TranscribeProgress } from '@shared/types';

import { invoke, newJobId, subscribe } from '../api';

import { useProjectStore } from './project';
import { toastError, useToastStore } from './toasts';

interface ExportJob {
  jobId: string;
  outputPath: string;
  progress: ExportProgress | null;
}

interface TranscribeJob {
  jobId: string;
  progress: TranscribeProgress | null;
}

interface JobState {
  exportJob: ExportJob | null;
  lastExportPath: string | null;
  transcribeJob: TranscribeJob | null;

  startExport: (outputPath: string) => Promise<void>;
  cancelExport: () => Promise<void>;
  startTranscription: () => Promise<void>;
  cancelTranscription: () => Promise<void>;
}

export const useJobStore = create<JobState>((set, get) => ({
  exportJob: null,
  lastExportPath: null,
  transcribeJob: null,

  startExport: async (outputPath) => {
    const project = useProjectStore.getState();
    if (!project.source || get().exportJob) {
      return;
    }
    const jobId = newJobId('export');
    set({ exportJob: { jobId, outputPath, progress: null }, lastExportPath: null });
    const unsubscribe = subscribe('export:progress', (progress) => {
      if (progress.jobId === jobId) {
        set((s) => (s.exportJob ? { exportJob: { ...s.exportJob, progress } } : {}));
      }
    });
    try {
      await invoke('export:start', {
        jobId,
        source: project.source,
        settings: project.settings,
        cues: project.settings.subtitles.enabled ? project.cues : [],
        outro: project.settings.outro ? project.outroInfo : null,
        outputPath,
      });
      set({ lastExportPath: outputPath });
      useToastStore.getState().push('success', 'Export complete', outputPath);
    } catch (err) {
      if (!(err instanceof AppError && err.code === 'EXPORT_CANCELLED')) {
        toastError(err, 'Export failed');
      }
    } finally {
      unsubscribe();
      set({ exportJob: null });
    }
  },

  cancelExport: async () => {
    const job = get().exportJob;
    if (job) {
      await invoke('export:cancel', { jobId: job.jobId });
    }
  },

  startTranscription: async () => {
    const project = useProjectStore.getState();
    if (!project.source || get().transcribeJob) {
      return;
    }
    const jobId = newJobId('whisper');
    set({ transcribeJob: { jobId, progress: null } });
    const unsubscribe = subscribe('subtitles:progress', (progress) => {
      if (progress.jobId === jobId) {
        set((s) => (s.transcribeJob ? { transcribeJob: { ...s.transcribeJob, progress } } : {}));
      }
    });
    try {
      const result = await invoke('subtitles:transcribe', {
        jobId,
        path: project.source.path,
        language: project.settings.subtitles.language,
      });
      useProjectStore.getState().setCues(result.cues);
      const cleaned = result.removedCount > 0 ? `, ${result.removedCount} cleaned up` : '';
      useToastStore
        .getState()
        .push('success', `${result.cues.length} subtitles generated${cleaned}`);
    } catch (err) {
      if (!(err instanceof AppError && err.code === 'TRANSCRIBE_CANCELLED')) {
        toastError(err, 'Transcription failed');
      }
    } finally {
      unsubscribe();
      set({ transcribeJob: null });
    }
  },

  cancelTranscription: async () => {
    const job = get().transcribeJob;
    if (job) {
      await invoke('subtitles:cancel', { jobId: job.jobId });
    }
  },
}));
