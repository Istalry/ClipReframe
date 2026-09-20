import { useMemo } from 'react';

/** Size used for the probe; the ratio is independent of it. */
const PROBE_SIZE = 100;

/**
 * libass (like VSFilter) sizes a font so that ascent + descent equals the requested size,
 * whereas a CSS font-size is the em square, so the same number renders ~10 % larger glyphs in
 * the preview. Measures this face's ascent + descent and returns the factor to apply to a CSS
 * font-size for the two to line up. Falls back to 1 when canvas metrics are unavailable.
 */
export function measureLibassFontScale(fontFamily: string, bold: boolean, italic: boolean): number {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) {
      return 1;
    }
    ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${PROBE_SIZE}px "${fontFamily}", sans-serif`;
    const metrics = ctx.measureText('Hg');
    const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    return Number.isFinite(height) && height > 0 ? PROBE_SIZE / height : 1;
  } catch {
    return 1;
  }
}

export function useLibassFontScale(fontFamily: string, bold: boolean, italic: boolean): number {
  return useMemo(
    () => measureLibassFontScale(fontFamily, bold, italic),
    [fontFamily, bold, italic],
  );
}
