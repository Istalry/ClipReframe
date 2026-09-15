import type { SubtitleCue } from '../types';

import { normalizeForCompare } from './text';

export interface CleanupOptions {
  /** Drop cues that are only non-speech markers like `[Musique]`, `(rires)`, `♪`. */
  dropNonSpeech: boolean;
  /** Collapse a phrase repeated 3+ times inside a single cue. */
  collapseRepeats: boolean;
  /** Drop a cue whose normalised text equals the previous kept cue's text. */
  dropConsecutiveDuplicates: boolean;
  /** Drop cues with implausible timing or speech rate. */
  dropImplausible: boolean;
  /** Normalise whitespace and French punctuation spacing. */
  normalizeTypography: boolean;
}

export const DEFAULT_CLEANUP_OPTIONS: CleanupOptions = {
  dropNonSpeech: true,
  collapseRepeats: true,
  dropConsecutiveDuplicates: true,
  dropImplausible: true,
  normalizeTypography: true,
};

export interface CleanupResult {
  cues: SubtitleCue[];
  removedCount: number;
}

const MAX_CUE_DURATION = 15;
/** Characters per second; normal speech sits around 12–18. Whisper loops go far above. */
const MAX_CHARS_PER_SECOND = 40;
const MIN_CUE_DURATION = 0.15;

const NON_SPEECH_ONLY =
  /^[\s\p{P}\p{S}]*((\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|♪+|[.…]+)[\s\p{P}\p{S}]*)+$/u;

export function isNonSpeech(text: string): boolean {
  return text.trim().length === 0 || NON_SPEECH_ONLY.test(text);
}

/**
 * "merci merci merci merci" → "merci"; "ha ha ha ha ha ha" → "ha ha". Works on repeated groups of
 * 1–6 words that occur 3 or more times back to back, keeping the shortest sensible phrase.
 */
export function collapseRepeatedPhrases(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 3) {
    return text.trim();
  }
  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    let collapsed = false;
    for (let size = 1; size <= 6 && !collapsed; size += 1) {
      const phrase = words.slice(i, i + size);
      if (phrase.length < size) {
        break;
      }
      const key = normalizeForCompare(phrase.join(' '));
      if (!key) {
        continue;
      }
      let repeats = 1;
      while (
        normalizeForCompare(words.slice(i + repeats * size, i + (repeats + 1) * size).join(' ')) ===
        key
      ) {
        repeats += 1;
      }
      if (repeats >= 3) {
        // Keep the phrase twice for tiny interjections ("ha ha"), once otherwise.
        const keep = key.length <= 2 ? 2 : 1;
        for (let k = 0; k < keep; k += 1) {
          out.push(...phrase);
        }
        i += repeats * size;
        collapsed = true;
      }
    }
    if (!collapsed) {
      const word = words[i];
      if (word !== undefined) {
        out.push(word);
      }
      i += 1;
    }
  }
  return out.join(' ');
}

/** Whitespace, ellipsis and French spacing before `?`, `!`, `:`, `;`. */
export function normalizeTypography(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\.{3,}/g, '…')
    .replace(/\s*([?!:;])/g, ' $1') // narrow no-break space would be nicer but fonts vary
    .replace(/\s*([,.…])/g, '$1')
    .replace(/([,.…?!:;])(?=\S)/g, '$1 ')
    .replace(/\s+$/g, '')
    .replace(/^\s+/g, '')
    .trim();
}

export function isImplausible(cue: SubtitleCue): boolean {
  const duration = cue.end - cue.start;
  if (!Number.isFinite(duration) || duration < MIN_CUE_DURATION || duration > MAX_CUE_DURATION) {
    return true;
  }
  const chars = cue.text.replace(/\s+/g, '').length;
  return chars / duration > MAX_CHARS_PER_SECOND;
}

export function cleanupCues(
  input: SubtitleCue[],
  options: CleanupOptions = DEFAULT_CLEANUP_OPTIONS,
): CleanupResult {
  const kept: SubtitleCue[] = [];
  let previousKey: string | null = null;

  for (const cue of input) {
    let text = cue.text.trim();

    if (options.dropNonSpeech && isNonSpeech(text)) {
      continue;
    }
    if (options.collapseRepeats) {
      text = collapseRepeatedPhrases(text);
    }
    if (options.normalizeTypography) {
      text = normalizeTypography(text);
    }
    if (text.length === 0) {
      continue;
    }
    const candidate: SubtitleCue = { ...cue, text };
    if (options.dropImplausible && isImplausible(candidate)) {
      continue;
    }
    const key = normalizeForCompare(text);
    if (options.dropConsecutiveDuplicates && key === previousKey) {
      continue;
    }
    previousKey = key;
    kept.push(candidate);
  }

  return { cues: kept, removedCount: input.length - kept.length };
}
