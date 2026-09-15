import type { AudioSelection, VideoInfo } from './types';

/** Every track for both pipelines — what a user gets without touching the track dialog. */
export function defaultAudioSelection(info: VideoInfo): AudioSelection {
  const all = info.audioTracks.map((t) => t.index);
  return { transcribeTracks: [...all], exportTracks: [...all] };
}

export interface AudioMixOptions {
  /** Mono 16 kHz for speech recognition instead of stereo 48 kHz for export. */
  mono?: boolean;
  /** Seconds of silence to synthesise when no track is selected. */
  silenceDuration: number;
}

const format = (mono: boolean): string =>
  mono
    ? 'aformat=sample_fmts=fltp:sample_rates=16000:channel_layouts=mono'
    : 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';

const fmtSeconds = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(3));

/**
 * Filtergraph fragment that turns the selected audio tracks of input `inputIndex` into one
 * stream labelled `[label]`. Used both for the export mix and for the whisper extraction so the
 * two pipelines hear the same thing.
 *
 * - no track → generated silence (keeps concat/muxing simple);
 * - one track → format only;
 * - several → `amix` without normalisation (each track keeps its recorded level, like the
 *   OBS mixdown would) followed by a limiter so the sum cannot clip.
 */
export function buildAudioMixFilter(
  inputIndex: number,
  tracks: readonly number[],
  label: string,
  options: AudioMixOptions,
): string {
  const mono = options.mono ?? false;
  if (tracks.length === 0) {
    const layout = mono ? 'mono' : 'stereo';
    const rate = mono ? 16000 : 48000;
    return `anullsrc=r=${rate}:cl=${layout}:d=${fmtSeconds(options.silenceDuration)}[${label}]`;
  }
  if (tracks.length === 1) {
    return `[${inputIndex}:a:${tracks[0]}]${format(mono)}[${label}]`;
  }
  const inputs = tracks.map((t, i) => `[${inputIndex}:a:${t}]${format(mono)}[${label}_${i}]`);
  const joined = tracks.map((_, i) => `[${label}_${i}]`).join('');
  return [
    ...inputs,
    `${joined}amix=inputs=${tracks.length}:normalize=0,alimiter=limit=0.95[${label}]`,
  ].join(';');
}

/** "1+2+3" for display; tracks are shown 1-based to match how OBS numbers them. */
export function formatTrackList(tracks: readonly number[]): string {
  return tracks.length === 0 ? 'none' : tracks.map((t) => t + 1).join('+');
}
