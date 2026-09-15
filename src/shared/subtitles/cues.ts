import type { SubtitleCue, SubtitleWord } from '../types';

import { hasContent, splitWords } from './text';

/** The cue displayed at `time`, if any. Cues are expected to be non-overlapping. */
export function findActiveCue(cues: SubtitleCue[], time: number): SubtitleCue | undefined {
  return cues.find((c) => time >= c.start && time < c.end);
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Spread the cue duration evenly over its words — the fallback when timings are unusable. */
function evenWords(cue: SubtitleCue, texts: readonly string[]): SubtitleWord[] {
  const step = (cue.end - cue.start) / texts.length;
  return texts.map((text, i) => ({
    start: cue.start + i * step,
    end: cue.start + (i + 1) * step,
    text,
  }));
}

/**
 * Words of the cue **as currently written**, each with a timing. Recognition timings are adopted
 * when the text still has the same number of content words (so fixing a typo keeps them);
 * punctuation-only words such as `?` inherit their neighbour's timing. Otherwise the duration is
 * split evenly, which keeps the highlight moving on edited or timing-less cues.
 */
export function getCueWords(cue: SubtitleCue): SubtitleWord[] {
  const texts = splitWords(cue.text);
  if (texts.length === 0) {
    return [];
  }
  const timed = (cue.words ?? []).filter((w) => hasContent(w.text));
  const contentCount = texts.filter(hasContent).length;
  if (timed.length === 0 || timed.length !== contentCount) {
    return evenWords(cue, texts);
  }

  const words: SubtitleWord[] = [];
  let next = 0;
  for (const text of texts) {
    if (hasContent(text)) {
      const source = timed[next];
      next += 1;
      // `next` never exceeds `timed.length` because the content counts are equal.
      words.push({ start: source?.start ?? cue.start, end: source?.end ?? cue.end, text });
    } else {
      // Attach punctuation to the previous word; a leading one waits for the first real word.
      const prev = words[words.length - 1];
      const anchor = prev ?? timed[0];
      words.push({ start: anchor?.start ?? cue.start, end: anchor?.end ?? cue.end, text });
    }
  }
  return words;
}

/**
 * Contiguous highlight intervals covering the whole cue: word *k* is "current" from its start
 * until the next word starts, so the highlight never blinks off between words. Clamped to the
 * cue and monotonic even if the recognised timings overlap or leak outside the cue.
 */
export function getWordIntervals(cue: SubtitleCue): SubtitleWord[] {
  const words = getCueWords(cue);
  if (words.length === 0) {
    return [];
  }
  const starts: number[] = [];
  let floor = cue.start;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const wanted = i === 0 ? cue.start : (word?.start ?? cue.start);
    floor = clamp(wanted, floor, cue.end);
    starts.push(floor);
  }
  return words.map((word, i) => ({
    text: word.text,
    start: starts[i] ?? cue.start,
    end: starts[i + 1] ?? cue.end,
  }));
}

/** Index of the interval containing `time`, or -1 when outside the cue (or the cue is empty). */
export function findActiveWordIndex(cue: SubtitleCue, time: number): number {
  const intervals = getWordIntervals(cue);
  if (intervals.length === 0 || time < cue.start || time >= cue.end) {
    return -1;
  }
  // The last interval also owns the cue end; search backwards so zero-length intervals lose.
  for (let i = intervals.length - 1; i >= 0; i -= 1) {
    const interval = intervals[i];
    if (interval && time >= interval.start) {
      return i;
    }
  }
  return 0;
}
