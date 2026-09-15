import { z } from 'zod';

import type { SubtitleCue, SubtitleWord } from '../types';

const offsetsSchema = z.object({ from: z.number(), to: z.number() });

/** One token of `--output-json-full`; timings are absent when whisper could not place it. */
const whisperTokenSchema = z.object({
  text: z.string(),
  offsets: offsetsSchema.optional(),
});

/** Subset of the JSON written by `whisper-cli --output-json [--output-json-full]`. */
const whisperJsonSchema = z.object({
  result: z.object({ language: z.string().optional() }).optional(),
  transcription: z.array(
    z.object({
      offsets: offsetsSchema,
      text: z.string(),
      tokens: z.array(whisperTokenSchema).optional(),
    }),
  ),
});

export type WhisperToken = z.infer<typeof whisperTokenSchema>;

export interface WhisperTranscript {
  cues: SubtitleCue[];
  language: string | null;
}

/** `[_BEG_]`, `[_TT_228]`, `[_EOT_]`… — control tokens that carry no text. */
const SPECIAL_TOKEN = /^\[_[A-Z_0-9]+\]$/;

/**
 * Merge sub-word tokens into words. A token starting with whitespace begins a new word; any
 * other token (word continuation, punctuation) extends the current one, which mirrors how the
 * segment text splits on whitespace so the two stay aligned.
 */
export function tokensToWords(tokens: readonly WhisperToken[]): SubtitleWord[] {
  const words: SubtitleWord[] = [];
  for (const token of tokens) {
    if (!token.offsets || SPECIAL_TOKEN.test(token.text)) {
      continue;
    }
    const start = token.offsets.from / 1000;
    const end = token.offsets.to / 1000;
    const last = words[words.length - 1];
    if (last && !/^\s/.test(token.text)) {
      last.text += token.text;
      last.end = Math.max(last.end, end);
    } else {
      words.push({ start, end, text: token.text.trim() });
    }
  }
  return words.filter((w) => w.text.length > 0);
}

/** Parse whisper-cli JSON output into cues (seconds). Throws a ZodError on unexpected shape. */
export function parseWhisperJson(raw: unknown): WhisperTranscript {
  const data = whisperJsonSchema.parse(raw);
  const cues = data.transcription.map((segment, index): SubtitleCue => {
    const words = segment.tokens ? tokensToWords(segment.tokens) : [];
    return {
      id: `w${index}`,
      start: segment.offsets.from / 1000,
      end: segment.offsets.to / 1000,
      text: segment.text.trim(),
      ...(words.length > 0 ? { words } : {}),
    };
  });
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
