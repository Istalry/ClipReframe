import type { SubtitleLanguage } from './constants';

/** Rectangle normalised to the source frame: every value is in 0..1. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Rectangle in source pixels. */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LayoutMode = 'split' | 'fill';

export interface VideoInfo {
  path: string;
  fileName: string;
  width: number;
  height: number;
  /** Seconds. */
  duration: number;
  fps: number;
  videoCodec: string;
  hasAudio: boolean;
}

export type SubtitleAlignment = 'top' | 'center' | 'bottom';

export interface SubtitleStyle {
  fontFamily: string;
  /** In output pixels (1080×1920 canvas). */
  fontSize: number;
  bold: boolean;
  italic: boolean;
  /** `#rrggbb` */
  primaryColor: string;
  outlineColor: string;
  outlineWidth: number;
  shadow: number;
  /** Draw an opaque box behind the text instead of an outline. */
  backgroundBox: boolean;
  backgroundColor: string;
  alignment: SubtitleAlignment;
  /** Distance from the top/bottom edge in output pixels. */
  marginV: number;
  /** Soft-wrap cues longer than this many characters. */
  maxLineChars: number;
  uppercase: boolean;
}

export interface SubtitleCue {
  id: string;
  /** Seconds. */
  start: number;
  end: number;
  text: string;
}

export interface SubtitleSettings {
  enabled: boolean;
  language: SubtitleLanguage;
  style: SubtitleStyle;
}

export interface OutroSettings {
  path: string;
}

export interface Preset {
  id: string;
  name: string;
  layout: LayoutMode;
  splitRatio: number;
  /** Only meaningful when `layout === 'split'`, but always stored so switching back is lossless. */
  webcamRect: Rect;
  gameplayRect: Rect;
  subtitles: SubtitleSettings;
  outro: OutroSettings | null;
  createdAt: string;
  updatedAt: string;
}

/** Everything needed to produce one export. A preset is exactly this plus identity fields. */
export type ProjectSettings = Pick<
  Preset,
  'layout' | 'splitRatio' | 'webcamRect' | 'gameplayRect' | 'subtitles' | 'outro'
>;

export interface ExportRequest {
  source: VideoInfo;
  settings: ProjectSettings;
  cues: SubtitleCue[];
  outro: VideoInfo | null;
  outputPath: string;
}

export interface ExportProgress {
  jobId: string;
  /** 0..1 */
  fraction: number;
  /** Seconds of output produced so far. */
  outTime: number;
  speed: string;
}

export interface TranscribeProgress {
  jobId: string;
  phase: 'extracting' | 'transcribing' | 'cleaning';
  /** 0..1 */
  fraction: number;
}

export interface TranscribeResult {
  cues: SubtitleCue[];
  removedCount: number;
  detectedLanguage: string | null;
}
