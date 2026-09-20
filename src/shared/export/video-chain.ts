import { OUTPUT_WIDTH } from '../constants';
import type { Segment } from '../cuts/segments';
import { exportSegments } from '../cuts/segments';
import {
  getOutputRegions,
  toPixelRect,
  type FrameSize,
  type OutputRegion,
} from '../geometry/layout';
import type { PixelRect, ProjectSettings, TrimRange } from '../types';

import { fmt } from './format';

const cropScale = (crop: PixelRect, region: OutputRegion): string =>
  `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=${OUTPUT_WIDTH}:${region.height}:flags=lanczos,setsar=1`;

/** `trim=…,setpts=…` for a segment of the (already trimmed) input; empty for a whole clip. */
function segmentPrefix(segment: Segment, next: Segment | undefined): string {
  if (segment.start === 0 && !next) {
    return '';
  }
  const end = next ? `:end=${fmt(next.start)}` : '';
  return `trim=start=${fmt(segment.start)}${end},setpts=PTS-STARTPTS,`;
}

/**
 * Chains rendering one segment into `[label]`: the split layout stacks the webcam over the
 * gameplay crop, fill scales a single 9:16 crop. Every segment reads `[0:v]` again — ffmpeg
 * decodes once and feeds each reference.
 */
function segmentChains(
  segment: Segment,
  next: Segment | undefined,
  settings: ProjectSettings,
  frame: FrameSize,
  label: string,
  suffix: string,
): string[] {
  const regions = getOutputRegions(segment.layout, settings.splitRatio);
  const prefix = `[0:v]${segmentPrefix(segment, next)}`;

  if (segment.layout === 'split') {
    const [top, bottom] = regions;
    if (!top || !bottom) {
      throw new Error('Split layout requires two regions');
    }
    return [
      `${prefix}${cropScale(toPixelRect(settings.webcamRect, frame), top)}[top${suffix}]`,
      `${prefix}${cropScale(toPixelRect(settings.gameplayRect, frame), bottom)}[bot${suffix}]`,
      `[top${suffix}][bot${suffix}]vstack=inputs=2[${label}]`,
    ];
  }
  const [full] = regions;
  if (!full) {
    throw new Error('Fill layout requires a region');
  }
  return [`${prefix}${cropScale(toPixelRect(settings.fillRect, frame), full)}[${label}]`];
}

/**
 * Video chains for the clip itself, ending in `[stacked]`. With cuts, each segment is rendered
 * with its own layout and the pieces are concatenated; a single segment produces exactly the
 * chains of a clip without cuts.
 */
export function buildSegmentChains(
  settings: ProjectSettings,
  frame: FrameSize,
  segments: readonly Segment[],
  trim: TrimRange | null,
  duration: number,
): string[] {
  const exported = exportSegments(
    segments.length > 0 ? segments : [{ start: 0, layout: settings.layout }],
    trim,
    duration,
  );
  if (exported.length <= 1) {
    const only = exported[0] ?? { start: 0, layout: settings.layout };
    return segmentChains({ ...only, start: 0 }, undefined, settings, frame, 'stacked', '');
  }
  const chains = exported.flatMap((segment, i) =>
    segmentChains(segment, exported[i + 1], settings, frame, `v${i}`, String(i)),
  );
  const inputs = exported.map((_, i) => `[v${i}]`).join('');
  chains.push(`${inputs}concat=n=${exported.length}:v=1:a=0[stacked]`);
  return chains;
}
