import { z } from 'zod';

import {
  DEFAULT_SUBTITLE_LANGUAGE,
  SPLIT_RATIO_DEFAULT,
  SPLIT_RATIO_MAX,
  SPLIT_RATIO_MIN,
  SUBTITLE_LANGUAGE_CODES,
} from '../constants';
import { defaultRects } from '../geometry/layout';
import type { Preset, ProjectSettings, SubtitleStyle } from '../types';

const unit = z.number().min(0).max(1);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected #rrggbb');

export const rectSchema = z.object({ x: unit, y: unit, width: unit, height: unit });

export const subtitleStyleSchema = z.object({
  fontFamily: z.string().min(1),
  fontSize: z.number().int().min(16).max(200),
  bold: z.boolean(),
  italic: z.boolean(),
  primaryColor: hexColor,
  outlineColor: hexColor,
  outlineWidth: z.number().min(0).max(20),
  shadow: z.number().min(0).max(20),
  backgroundBox: z.boolean(),
  backgroundColor: hexColor,
  alignment: z.enum(['top', 'center', 'bottom']),
  marginV: z.number().int().min(0).max(960),
  maxLineChars: z.number().int().min(10).max(80),
  uppercase: z.boolean(),
}) satisfies z.ZodType<SubtitleStyle>;

export const subtitleSettingsSchema = z.object({
  enabled: z.boolean(),
  language: z.enum(SUBTITLE_LANGUAGE_CODES),
  style: subtitleStyleSchema,
});

export const outroSettingsSchema = z.object({ path: z.string().min(1) }).nullable();

export const projectSettingsSchema = z.object({
  layout: z.enum(['split', 'fill']),
  splitRatio: z.number().min(SPLIT_RATIO_MIN).max(SPLIT_RATIO_MAX),
  webcamRect: rectSchema,
  gameplayRect: rectSchema,
  subtitles: subtitleSettingsSchema,
  outro: outroSettingsSchema,
}) satisfies z.ZodType<ProjectSettings>;

export const presetSchema = projectSettingsSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Preset>;

export const PRESETS_FILE_VERSION = 1;

export const presetsFileSchema = z.object({
  version: z.literal(PRESETS_FILE_VERSION),
  defaultPresetId: z.string().nullable(),
  presets: z.array(presetSchema),
});

export type PresetsFile = z.infer<typeof presetsFileSchema>;

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'Arial',
  fontSize: 64,
  bold: true,
  italic: false,
  primaryColor: '#ffffff',
  outlineColor: '#000000',
  outlineWidth: 4,
  shadow: 0,
  backgroundBox: false,
  backgroundColor: '#000000',
  alignment: 'bottom',
  marginV: 260,
  maxLineChars: 32,
  uppercase: false,
};

export function createDefaultSettings(): ProjectSettings {
  const rects = defaultRects('split', SPLIT_RATIO_DEFAULT, { width: 1920, height: 1080 });
  return {
    layout: 'split',
    splitRatio: SPLIT_RATIO_DEFAULT,
    ...rects,
    subtitles: {
      enabled: false,
      language: DEFAULT_SUBTITLE_LANGUAGE,
      style: { ...DEFAULT_SUBTITLE_STYLE },
    },
    outro: null,
  };
}

export function createEmptyPresetsFile(): PresetsFile {
  return { version: PRESETS_FILE_VERSION, defaultPresetId: null, presets: [] };
}

/**
 * Parse a presets file of any historical version. Today there is only v1; future migrations go
 * here so the store never has to know about old shapes.
 */
export function migratePresetsFile(raw: unknown): PresetsFile {
  return presetsFileSchema.parse(raw);
}
