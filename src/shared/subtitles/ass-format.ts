import { splitWords } from './text';

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
