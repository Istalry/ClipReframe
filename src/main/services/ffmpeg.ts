import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { AppError } from '@shared/errors';
import type { VideoEncoder } from '@shared/export/encoders';
import {
  buildExportArgs,
  parseProgressBlock,
  totalOutputDuration,
} from '@shared/export/filtergraph';
import { applyTrimToCues } from '@shared/export/trim';
import { buildAss } from '@shared/subtitles/ass';
import type { ExportProgress, ExportRequest } from '@shared/types';

import { getBinaryPath, getSystemFontsDir } from '../binaries';
import { createLogger } from '../logger';

import { run } from './process';
import { createTempDir } from './temp';

const log = createLogger('export');

export interface ExportJobOptions {
  jobId: string;
  request: ExportRequest;
  signal: AbortSignal;
  onProgress: (progress: ExportProgress) => void;
}

export interface ExportResult {
  outputPath: string;
  /** The encoder that produced the file — x264 when the requested GPU encoder failed. */
  encoder: VideoEncoder;
}

const SUBTITLES_FILE = 'subs.ass';

/** Runs one export end to end. Throws `AppError` with EXPORT_FAILED / EXPORT_CANCELLED. */
export async function runExport(options: ExportJobOptions): Promise<ExportResult> {
  const { jobId, request, signal, onProgress } = options;
  const temp = await createTempDir('export');

  try {
    const useSubtitles = request.settings.subtitles.enabled && request.cues.length > 0;
    if (useSubtitles) {
      const ass = buildAss(
        applyTrimToCues(request.cues, request.trim),
        request.settings.subtitles.style,
      );
      await writeFile(join(temp.path, SUBTITLES_FILE), ass, 'utf8');
    }

    const total = Math.max(0.01, totalOutputDuration(request.source, request.outro, request.trim));
    const encode = async (encoder: VideoEncoder): Promise<void> => {
      const args = buildExportArgs({
        source: request.source,
        settings: request.settings,
        outro: request.outro,
        audio: request.audio,
        subtitlesFile: useSubtitles ? SUBTITLES_FILE : null,
        fontsDir: getSystemFontsDir(),
        outputPath: request.outputPath,
        encoder,
        trim: request.trim,
        segments: request.segments,
      });
      let block: string[] = [];
      await run(getBinaryPath('ffmpeg'), args, {
        cwd: temp.path,
        signal,
        failureCode: 'EXPORT_FAILED',
        cancelCode: 'EXPORT_CANCELLED',
        onStdoutLine: (line) => {
          block.push(line);
          if (line.startsWith('progress=')) {
            const parsed = parseProgressBlock(block.join('\n'));
            block = [];
            if (parsed) {
              onProgress({
                jobId,
                fraction: Math.min(1, parsed.outTime / total),
                outTime: parsed.outTime,
                speed: parsed.speed,
              });
            }
          }
        },
      });
    };

    let encoder = request.encoder;
    try {
      await encode(encoder);
    } catch (err) {
      // A GPU encoder can fail at any time (driver, exclusive session, unsupported size); the
      // CPU path always works, so retry once rather than failing the export.
      if (encoder === 'libx264' || !(err instanceof AppError) || err.code !== 'EXPORT_FAILED') {
        throw err;
      }
      log.warn(`${encoder} failed, retrying with libx264: ${err.message}`);
      encoder = 'libx264';
      onProgress({ jobId, fraction: 0, outTime: 0, speed: '' });
      await encode(encoder);
    }

    onProgress({ jobId, fraction: 1, outTime: total, speed: '' });
    return { outputPath: request.outputPath, encoder };
  } catch (err) {
    // Never leave a truncated MP4 behind.
    await rm(request.outputPath, { force: true }).catch(() => undefined);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError('EXPORT_FAILED', err instanceof Error ? err.message : String(err));
  } finally {
    await temp.dispose().catch(() => undefined);
  }
}
