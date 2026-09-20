import type { SubtitleCue, SubtitleHighlightMode, SubtitleStyle } from '../types';

import { dialogueLine, escapeAssText, eventPrefix, hexToAssColor, wrapWords } from './ass-format';
import { getWordIntervals } from './cues';

export type ActiveHighlightMode = Exclude<SubtitleHighlightMode, 'none'>;

/** `outline` has nothing to recolour when the base style draws a box instead of an outline. */
export function effectiveHighlightMode(style: SubtitleStyle): SubtitleHighlightMode {
  return style.highlightMode === 'outline' && style.backgroundBox ? 'none' : style.highlightMode;
}

/** Name of the extra ASS style the `box` highlight draws its pill with. */
export const PILL_STYLE = 'Pill';

/**
 * The pill is a BorderStyle 3 box in the highlight colour: same font metrics as the base style so
 * the pill event lines up with the text event exactly. Returned as `[name, style, boxAlpha]`.
 */
export function highlightStyleVariants(
  style: SubtitleStyle,
  mode: SubtitleHighlightMode,
): [name: string, style: SubtitleStyle, boxAlpha: number][] {
  if (mode !== 'box') {
    return [];
  }
  return [
    [
      PILL_STYLE,
      { ...style, backgroundBox: true, backgroundColor: style.highlightColor, shadow: 0 },
      0,
    ],
  ];
}

const INVISIBLE = '{\\alpha&HFF&}';

interface WordTags {
  /** Placed once at the very start of the event text. */
  prefix: string;
  open: string;
  close: string;
}

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
 * - `color` / `outline`: recolour the word's fill / outline. The closing tag restores the base
 *   colour explicitly rather than with `\r`, which would also drop the box padding override.
 * - `box`: a `Pill` event where every other word is fully transparent (still laid out) and the
 *   current one keeps its box — libass draws BorderStyle 3 boxes per style run, so this is a
 *   clean rectangle behind that word alone. Under an outlined base the pill goes on layer 0 and
 *   the text on layer 1; on a background-box base the pill (with the glyph) goes on top of the
 *   line box instead, hiding the darker box behind it.
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
  // Both layers of the box mode share the prefix so they land on the same spot.
  const prefix = eventPrefix(style);
  const plain: WordTags = { prefix, open: '', close: '' };
  // Per-event borders only grow the pill; the text layer's line pitch stays untouched.
  const pill: WordTags = {
    prefix: style.backgroundBox
      ? `{\\alpha&HFF&}${prefix}`
      : `{\\alpha&HFF&\\xbord${style.boxPaddingX}\\ybord${style.boxPaddingY}}${prefix}`,
    open: '{\\alpha&H00&}',
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
        return [
          event(0, {
            ...plain,
            open: `{\\1c${color}}`,
            close: `{\\1c${hexToAssColor(style.primaryColor)}&}`,
          }),
        ];
      case 'outline':
        return [
          event(0, {
            ...plain,
            open: `{\\3c${color}}`,
            close: `{\\3c${hexToAssColor(style.outlineColor)}&}`,
          }),
        ];
      case 'box':
        return style.backgroundBox
          ? [event(0, plain), event(1, pill, PILL_STYLE)]
          : [event(0, pill, PILL_STYLE), event(1, plain)];
    }
  });
}
