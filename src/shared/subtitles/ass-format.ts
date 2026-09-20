import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from '../constants';
import type { SubtitleStyle } from '../types';

import { splitWords } from './text';

/**
 * Padding of the boxes (background box around each line, pill behind the current word) in
 * output pixels. `y` goes in the style's Outline field; `x` needs a per-event `\\xbord` override.
 */
export const boxPadding = (style: SubtitleStyle): { x: number; y: number } => ({
  x: style.boxPaddingX,
  y: style.boxPaddingY,
});

/** Alpha of the background box (ASS alpha, 00 = opaque): ~80 % opaque like the preview's `cc`. */
export const BOX_ALPHA = 0x33;

/**
 * Distance from the aligned edge once the vertical offset is folded in (positive offset = down).
 * Clamped at 0: ASS margins cannot be negative. Meaningless for the centre alignment.
 */
export function effectiveMarginV(style: SubtitleStyle): number {
  if (style.alignment === 'center') {
    return style.marginV;
  }
  const shift = style.alignment === 'top' ? style.offsetY : -style.offsetY;
  return Math.max(0, style.marginV + shift);
}

/**
 * Override tags every event starts with: the horizontal box padding, and for a shifted centred
 * style an explicit anchor, since margins do not move alignment 5 (`\\pos` with the same anchor
 * lands exactly where plain centring does).
 */
export function eventPrefix(style: SubtitleStyle): string {
  const tags: string[] = [];
  if (style.backgroundBox) {
    tags.push(`\\xbord${style.boxPaddingX}`);
  }
  if (style.alignment === 'center' && style.offsetY !== 0) {
    tags.push(`\\pos(${OUTPUT_WIDTH / 2},${OUTPUT_HEIGHT / 2 + style.offsetY})`);
  }
  return tags.length > 0 ? `{${tags.join('')}}` : '';
}

/** `#rrggbb` → ASS `&HAABBGGRR` (alpha 00 = opaque). */
export function hexToAssColor(hex: string, alpha = 0): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) {
    throw new Error(`Invalid colour: ${hex}`);
  }
  const [, r, g, b] = m;
  const a = alpha.toString(16).padStart(2, '0');
  return `&H${a}${b}${g}${r}`.toUpperCase();
}

/** Seconds → `H:MM:SS.cc` (centiseconds, as ASS requires). */
export function formatAssTime(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const cs = Math.floor((total - Math.floor(total)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** Greedy wrap of pre-split words into lines no longer than `maxChars` when possible. */
export function wrapWords(words: readonly string[], maxChars: number): string[][] {
  const lines: string[][] = [];
  let current: string[] = [];
  let length = 0;
  for (const word of words) {
    const candidate = current.length === 0 ? word.length : length + 1 + word.length;
    if (candidate > maxChars && current.length > 0) {
      lines.push(current);
      current = [word];
      length = word.length;
    } else {
      current.push(word);
      length = candidate;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines;
}

/** Greedy word-wrap producing `\N`-separated lines no longer than `maxChars` when possible. */
export function wrapCueText(text: string, maxChars: number): string {
  return wrapWords(splitWords(text), maxChars)
    .map((line) => line.join(' '))
    .join('\\N');
}

export const escapeAssText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\r?\n/g, '\\N');

export const dialogueLine = (
  layer: number,
  start: number,
  end: number,
  text: string,
  styleName = 'Default',
): string =>
  `Dialogue: ${layer},${formatAssTime(start)},${formatAssTime(end)},${styleName},,0,0,0,,${text}`;
