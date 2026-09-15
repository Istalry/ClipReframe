import type { SubtitleCue, SubtitleHighlightMode, SubtitleStyle } from '../types';

import { dialogueLine, escapeAssText, hexToAssColor, wrapWords } from './ass-format';
import { getWordIntervals } from './cues';

export type ActiveHighlightMode = Exclude<SubtitleHighlightMode, 'none'>;

/** `outline` has nothing to recolour when the base style draws a box instead of an outline. */
export function effectiveHighlightMode(style: SubtitleStyle): SubtitleHighlightMode {
  return style.highlightMode === 'outline' && style.backgroundBox ? 'none' : style.highlightMode;
}

/** Thickness of the pill drawn behind the current word, in output pixels. */
export const boxPadding = (fontSize: number): number => Math.round(fontSize * 0.22);

/** Extra ASS styles the `box` highlight needs on top of a background-box base (see below). */
const PILL_STYLE = 'Pill';
const TEXT_STYLE = 'Text';

/**
 * Variants of the base style, same metrics so events align: `Pill` swaps the box for an outline
 * (the pill is a thick outline) and `Text` draws bare glyphs.
 */
export function highlightStyleVariants(
  style: SubtitleStyle,
  mode: SubtitleHighlightMode,
): [name: string, style: SubtitleStyle][] {
  if (mode !== 'box' || !style.backgroundBox) {
    return [];
  }
  return [
    [PILL_STYLE, { ...style, backgroundBox: false, shadow: 0 }],
    [TEXT_STYLE, { ...style, backgroundBox: false, outlineWidth: 0, shadow: 0 }],
  ];
}

const INVISIBLE = '{\\alpha&HFF&}';
const RESET = '{\\r}';

interface WordTags {
  /** Placed once at the very start of the event text. */
  prefix: string;
  open: string;
  close: string;
}

const PLAIN: WordTags = { prefix: '', open: '', close: '' };

/** Join wrapped words back into event text, wrapping the word at `index` in override tags. */
function renderText(lines: readonly (readonly string[])[], index: number, tags: WordTags): string {
  let position = 0;
  const rendered = lines.map((line) =>
    line
      .map((word) => {
        const current = position === index;
        position += 1;
        return current ? `${tags.open}${word}${tags.close}` : word;
      })
      .join(' '),
  );
  return tags.prefix + rendered.join('\\N');
}

/**
 * ASS has no "current word" primitive (`\k` karaoke is cumulative), so every word interval
 * becomes its own Dialogue showing the whole cue with inline overrides on that word. The text
 * and style are identical across events, so nothing moves when the highlight advances.
 *
 * - `color` / `outline`: recolour the word's fill / outline.
 * - `box`: a "pill" event where every other word is fully transparent (still laid out) and the
 *   current one is drawn in the highlight colour with a thick outline that merges into a rounded
 *   blob, under a copy of the text. On a background-box base the line box is drawn first, then
 *   the pill with the outline-based `Pill` style, then bare glyphs with the `Text` style —
 *   libass draws one box per line, so an inline colour override cannot recolour a segment.
 */
export function buildHighlightEvents(
  cue: SubtitleCue,
  style: SubtitleStyle,
  mode: ActiveHighlightMode,
): string[] {
  const intervals = getWordIntervals(cue);
  const words = intervals.map((w) =>
    escapeAssText(style.uppercase ? w.text.toUpperCase() : w.text),
  );
  const lines = wrapWords(words, style.maxLineChars);
  // Override tags conventionally close the colour with a trailing `&`.
  const color = `${hexToAssColor(style.highlightColor)}&`;
  const pill: WordTags = {
    prefix: INVISIBLE,
    open: `{\\alpha&H00&\\1c${color}\\3c${color}\\bord${boxPadding(style.fontSize)}\\shad0}`,
    close: INVISIBLE,
  };

  return intervals.flatMap((interval, index) => {
    if (interval.end <= interval.start) {
      return [];
    }
    const event = (layer: number, tags: WordTags, styleName?: string): string =>
      dialogueLine(layer, interval.start, interval.end, renderText(lines, index, tags), styleName);

    switch (mode) {
      case 'color':
        return [event(0, { prefix: '', open: `{\\1c${color}}`, close: RESET })];
      case 'outline':
        return [event(0, { prefix: '', open: `{\\3c${color}}`, close: RESET })];
      case 'box':
        if (style.backgroundBox) {
          return [event(0, PLAIN), event(1, pill, PILL_STYLE), event(2, PLAIN, TEXT_STYLE)];
        }
        return [event(0, pill), event(1, PLAIN)];
    }
  });
}
