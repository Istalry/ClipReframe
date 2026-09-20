import type { LayoutMode, TrimRange } from '../types';

/** Start of a segment other than the first, with the layout that segment is rendered in. */
export interface Cut {
  time: number;
  layout: LayoutMode;
}

/** A contiguous part of the clip rendered with one layout. The first one always starts at 0. */
export interface Segment {
  start: number;
  layout: LayoutMode;
}

/** Cuts closer than this to each other (or to the clip bounds) are dropped as duplicates. */
export const MIN_CUT_GAP = 0.5;

/** The clip's segments: the base layout until the first cut, then one per cut. */
export function segmentsOf(layout: LayoutMode, cuts: readonly Cut[]): Segment[] {
  const sorted = [...cuts].sort((a, b) => a.time - b.time);
  return [{ start: 0, layout }, ...sorted.map((c) => ({ start: c.time, layout: c.layout }))];
}

/** Inverse of `segmentsOf`: the base layout plus the cuts to store on the clip. */
export function cutsOf(segments: readonly Segment[]): { layout: LayoutMode; cuts: Cut[] } {
  return {
    layout: segments[0]?.layout ?? 'split',
    cuts: segments.slice(1).map((s) => ({ time: s.start, layout: s.layout })),
  };
}

/** Detected times → segments, dropping cuts too close to 0, to each other or to the end. */
export function segmentsFromCuts(
  times: readonly number[],
  layout: LayoutMode,
  duration: number,
  minGap = MIN_CUT_GAP,
): Segment[] {
  const segments: Segment[] = [{ start: 0, layout }];
  for (const time of [...times].sort((a, b) => a - b)) {
    const previous = segments[segments.length - 1]?.start ?? 0;
    if (time - previous >= minGap && duration - time >= minGap) {
      segments.push({ start: time, layout });
    }
  }
  return segments;
}

/** Index of the segment covering `time` (the first one before the clip starts). */
export function activeSegmentIndex(segments: readonly Segment[], time: number): number {
  let index = 0;
  for (let i = 1; i < segments.length; i += 1) {
    if ((segments[i]?.start ?? 0) <= time) {
      index = i;
    }
  }
  return index;
}

export function activeSegment(segments: readonly Segment[], time: number): Segment {
  return segments[activeSegmentIndex(segments, time)] ?? { start: 0, layout: 'split' };
}

/** Split the segment under `time` in two; the new one inherits its layout. */
export function addCut(
  segments: readonly Segment[],
  time: number,
  duration: number,
  minGap = MIN_CUT_GAP,
): Segment[] {
  const current = activeSegment(segments, time);
  const next = segments.find((s) => s.start > time);
  const tooClose =
    time - current.start < minGap || (next ? next.start - time < minGap : duration - time < minGap);
  if (tooClose) {
    return [...segments];
  }
  return [...segments, { start: time, layout: current.layout }].sort((a, b) => a.start - b.start);
}

/** Remove the cut starting segment `index`, merging it into the previous segment. */
export function removeCut(segments: readonly Segment[], index: number): Segment[] {
  if (index < 1 || index >= segments.length) {
    return [...segments];
  }
  return segments.filter((_, i) => i !== index);
}

export function setSegmentLayout(
  segments: readonly Segment[],
  index: number,
  layout: LayoutMode,
): Segment[] {
  return segments.map((s, i) => (i === index ? { ...s, layout } : s));
}

/** Segments with their end time, for display. */
export function segmentRanges(
  segments: readonly Segment[],
  duration: number,
): { start: number; end: number; layout: LayoutMode }[] {
  return segments.map((s, i) => ({
    start: s.start,
    end: segments[i + 1]?.start ?? duration,
    layout: s.layout,
  }));
}

/** Segments clipped to the exported range and shifted to the output timeline (trim starts at 0). */
export function exportSegments(
  segments: readonly Segment[],
  trim: TrimRange | null,
  duration: number,
): Segment[] {
  const from = trim?.start ?? 0;
  const to = trim?.end ?? duration;
  const kept = segmentRanges(segments, duration)
    .map((r) => ({ ...r, start: Math.max(r.start, from), end: Math.min(r.end, to) }))
    // A cut exactly on the trim bound, or outside it, adds nothing to the output.
    .filter((r) => r.end - r.start > 0.001);
  return kept.map((r) => ({ start: r.start - from, layout: r.layout }));
}
