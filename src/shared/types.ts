import type { SubtitleLanguage } from './constants';
import type { VideoEncoder } from './export/encoders';

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

export interface AudioTrack {
  /** Index among the file's audio streams (0-based) → ffmpeg `0:a:<index>`. */
  index: number;
  codec: string;
  channels: number;
  sampleRate: number;
  /** From stream tags: title, else language, else null. */
  label: string | null;
}

export interface VideoInfo {
  path: string;
  fileName: string;
  width: number;
  height: number;
  /** Seconds. */
  duration: number;
  fps: number;
  videoCodec: string;
  /** ffprobe `pix_fmt`, e.g. `yuv420p`, `yuv420p10le`; tells whether Chromium can decode it. */
  pixelFormat?: string | undefined;
  audioTracks: AudioTrack[];
}

/** Which audio tracks of the source clip feed each pipeline. Per clip, not stored in presets. */
export interface AudioSelection {
  /** Mixed together and fed to speech-to-text; empty = cannot transcribe. */
  transcribeTracks: number[];
  /** Summed into the export; empty = silent output. */
  exportTracks: number[];
}

export type SubtitleAlignment = 'top' | 'center' | 'bottom';

/** How the word being spoken is emphasised inside the cue. */
export type SubtitleHighlightMode = 'none' | 'color' | 'outline' | 'box';

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
  highlightMode: SubtitleHighlightMode;
  /** `#rrggbb` */
  highlightColor: string;
}

/** One spoken word with its timing, as reported by speech recognition. Seconds. */
export interface SubtitleWord {
  start: number;
  end: number;
  text: string;
}

export interface SubtitleCue {
  id: string;
  /** Seconds. */
  start: number;
  end: number;
  text: string;
  /**
   * Word timings from recognition, when available. Kept verbatim across text edits; the
   * renderers re-align them to the current text (see `getCueWords`).
   */
  words?: SubtitleWord[] | undefined;
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

/** Portion of the source clip to export, in seconds. Per clip, never stored in presets. */
export interface TrimRange {
  start: number;
  end: number;
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
  audio: AudioSelection;
  outputPath: string;
  encoder: VideoEncoder;
  trim: TrimRange | null;
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
