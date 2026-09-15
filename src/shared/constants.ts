/** Target output for TikTok / YouTube Shorts. */
export const OUTPUT_WIDTH = 1080;
export const OUTPUT_HEIGHT = 1920;
export const OUTPUT_ASPECT = OUTPUT_WIDTH / OUTPUT_HEIGHT;

/** Split layout: fraction of the output height given to the webcam (top) region. */
export const SPLIT_RATIO_DEFAULT = 0.35;
export const SPLIT_RATIO_MIN = 0.2;
export const SPLIT_RATIO_MAX = 0.6;

/** Smallest rectangle edge, normalised to the source frame. Prevents degenerate crops. */
export const RECT_MIN_SIZE = 0.05;

export const MAX_OUTPUT_FPS = 60;

export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.webm', '.m4v'] as const;

export const SUBTITLE_LANGUAGE_CODES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'auto'] as const;
export type SubtitleLanguage = (typeof SUBTITLE_LANGUAGE_CODES)[number];

export const SUBTITLE_LANGUAGE_LABELS: Record<SubtitleLanguage, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  auto: 'Auto-detect',
};

export const DEFAULT_SUBTITLE_LANGUAGE: SubtitleLanguage = 'auto';
