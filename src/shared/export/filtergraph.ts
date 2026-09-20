import { buildAudioMixFilter } from '../audio';
import { MAX_OUTPUT_FPS } from '../constants';
import type { Segment } from '../cuts/segments';
import type {
  AudioSelection,
  OutroPlacement,
  ProjectSettings,
  TrimRange,
  VideoInfo,
} from '../types';

import { encoderArgs, type VideoEncoder } from './encoders';
import { fmt } from './format';
import { appendedOutroChains, outroPlacement, overlayOutroChains } from './outro-chains';
import { trimmedDuration } from './trim';
import { buildSegmentChains } from './video-chain';

export interface ExportArgsInput {
  source: VideoInfo;
  settings: ProjectSettings;
  outro: VideoInfo | null;
  /** Which source tracks end up in the output; the outro always contributes all of its tracks. */
  audio: AudioSelection;
  /**
   * ASS file name **relative to the process cwd** (the service runs ffmpeg inside the temp dir),
   * which sidesteps ffmpeg filter-path escaping for user paths. `null` = no subtitles.
   */
  subtitlesFile: string | null;
  /** Absolute directory containing system fonts, e.g. `C:\Windows\Fonts`. */
  fontsDir: string;
  outputPath: string;
  /** H.264 encoder; defaults to x264 so callers without hardware detection keep 0.1.0 output. */
  encoder?: VideoEncoder | undefined;
  /** Portion of the source to export; null = the whole clip. */
  trim?: TrimRange | null | undefined;
  /** Per-segment layouts; empty or absent = one segment using `settings.layout`. */
  segments?: readonly Segment[] | undefined;
}

/**
 * Escape an absolute path for use inside a filtergraph option. Filter options treat `:` as a
 * separator and `\` as an escape, so Windows paths must become `C\:/dir/file`.
 */
export function escapeFilterPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\\\\\'");
}

export function pickOutputFps(sourceFps: number): number {
  if (!Number.isFinite(sourceFps) || sourceFps <= 0) {
    return 30;
  }
  return Math.min(MAX_OUTPUT_FPS, sourceFps);
}

/**
 * Video chain for the main clip, ending in `[vmain]`. With an overlay outro the subtitles are
 * drawn last, over the outro, which is what the preview shows.
 */
function buildMainVideoChain(input: ExportArgsInput, fps: number, overlay: string[]): string[] {
  const { settings, source, subtitlesFile, fontsDir } = input;
  const chains = buildSegmentChains(
    settings,
    { width: source.width, height: source.height },
    input.segments ?? [],
    input.trim ?? null,
    source.duration,
  );
  const subtitles = subtitlesFile
    ? `subtitles=${subtitlesFile}:fontsdir='${escapeFilterPath(fontsDir)}'`
    : null;

  if (overlay.length > 0) {
    chains.push(`[stacked]fps=${fmt(fps)},format=yuv420p[base]`, ...overlay);
    chains.push(`[ov]${subtitles ?? 'null'}[vmain]`);
    return chains;
  }
  const post = [`fps=${fmt(fps)}`, 'format=yuv420p', ...(subtitles ? [subtitles] : [])];
  chains.push(`[stacked]${post.join(',')}[vmain]`);
  return chains;
}

/** Only tracks that exist survive — a stale selection must never produce an invalid `0:a:n`. */
const existingTracks = (info: VideoInfo, wanted: readonly number[]): number[] =>
  wanted.filter((t) => info.audioTracks.some((track) => track.index === t));

const audioChain = (
  inputIndex: number,
  info: VideoInfo,
  tracks: readonly number[],
  label: string,
  /** Length of generated silence when no track is selected; the trimmed length for the source. */
  duration = info.duration,
): string =>
  buildAudioMixFilter(inputIndex, existingTracks(info, tracks), label, {
    silenceDuration: duration,
  });

export function buildFilterComplex(input: ExportArgsInput): string {
  const fps = pickOutputFps(input.source.fps);
  const clipDuration = trimmedDuration(input.source.duration, input.trim ?? null);
  const outro = input.outro;
  const placement = outroPlacement(input.settings.outro?.mode);
  // The outro's own tracks are always used; a silent one contributes generated silence.
  const outroAudio = outro
    ? audioChain(
        1,
        outro,
        outro.audioTracks.map((t) => t.index),
        'aout',
      )
    : null;
  const overlay =
    outro && placement === 'overlay'
      ? overlayOutroChains(
          outro,
          fps,
          clipDuration,
          outro.audioTracks.length > 0 ? outroAudio : null,
        )
      : null;

  const chains = [
    ...buildMainVideoChain(input, fps, overlay?.video ?? []),
    audioChain(0, input.source, input.audio.exportTracks, 'amain', clipDuration),
  ];

  if (overlay) {
    chains.push('[vmain]null[v]', ...overlay.audio);
  } else if (outro && outroAudio) {
    chains.push(...appendedOutroChains(fps, outroAudio));
    chains.push('[vmain][amain][vout][aout]concat=n=2:v=1:a=1[v][a]');
  } else {
    chains.push('[vmain]null[v]', '[amain]anull[a]');
  }
  return chains.join(';');
}

/** Complete ffmpeg argv (without the executable). Progress is emitted on stdout as key=value lines. */
export function buildExportArgs(input: ExportArgsInput): string[] {
  const fps = pickOutputFps(input.source.fps);
  const args = ['-hide_banner', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1', '-y'];
  if (input.trim) {
    // Input-side seeking: accurate for a re-encode, and the output timeline restarts at 0 so
    // the (already shifted) subtitles line up.
    args.push('-ss', fmt(input.trim.start), '-to', fmt(input.trim.end));
  }
  args.push('-i', input.source.path);
  if (input.outro) {
    args.push('-i', input.outro.path);
  }
  args.push(
    '-filter_complex',
    buildFilterComplex(input),
    '-map',
    '[v]',
    '-map',
    '[a]',
    ...encoderArgs(input.encoder ?? 'libx264'),
    '-pix_fmt',
    'yuv420p',
    '-r',
    fmt(fps),
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    '-movflags',
    '+faststart',
    input.outputPath,
  );
  return args;
}

/** Total seconds the progress denominator should use; an overlay outro adds no length. */
export function totalOutputDuration(
  source: VideoInfo,
  outro: VideoInfo | null,
  trim: TrimRange | null = null,
  placement: OutroPlacement = 'after',
): number {
  const appended = outro && placement === 'after' ? outro.duration : 0;
  return trimmedDuration(source.duration, trim) + appended;
}

/**
 * Parse one `-progress pipe:1` block. Returns the `out_time_us`-derived seconds and speed when
 * present. Keys arrive as `key=value` lines; a block ends with `progress=continue|end`.
 */
export function parseProgressBlock(block: string): { outTime: number; speed: string } | null {
  let outTime: number | null = null;
  let speed = '';
  for (const line of block.split(/\r?\n/)) {
    const [key, value] = line.split('=', 2);
    if (key === 'out_time_us' && value !== undefined) {
      const us = Number(value);
      outTime = Number.isFinite(us) && us >= 0 ? us / 1_000_000 : 0;
    } else if (key === 'out_time_ms' && value !== undefined && outTime === null) {
      // Older builds only emit out_time_ms (which is actually microseconds).
      const us = Number(value);
      outTime = Number.isFinite(us) && us >= 0 ? us / 1_000_000 : 0;
    } else if (key === 'speed' && value !== undefined) {
      speed = value.trim();
    }
  }
  return outTime === null ? null : { outTime, speed };
}
