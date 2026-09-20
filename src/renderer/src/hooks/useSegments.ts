import { useMemo } from 'react';

import { activeSegmentIndex, segmentsOf, type Segment } from '@shared/cuts/segments';

import { usePlayerStore } from '../store/player';
import { useProjectStore } from '../store/project';

/** The clip's segments, memoised: a selector returning them would build a new array every render. */
export function useSegments(): Segment[] {
  const layout = useProjectStore((s) => s.settings.layout);
  const cuts = useProjectStore((s) => s.cuts);
  return useMemo(() => segmentsOf(layout, cuts), [layout, cuts]);
}

/** Index of the segment under the playhead, and the segments themselves. */
export function useActiveSegment(): { segments: Segment[]; index: number; segment: Segment } {
  const segments = useSegments();
  const currentTime = usePlayerStore((s) => s.currentTime);
  const index = activeSegmentIndex(segments, currentTime);
  return { segments, index, segment: segments[index] ?? { start: 0, layout: 'split' } };
}
