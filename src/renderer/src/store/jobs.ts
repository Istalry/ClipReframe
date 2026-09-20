import { create } from 'zustand';

import { CUT_THRESHOLDS, type CutSensitivity } from '@shared/cuts/detect';
import { AppError } from '@shared/errors';
import { VIDEO_ENCODER_LABELS, type VideoEncoder } from '@shared/export/encoders';
import type { ExportProgress, TranscribeProgress } from '@shared/types';

import { invoke, newJobId, subscribe } from '../api';

import { useAppStore } from './app';
import { getSegments, useProjectStore } from './project';
import { toastError, useToastStore } from './toasts';

interface ExportJob {
  jobId: string;
  outputPath: string;
  encoder: VideoEncoder;
  progress: ExportProgress | null;
}

interface TranscribeJob {
  jobId: string;
  progress: TranscribeProgress | null;
}

interface DetectJob {
  jobId: string;
  fraction: number;
}

export interface JobState {
  exportJob: ExportJob | null;
  lastExportPath: string | null;
  transcribeJob: TranscribeJob | null;
  detectJob: DetectJob | null;

  startExport: (outputPath: string) => Promise<void>;
  cancelExport: () => Promise<void>;
  startTranscription: () => Promise<void>;
  cancelTranscription: () => Promise<void>;
  startDetectCuts: (sensitivity: CutSensitivity) => Promise<void>;
  cancelDetectCuts: () => Promise<void>;
}

export const useJobStore = create<JobState>((set, get) => ({
  exportJob: null,
  lastExportPath: null,
  transcribeJob: null,
  detectJob: null,

  startExport: async (outputPath) => {
    const project = useProjectStore.getState();
    if (!project.source || get().exportJob) {
      return;
    }
    const jobId = newJobId('export');
    const encoder = useAppStore.getState().resolveEncoder();
    set({ exportJob: { jobId, outputPath, encoder, progress: null }, lastExportPath: null });
    const unsubscribe = subscribe('export:progress', (progress) => {
      if (progress.jobId === jobId) {
        set((s) => (s.exportJob ? { exportJob: { ...s.exportJob, progress } } : {}));
      }
    });
    try {
      const result = await invoke('export:start', {
        jobId,
        source: project.source,
        settings: project.settings,
        cues: project.settings.subtitles.enabled ? project.cues : [],
        outro: project.settings.outro ? project.outroInfo : null,
        audio: project.audio,
        outputPath,
        encoder,
        trim: project.trim,
        segments: getSegments(project),
      });
      set({ lastExportPath: outputPath });
      const toasts = useToastStore.getState();
      toasts.push('success', 'Export complete', outputPath);
      if (result.encoder !== encoder) {
        toasts.push(
          'info',
          `${VIDEO_ENCODER_LABELS[encoder]} failed, exported with the CPU instead`,
          'Switch the encoder to CPU in the export bar if this keeps happening.',
        );
      }
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
    const toasts = useToastStore.getState();
    if (project.source.audioTracks.length === 0) {
      toasts.push('error', 'This clip has no audio', 'Nothing to transcribe.');
      return;
    }
    if (project.audio.transcribeTracks.length === 0) {
      toasts.push(
        'error',
        'Select at least one audio track for subtitles',
        'Use "change" next to the audio line to pick the tracks.',
      );
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
        audioTracks: project.audio.transcribeTracks,
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

  startDetectCuts: async (sensitivity) => {
    const project = useProjectStore.getState();
    if (!project.source || get().detectJob) {
      return;
    }
    const jobId = newJobId('cuts');
    set({ detectJob: { jobId, fraction: 0 } });
    const unsubscribe = subscribe('video:cutsProgress', (progress) => {
      if (progress.jobId === jobId) {
        set((s) => (s.detectJob ? { detectJob: { ...s.detectJob, ...progress } } : {}));
      }
    });
    try {
      const { cuts } = await invoke('video:detectCuts', {
        jobId,
        path: project.source.path,
        threshold: CUT_THRESHOLDS[sensitivity],
      });
      useProjectStore.getState().setCutsFromDetection(cuts);
      const found = useProjectStore.getState().cuts.length;
      useToastStore
        .getState()
        .push(
          found > 0 ? 'success' : 'info',
          found > 0 ? `${found} cut${found > 1 ? 's' : ''} detected` : 'No cuts detected',
          found > 0
            ? 'Pick a layout for each segment, or remove the cuts you do not want.'
            : 'Try a higher sensitivity, or add cuts at the playhead.',
        );
    } catch (err) {
      if (!(err instanceof AppError && err.code === 'EXPORT_CANCELLED')) {
        toastError(err, 'Cut detection failed');
      }
    } finally {
      unsubscribe();
      set({ detectJob: null });
    }
  },

  cancelDetectCuts: async () => {
    const job = get().detectJob;
    if (job) {
      await invoke('video:cancelDetectCuts', { jobId: job.jobId });
    }
  },

  cancelTranscription: async () => {
    const job = get().transcribeJob;
    if (job) {
      await invoke('subtitles:cancel', { jobId: job.jobId });
    }
  },
}));
