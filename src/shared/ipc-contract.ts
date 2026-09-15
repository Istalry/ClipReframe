import { z } from 'zod';

import { SUBTITLE_LANGUAGE_CODES } from './constants';
import type { SerializedError } from './errors';
import { VIDEO_ENCODERS } from './export/encoders';
import { presetSchema, presetsFileSchema, projectSettingsSchema } from './presets/schema';

// ---------------------------------------------------------------------------------------------
// Shared value schemas
// ---------------------------------------------------------------------------------------------

export const audioTrackSchema = z.object({
  index: z.number().int().nonnegative(),
  codec: z.string(),
  channels: z.number().int().nonnegative(),
  sampleRate: z.number().int().nonnegative(),
  label: z.string().nullable(),
});

export const videoInfoSchema = z.object({
  path: z.string(),
  fileName: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  duration: z.number().nonnegative(),
  fps: z.number().nonnegative(),
  videoCodec: z.string(),
  audioTracks: z.array(audioTrackSchema),
});

const trackList = z.array(z.number().int().nonnegative());

export const audioSelectionSchema = z.object({
  transcribeTracks: trackList,
  exportTracks: trackList,
});

export const subtitleWordSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string(),
});

export const subtitleCueSchema = z.object({
  id: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string(),
  words: z.array(subtitleWordSchema).optional(),
});

const jobId = z.string().min(1);
const trimRangeSchema = z
  .object({ start: z.number().nonnegative(), end: z.number().nonnegative() })
  .refine((t) => t.end > t.start, 'Trim end must be after its start');
const videoEncoder = z.enum(VIDEO_ENCODERS);

// ---------------------------------------------------------------------------------------------
// Request/response channels (ipcRenderer.invoke ↔ ipcMain.handle)
// ---------------------------------------------------------------------------------------------

export const invokeContract = {
  'app:checkBinaries': {
    request: z.void(),
    response: z.object({ ok: z.boolean(), missing: z.array(z.string()) }),
  },
  'app:capabilities': {
    request: z.void(),
    response: z.object({ hardwareEncoders: z.array(videoEncoder) }),
  },
  'app:fileExists': {
    request: z.object({ path: z.string() }),
    response: z.boolean(),
  },
  'app:showInFolder': {
    request: z.object({ path: z.string() }),
    response: z.void(),
  },

  'dialog:openVideo': {
    request: z.object({ title: z.string() }),
    response: z.string().nullable(),
  },
  'dialog:chooseFolder': {
    request: z.object({ defaultPath: z.string().optional() }),
    response: z.string().nullable(),
  },

  'video:probe': {
    request: z.object({ path: z.string() }),
    response: videoInfoSchema,
  },

  'presets:list': {
    request: z.void(),
    response: presetsFileSchema,
  },
  'presets:save': {
    request: z.object({
      id: z.string().optional(),
      name: z.string().min(1).max(60),
      settings: projectSettingsSchema,
    }),
    response: presetSchema,
  },
  'presets:delete': {
    request: z.object({ id: z.string() }),
    response: presetsFileSchema,
  },
  'presets:setDefault': {
    request: z.object({ id: z.string().nullable() }),
    response: presetsFileSchema,
  },

  'outro:import': {
    request: z.object({ path: z.string() }),
    response: z.object({ path: z.string() }),
  },

  'fonts:list': {
    request: z.void(),
    response: z.array(z.string()),
  },

  'subtitles:transcribe': {
    request: z.object({
      jobId,
      path: z.string(),
      language: z.enum(SUBTITLE_LANGUAGE_CODES),
      audioTracks: trackList.min(1, 'Select at least one audio track for subtitles'),
    }),
    response: z.object({
      cues: z.array(subtitleCueSchema),
      removedCount: z.number().int().nonnegative(),
      detectedLanguage: z.string().nullable(),
    }),
  },
  'subtitles:cancel': {
    request: z.object({ jobId }),
    response: z.void(),
  },

  'audio:renderPreview': {
    request: z.object({
      jobId,
      path: z.string(),
      audioTracks: trackList,
      duration: z.number().nonnegative(),
    }),
    response: z.object({ path: z.string() }),
  },
  'audio:cancelPreview': {
    request: z.object({ jobId }),
    response: z.void(),
  },

  'export:start': {
    request: z.object({
      jobId,
      source: videoInfoSchema,
      settings: projectSettingsSchema,
      cues: z.array(subtitleCueSchema),
      outro: videoInfoSchema.nullable(),
      audio: audioSelectionSchema,
      outputPath: z.string(),
      encoder: videoEncoder,
      trim: trimRangeSchema.nullable(),
    }),
    response: z.object({ outputPath: z.string(), encoder: videoEncoder }),
  },
  'export:cancel': {
    request: z.object({ jobId }),
    response: z.void(),
  },
} as const;

export type InvokeContract = typeof invokeContract;
export type InvokeChannel = keyof InvokeContract;
export type InvokeRequest<C extends InvokeChannel> = z.infer<InvokeContract[C]['request']>;
export type InvokeResponse<C extends InvokeChannel> = z.infer<InvokeContract[C]['response']>;

// ---------------------------------------------------------------------------------------------
// Push events (webContents.send → ipcRenderer.on)
// ---------------------------------------------------------------------------------------------

export const eventContract = {
  'export:progress': z.object({
    jobId,
    fraction: z.number().min(0).max(1),
    outTime: z.number().nonnegative(),
    speed: z.string(),
  }),
  'subtitles:progress': z.object({
    jobId,
    phase: z.enum(['extracting', 'transcribing', 'cleaning']),
    fraction: z.number().min(0).max(1),
  }),
} as const;

export type EventContract = typeof eventContract;
export type EventChannel = keyof EventContract;
export type EventPayload<C extends EventChannel> = z.infer<EventContract[C]>;

/**
 * Handlers answer with an envelope because Electron flattens thrown errors to a bare message;
 * the envelope keeps the `AppError.code` intact across the bridge.
 */
export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: SerializedError };

/** Shape of `window.api` as exposed by the preload script. */
export interface PreloadApi {
  invoke<C extends InvokeChannel>(
    channel: C,
    request: InvokeRequest<C>,
  ): Promise<IpcResult<InvokeResponse<C>>>;
  on<C extends EventChannel>(channel: C, listener: (payload: EventPayload<C>) => void): () => void;
  /** Resolve the absolute path of a File dropped onto the window. */
  getPathForFile(file: File): string;
}
