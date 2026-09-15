import type { SubtitleCue, SubtitleWord, TrimRange } from '../types';

/** Shortest range that still makes sense to export. */
export const TRIM_MIN_DURATION = 0.5;

/** Keep the range inside the clip, ordered, and at least `TRIM_MIN_DURATION` long. */
export function clampTrim(trim: TrimRange, duration: number): TrimRange {
  const end = Math.min(duration, Math.max(TRIM_MIN_DURATION, trim.end));
  const start = Math.min(Math.max(0, trim.start), end - TRIM_MIN_DURATION);
  return { start: Math.max(0, start), end };
}

/** A trim that covers the whole clip is no trim at all. */
export function isWholeClip(trim: TrimRange | null, duration: number): boolean {
  return trim === null || (trim.start <= 0 && trim.end >= duration);
}

/** Seconds of the source that end up in the export. */
export function trimmedDuration(duration: number, trim: TrimRange | null): number {
  return trim ? Math.max(0, trim.end - trim.start) : duration;
}

const shiftWord = (word: SubtitleWord, offset: number): SubtitleWord => ({
  ...word,
  start: word.start + offset,
  end: word.end + offset,
});

/**
 * Cues as the trimmed export sees them: those outside the range are dropped, those crossing an
 * edge are cut at it, and everything is shifted so the range starts at 0 (word timings too —
 * `getCueWords` clamps them into the cue, so partially cut words still highlight sensibly).
 */
export function applyTrimToCues(
  cues: readonly SubtitleCue[],
  trim: TrimRange | null,
): SubtitleCue[] {
  if (!trim) {
    return [...cues];
  }
  const offset = -trim.start;
  return cues
    .filter((cue) => cue.end > trim.start && cue.start < trim.end)
    .map((cue) => ({
      ...cue,
      start: Math.max(cue.start, trim.start) + offset,
      end: Math.min(cue.end, trim.end) + offset,
      ...(cue.words ? { words: cue.words.map((w) => shiftWord(w, offset)) } : {}),
    }));
}
