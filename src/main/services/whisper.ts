import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { SubtitleLanguage } from '@shared/constants';
import { AppError } from '@shared/errors';
import { cleanupCues } from '@shared/subtitles/cleanup';
import { parseWhisperJson, parseWhisperProgressLine } from '@shared/subtitles/whisper';
import type { TranscribeProgress, TranscribeResult } from '@shared/types';

import { getBinaryPath, getWhisperModelPath } from '../binaries';

import { run } from './process';
import { createTempDir } from './temp';

export interface TranscribeJobOptions {
  jobId: string;
  sourcePath: string;
  language: SubtitleLanguage;
  signal: AbortSignal;
  onProgress: (progress: TranscribeProgress) => void;
}

/** whisper.cpp wants 16 kHz mono PCM. */
async function extractAudio(source: string, wavPath: string, signal: AbortSignal): Promise<void> {
  await run(
    getBinaryPath('ffmpeg'),
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      source,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-c:a',
      'pcm_s16le',
      wavPath,
    ],
    { signal, failureCode: 'TRANSCRIBE_FAILED', cancelCode: 'TRANSCRIBE_CANCELLED' },
  );
}

export async function runTranscription(options: TranscribeJobOptions): Promise<TranscribeResult> {
  const { jobId, sourcePath, language, signal, onProgress } = options;
  const model = getWhisperModelPath();
  if (!model) {
    throw new AppError('BINARY_MISSING', 'No whisper model (ggml-*.bin) found');
  }

  const temp = await createTempDir('whisper');
  try {
    const wav = join(temp.path, 'audio.wav');
    onProgress({ jobId, phase: 'extracting', fraction: 0 });
    await extractAudio(sourcePath, wav, signal);

    onProgress({ jobId, phase: 'transcribing', fraction: 0 });
    const outBase = join(temp.path, 'out');
    await run(
      getBinaryPath('whisper-cli'),
      [
        '-m',
        model,
        '-f',
        wav,
        '-l',
        language,
        '--output-json',
        '--output-file',
        outBase,
        '--max-len',
        '42',
        '--split-on-word',
        '--print-progress',
        '--no-prints',
      ],
      {
        signal,
        failureCode: 'TRANSCRIBE_FAILED',
        cancelCode: 'TRANSCRIBE_CANCELLED',
        onStderrLine: (line) => {
          const fraction = parseWhisperProgressLine(line);
          if (fraction !== null) {
            onProgress({ jobId, phase: 'transcribing', fraction });
          }
        },
      },
    );

    onProgress({ jobId, phase: 'cleaning', fraction: 1 });
    const raw: unknown = JSON.parse(await readFile(`${outBase}.json`, 'utf8'));
    const transcript = parseWhisperJson(raw);
    const cleaned = cleanupCues(transcript.cues);
    return {
      cues: cleaned.cues,
      removedCount: cleaned.removedCount,
      detectedLanguage: transcript.language,
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError('TRANSCRIBE_FAILED', err instanceof Error ? err.message : String(err));
  } finally {
    await temp.dispose().catch(() => undefined);
  }
}
