import { join } from 'node:path';

import { buildAudioMixFilter } from '@shared/audio';

import { getBinaryPath } from '../binaries';

import { run } from './process';
import { createTempDir, type TempDir } from './temp';

export interface PreviewAudioOptions {
  sourcePath: string;
  /** Audio-relative stream indices summed into the mix; empty renders silence. */
  audioTracks: readonly number[];
  /** Seconds; only used to size the silence when no track is selected. */
  duration: number;
  signal: AbortSignal;
}

/** The mix currently playable by the renderer; replaced (and its folder removed) on every render. */
let current: TempDir | null = null;

/**
 * Render the export audio mix of a clip to a small AAC file so the preview plays what the export
 * will contain (Chromium can only play a file's default track). Same filter as the export, so
 * levels and limiting match.
 */
export async function renderPreviewAudio(options: PreviewAudioOptions): Promise<string> {
  const { sourcePath, audioTracks, duration, signal } = options;
  const temp = await createTempDir('preview-audio');
  const output = join(temp.path, 'mix.m4a');
  try {
    await run(
      getBinaryPath('ffmpeg'),
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        sourcePath,
        '-filter_complex',
        buildAudioMixFilter(0, audioTracks, 'a', { silenceDuration: duration }),
        '-map',
        '[a]',
        '-vn',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        output,
      ],
      { signal, failureCode: 'EXPORT_FAILED', cancelCode: 'EXPORT_CANCELLED' },
    );
  } catch (err) {
    await temp.dispose().catch(() => undefined);
    throw err;
  }
  await disposePreviewAudio();
  current = temp;
  return output;
}

/** Remove the last rendered mix (clip closed, app quitting). */
export async function disposePreviewAudio(): Promise<void> {
  const previous = current;
  current = null;
  await previous?.dispose().catch(() => undefined);
}
