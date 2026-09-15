import {
  OUTPUT_ASPECT,
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
  RECT_MIN_SIZE,
  SPLIT_RATIO_MAX,
  SPLIT_RATIO_MIN,
} from '../constants';
import type { LayoutMode, PixelRect, Rect } from '../types';

export type RegionKind = 'webcam' | 'gameplay';

/** A horizontal band of the 1080×1920 output canvas. */
export interface OutputRegion {
  kind: RegionKind;
  y: number;
  height: number;
}

/** Aspect ratio of the source frame (width / height). */
export interface FrameSize {
  width: number;
  height: number;
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const clampSplitRatio = (ratio: number): number =>
  Math.min(SPLIT_RATIO_MAX, Math.max(SPLIT_RATIO_MIN, ratio));

const even = (n: number): number => 2 * Math.round(n / 2);
const evenFloor = (n: number): number => 2 * Math.floor(n / 2);

/** Output bands, top to bottom. Heights are even so the crops stay yuv420p-friendly. */
export function getOutputRegions(layout: LayoutMode, splitRatio: number): OutputRegion[] {
  if (layout === 'fill') {
    return [{ kind: 'gameplay', y: 0, height: OUTPUT_HEIGHT }];
  }
  const topHeight = even(OUTPUT_HEIGHT * clampSplitRatio(splitRatio));
  return [
    { kind: 'webcam', y: 0, height: topHeight },
    { kind: 'gameplay', y: topHeight, height: OUTPUT_HEIGHT - topHeight },
  ];
}

export function getOutputRegion(
  layout: LayoutMode,
  splitRatio: number,
  kind: RegionKind,
): OutputRegion | undefined {
  return getOutputRegions(layout, splitRatio).find((r) => r.kind === kind);
}

/** Pixel aspect (w/h) that a source crop must have to fill the given output region without distortion. */
export function getRegionAspect(layout: LayoutMode, splitRatio: number, kind: RegionKind): number {
  const region = getOutputRegion(layout, splitRatio, kind);
  if (!region) {
    return OUTPUT_ASPECT;
  }
  return OUTPUT_WIDTH / region.height;
}

/**
 * Rects are stored normalised to the source frame, so a pixel aspect of `a` corresponds to a
 * normalised width/height ratio of `a * frameH / frameW`.
 */
export const toNormalizedAspect = (pixelAspect: number, frame: FrameSize): number =>
  (pixelAspect * frame.height) / frame.width;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Keep the rect inside the frame by translating it (size preserved when it fits). */
export function clampRect(rect: Rect): Rect {
  const width = Math.min(1, Math.max(RECT_MIN_SIZE, rect.width));
  const height = Math.min(1, Math.max(RECT_MIN_SIZE, rect.height));
  return {
    x: clamp01(Math.min(rect.x, 1 - width)),
    y: clamp01(Math.min(rect.y, 1 - height)),
    width,
    height,
  };
}

/**
 * Re-fit a rect to a new normalised aspect around its centre, shrinking as needed so it stays in
 * frame. Used when the split ratio or layout changes.
 */
export function fitRectToAspect(rect: Rect, normalizedAspect: number): Rect {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  // Preserve area-ish: keep the width, derive height; then shrink uniformly if out of bounds.
  let width = rect.width;
  let height = width / normalizedAspect;
  if (height > 1) {
    height = 1;
    width = height * normalizedAspect;
  }
  if (width > 1) {
    width = 1;
    height = width / normalizedAspect;
  }
  if (width < RECT_MIN_SIZE || height < RECT_MIN_SIZE) {
    const scale = Math.max(RECT_MIN_SIZE / width, RECT_MIN_SIZE / height);
    width *= scale;
    height *= scale;
  }
  return clampRect({ x: cx - width / 2, y: cy - height / 2, width, height });
}

export function moveRect(rect: Rect, dx: number, dy: number): Rect {
  return clampRect({ ...rect, x: rect.x + dx, y: rect.y + dy });
}

/**
 * Resize from a handle while keeping the normalised aspect. The opposite edge/corner stays
 * anchored. Edge handles scale uniformly around the perpendicular centre line.
 */
export function resizeRect(
  rect: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  normalizedAspect: number,
): Rect {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  // Decide the driving dimension from the handle, derive the other from the aspect.
  let width = rect.width;
  switch (handle) {
    case 'e':
    case 'ne':
    case 'se':
      width = rect.width + dx;
      break;
    case 'w':
    case 'nw':
    case 'sw':
      width = rect.width - dx;
      break;
    case 'n':
      width = (rect.height - dy) * normalizedAspect;
      break;
    case 's':
      width = (rect.height + dy) * normalizedAspect;
      break;
  }

  // Enforce bounds on the driving dimension before deriving the other one.
  const maxWidthByFrame = Math.min(1, normalizedAspect);
  width = Math.min(maxWidthByFrame, Math.max(RECT_MIN_SIZE, width));
  let height = width / normalizedAspect;
  if (height < RECT_MIN_SIZE) {
    height = RECT_MIN_SIZE;
    width = height * normalizedAspect;
  }

  const anchoredLeft = handle === 'e' || handle === 'ne' || handle === 'se';
  const anchoredRight = handle === 'w' || handle === 'nw' || handle === 'sw';
  const anchoredTop = handle === 's' || handle === 'se' || handle === 'sw';
  const anchoredBottom = handle === 'n' || handle === 'ne' || handle === 'nw';

  let x: number;
  if (anchoredLeft) {
    x = rect.x;
  } else if (anchoredRight) {
    x = right - width;
  } else {
    x = rect.x + (rect.width - width) / 2;
  }

  let y: number;
  if (anchoredTop) {
    y = rect.y;
  } else if (anchoredBottom) {
    y = bottom - height;
  } else {
    y = rect.y + (rect.height - height) / 2;
  }

  // If the anchored growth pushes past the frame, cap the size instead of sliding the rect.
  const overflowX = Math.max(0, -x, x + width - 1);
  const overflowY = Math.max(0, -y, y + height - 1);
  if (overflowX > 0 || overflowY > 0) {
    const scale = Math.min(
      overflowX > 0 ? (width - overflowX) / width : 1,
      overflowY > 0 ? (height - overflowY) / height : 1,
    );
    width *= scale;
    height *= scale;
    x = anchoredLeft ? rect.x : anchoredRight ? right - width : rect.x + (rect.width - width) / 2;
    y = anchoredTop
      ? rect.y
      : anchoredBottom
        ? bottom - height
        : rect.y + (rect.height - height) / 2;
  }

  return clampRect({ x, y, width, height });
}

/** Convert to source pixels with even values (required by yuv420p crops). */
export function toPixelRect(rect: Rect, frame: FrameSize): PixelRect {
  const frameW = evenFloor(frame.width);
  const frameH = evenFloor(frame.height);
  const width = Math.min(frameW, Math.max(2, even(rect.width * frame.width)));
  const height = Math.min(frameH, Math.max(2, even(rect.height * frame.height)));
  const x = Math.min(even(rect.x * frame.width), frameW - width);
  const y = Math.min(even(rect.y * frame.height), frameH - height);
  return { x: Math.max(0, x), y: Math.max(0, y), width, height };
}

/** Sensible starting rects for a typical stream layout (webcam bottom-left, gameplay centred). */
export function defaultRects(
  layout: LayoutMode,
  splitRatio: number,
  frame: FrameSize,
): { webcamRect: Rect; gameplayRect: Rect } {
  const webcamAspect = toNormalizedAspect(getRegionAspect('split', splitRatio, 'webcam'), frame);
  const webcamRect = fitRectToAspect({ x: 0.02, y: 0.6, width: 0.3, height: 0.3 }, webcamAspect);

  const gameplayAspect = toNormalizedAspect(getRegionAspect(layout, splitRatio, 'gameplay'), frame);
  const gameplayRect = fitRectToAspect({ x: 0.25, y: 0, width: 0.5, height: 1 }, gameplayAspect);

  return { webcamRect, gameplayRect };
}
