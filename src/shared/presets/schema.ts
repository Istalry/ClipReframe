import { z } from 'zod';

import {
  DEFAULT_SUBTITLE_LANGUAGE,
  SPLIT_RATIO_DEFAULT,
  SPLIT_RATIO_MAX,
  SPLIT_RATIO_MIN,
  SUBTITLE_LANGUAGE_CODES,
} from '../constants';
import { defaultRects } from '../geometry/layout';
import type { Preset, ProjectSettings, SubtitleHighlightMode, SubtitleStyle } from '../types';

const unit = z.number().min(0).max(1);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected #rrggbb');

export const SUBTITLE_HIGHLIGHT_MODES = ['none', 'color', 'outline', 'box'] as const;
export const DEFAULT_HIGHLIGHT_MODE: SubtitleHighlightMode = 'box';
export const DEFAULT_HIGHLIGHT_COLOR = '#a970ff';
/** Padding of the subtitle boxes in output pixels; the pre-0.1.2 fixed values. */
export const DEFAULT_BOX_PADDING = { x: 10, y: 4 } as const;

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
  // Added in 0.1.1; defaults keep presets saved by 0.1.0 loading without a file version bump.
  highlightMode: z.enum(SUBTITLE_HIGHLIGHT_MODES).default(DEFAULT_HIGHLIGHT_MODE),
  highlightColor: hexColor.default(DEFAULT_HIGHLIGHT_COLOR),
  // Added in 0.1.2.
  offsetY: z.number().int().min(-960).max(960).default(0),
  boxPaddingX: z.number().int().min(0).max(60).default(DEFAULT_BOX_PADDING.x),
  boxPaddingY: z.number().int().min(0).max(40).default(DEFAULT_BOX_PADDING.y),
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
  offsetY: 0,
  boxPaddingX: DEFAULT_BOX_PADDING.x,
  boxPaddingY: DEFAULT_BOX_PADDING.y,
  maxLineChars: 32,
  uppercase: false,
  highlightMode: DEFAULT_HIGHLIGHT_MODE,
  highlightColor: DEFAULT_HIGHLIGHT_COLOR,
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
