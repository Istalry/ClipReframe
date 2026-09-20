import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from '../constants';
import type { FrameSize } from '../geometry/layout';
import type { PixelRect, TrimRange } from '../types';

import { trimmedDuration } from './trim';

/** Where an overlay outro starts inside the exported clip; it always ends with the clip. */
export const overlayStart = (clipDuration: number, outroDuration: number): number =>
  Math.max(0, clipDuration - outroDuration);

/** The same window in source time, for the preview and the scrubber. */
export function overlayWindow(
  sourceDuration: number,
  outroDuration: number,
  trim: TrimRange | null,
): { start: number; end: number } {
  const end = trim?.end ?? sourceDuration;
  const from = trim?.start ?? 0;
  return { start: from + overlayStart(trimmedDuration(sourceDuration, trim), outroDuration), end };
}

/** Fit `inner` inside `outer` keeping its aspect and centring it, like `decrease` + `pad`. */
export function containRect(
  inner: FrameSize,
  outer: FrameSize = {
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
  },
): PixelRect {
  if (inner.width <= 0 || inner.height <= 0) {
    return { x: 0, y: 0, width: outer.width, height: outer.height };
  }
  const scale = Math.min(outer.width / inner.width, outer.height / inner.height);
  const width = Math.round(inner.width * scale);
  const height = Math.round(inner.height * scale);
  return {
    x: Math.round((outer.width - width) / 2),
    y: Math.round((outer.height - height) / 2),
    width,
    height,
  };
}
