import { buildDetectCutsArgs, parseSceneChangeLine } from '@shared/cuts/detect';
import { AppError } from '@shared/errors';
import { parseProgressBlock } from '@shared/export/filtergraph';
import type { VideoInfo } from '@shared/types';

import { getBinaryPath } from '../binaries';

import { run } from './process';

export interface DetectCutsOptions {
  jobId: string;
  source: VideoInfo;
  threshold: number;
  signal: AbortSignal;
  onProgress: (progress: { jobId: string; fraction: number }) => void;
}

/**
 * Find scene changes by decoding the clip once through `scdet`, which logs one line per change
 * on stderr. Nothing is written: the output goes to the null muxer.
 */
export async function detectCuts(options: DetectCutsOptions): Promise<number[]> {
  const { jobId, source, threshold, signal, onProgress } = options;
  const total = Math.max(0.01, source.duration);
  const times = new Set<number>();
  let block: string[] = [];

  try {
    await run(getBinaryPath('ffmpeg'), buildDetectCutsArgs(source.path, threshold), {
      signal,
      failureCode: 'EXPORT_FAILED',
      cancelCode: 'EXPORT_CANCELLED',
      onStderrLine: (line) => {
        const time = parseSceneChangeLine(line);
        if (time !== null) {
          times.add(time);
        }
      },
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
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError('EXPORT_FAILED', err instanceof Error ? err.message : String(err));
  }

  return [...times].sort((a, b) => a - b);
}
