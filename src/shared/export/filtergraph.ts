import { buildAudioMixFilter } from '../audio';
import { MAX_OUTPUT_FPS, OUTPUT_HEIGHT, OUTPUT_WIDTH } from '../constants';
import { getOutputRegions, toPixelRect, type OutputRegion } from '../geometry/layout';
import type { AudioSelection, PixelRect, ProjectSettings, VideoInfo } from '../types';

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

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(3));

const cropScale = (crop: PixelRect, region: OutputRegion): string =>
  `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=${OUTPUT_WIDTH}:${region.height}:flags=lanczos,setsar=1`;

/** Video chain for the main clip, ending in `[vmain]`. */
function buildMainVideoChain(input: ExportArgsInput, fps: number): string[] {
  const { settings, source, subtitlesFile, fontsDir } = input;
  const regions = getOutputRegions(settings.layout, settings.splitRatio);
  const frame = { width: source.width, height: source.height };
  const chains: string[] = [];

  if (settings.layout === 'split') {
    const [top, bottom] = regions;
    if (!top || !bottom) {
      throw new Error('Split layout requires two regions');
    }
    chains.push(`[0:v]${cropScale(toPixelRect(settings.webcamRect, frame), top)}[top]`);
    chains.push(`[0:v]${cropScale(toPixelRect(settings.gameplayRect, frame), bottom)}[bot]`);
    chains.push('[top][bot]vstack=inputs=2[stacked]');
  } else {
    const [full] = regions;
    if (!full) {
      throw new Error('Fill layout requires a region');
    }
    chains.push(`[0:v]${cropScale(toPixelRect(settings.gameplayRect, frame), full)}[stacked]`);
  }

  const post = [`fps=${fmt(fps)}`, 'format=yuv420p'];
  if (subtitlesFile) {
    post.push(`subtitles=${subtitlesFile}:fontsdir='${escapeFilterPath(fontsDir)}'`);
  }
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
): string =>
  buildAudioMixFilter(inputIndex, existingTracks(info, tracks), label, {
    silenceDuration: info.duration,
  });

function buildOutroChains(outro: VideoInfo, fps: number): string[] {
  const allTracks = outro.audioTracks.map((t) => t.index);
  return [
    `[1:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fmt(fps)},format=yuv420p[vout]`,
    audioChain(1, outro, allTracks, 'aout'),
  ];
}

export function buildFilterComplex(input: ExportArgsInput): string {
  const fps = pickOutputFps(input.source.fps);
  const chains = [
    ...buildMainVideoChain(input, fps),
    audioChain(0, input.source, input.audio.exportTracks, 'amain'),
  ];
  if (input.outro) {
    chains.push(...buildOutroChains(input.outro, fps));
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
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '17',
    '-profile:v',
    'high',
    '-level',
    '4.2',
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

/** Total seconds the progress denominator should use. */
export function totalOutputDuration(source: VideoInfo, outro: VideoInfo | null): number {
  return source.duration + (outro?.duration ?? 0);
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
