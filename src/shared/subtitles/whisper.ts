import { z } from 'zod';

import type { SubtitleCue } from '../types';

/** Subset of the JSON written by `whisper-cli --output-json`. */
const whisperJsonSchema = z.object({
  result: z.object({ language: z.string().optional() }).optional(),
  transcription: z.array(
    z.object({
      offsets: z.object({ from: z.number(), to: z.number() }),
      text: z.string(),
    }),
  ),
});

export interface WhisperTranscript {
  cues: SubtitleCue[];
  language: string | null;
}

/** Parse whisper-cli JSON output into cues (seconds). Throws a ZodError on unexpected shape. */
export function parseWhisperJson(raw: unknown): WhisperTranscript {
  const data = whisperJsonSchema.parse(raw);
  const cues = data.transcription.map((segment, index) => ({
    id: `w${index}`,
    start: segment.offsets.from / 1000,
    end: segment.offsets.to / 1000,
    text: segment.text.trim(),
  }));
  return { cues, language: data.result?.language ?? null };
}

/**
 * whisper-cli prints `whisper_print_progress_callback: progress = 42%` lines on stderr when
 * `--print-progress` is set. Returns 0..1 or null if the line is not a progress line.
 */
export function parseWhisperProgressLine(line: string): number | null {
  const m = /progress\s*=\s*(\d+)%/.exec(line);
  if (!m?.[1]) {
    return null;
  }
  return Math.min(1, Number(m[1]) / 100);
}
