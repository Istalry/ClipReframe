/** Lower-case, strip accents and keep only letters/digits, so "Ça va ?" and "ca va" compare equal. */
export const normalizeForCompare = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Whitespace-separated words of a cue; the unit both the wrapper and the highlight work on. */
export const splitWords = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean);

/** False for punctuation-only fragments such as `?` or `…`. */
export const hasContent = (text: string): boolean => normalizeForCompare(text).length > 0;
