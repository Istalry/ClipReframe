import { join } from 'node:path';

import { AppError } from '@shared/errors';
import type { VideoEncoder } from '@shared/export/encoders';
import { parseProgressBlock } from '@shared/export/filtergraph';
import { buildProxyArgs } from '@shared/export/proxy';
import type { VideoInfo } from '@shared/types';

import { getBinaryPath } from '../binaries';

import { run } from './process';
import { createTempDir, type TempDir } from './temp';

export interface ProxyJobOptions {
  jobId: string;
  source: VideoInfo;
  encoder: VideoEncoder;
  signal: AbortSignal;
  onProgress: (progress: { jobId: string; fraction: number }) => void;
}

/** The proxy the renderer is playing; replaced (and its folder removed) by the next one. */
let current: TempDir | null = null;

/**
 * Transcode a clip Chromium cannot decode into a small H.264 file for the preview. Throws
 * `AppError` with EXPORT_FAILED / EXPORT_CANCELLED like the other ffmpeg jobs.
 */
export async function makeProxy(options: ProxyJobOptions): Promise<string> {
  const { jobId, source, encoder, signal, onProgress } = options;
  const temp = await createTempDir('proxy');
  const output = join(temp.path, 'proxy.mp4');
  const total = Math.max(0.01, source.duration);
  let block: string[] = [];
  try {
    await run(getBinaryPath('ffmpeg'), buildProxyArgs(source, encoder, output), {
      signal,
      failureCode: 'EXPORT_FAILED',
      cancelCode: 'EXPORT_CANCELLED',
      onStdoutLine: (line) => {
        block.push(line);
        if (line.startsWith('progress=')) {
          const parsed = parseProgressBlock(block.join('\n'));
          block = [];
          if (parsed) {
            onProgress({ jobId, fraction: Math.min(1, parsed.outTime / total) });
          }
        }
      },
    });
  } catch (err) {
    await temp.dispose().catch(() => undefined);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError('EXPORT_FAILED', err instanceof Error ? err.message : String(err));
  }
  await disposeProxy();
  current = temp;
  return output;
}

/** Remove the last proxy (clip closed, app quitting). */
export async function disposeProxy(): Promise<void> {
  const previous = current;
  current = null;
  await previous?.dispose().catch(() => undefined);
}
