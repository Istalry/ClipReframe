import { copyFile, rm, stat } from 'node:fs/promises';

import { AppError } from '@shared/errors';
import { parseProgressBlock } from '@shared/export/filtergraph';
import { buildOutroPreviewArgs } from '@shared/export/outro-preview';
import type { VideoInfo } from '@shared/types';

import { getBinaryPath } from '../binaries';

import { run } from './process';

export interface OutroPreviewOptions {
  jobId: string;
  source: VideoInfo;
  /** Final location, next to the library copy; written through `<outputPath>.partial`. */
  outputPath: string;
  signal: AbortSignal;
  onProgress: (progress: { jobId: string; fraction: number }) => void;
}

const exists = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
};

/**
 * Render (once) the alpha WebM the preview plays over the clip. A finished copy is reused, so
 * the cost is paid the first time an outro is imported.
 */
export async function makeOutroPreview(options: OutroPreviewOptions): Promise<string> {
  const { jobId, source, outputPath, signal, onProgress } = options;
  if (await exists(outputPath)) {
    onProgress({ jobId, fraction: 1 });
    return outputPath;
  }
  const partial = `${outputPath}.partial`;
  const total = Math.max(0.01, source.duration);
  let block: string[] = [];

  try {
    await run(getBinaryPath('ffmpeg'), buildOutroPreviewArgs(source, partial), {
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
    // Copy rather than rename: a rename fails with EXDEV on redirected profile folders, even
    // within one directory. Only a complete render ever takes the final name.
    await copyFile(partial, outputPath);
    await rm(partial, { force: true }).catch(() => undefined);
  } catch (err) {
    await rm(partial, { force: true }).catch(() => undefined);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError('EXPORT_FAILED', err instanceof Error ? err.message : String(err));
  }
  return outputPath;
}
