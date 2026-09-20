import type { Cut, Segment } from './segments';
import {
  activeSegment,
  activeSegmentIndex,
  addCut,
  cutsOf,
  exportSegments,
  removeCut,
  segmentRanges,
  segmentsFromCuts,
  segmentsOf,
  setSegmentLayout,
} from './segments';

const cuts: Cut[] = [
  { time: 20, layout: 'split' },
  { time: 10, layout: 'fill' },
];

describe('segmentsOf / cutsOf', () => {
  it('starts at zero with the base layout and sorts the cuts', () => {
    expect(segmentsOf('split', cuts)).toEqual([
      { start: 0, layout: 'split' },
      { start: 10, layout: 'fill' },
      { start: 20, layout: 'split' },
    ]);
  });

  it('is a single segment without cuts', () => {
    expect(segmentsOf('fill', [])).toEqual([{ start: 0, layout: 'fill' }]);
  });

  it('round-trips', () => {
    const { layout, cuts: back } = cutsOf(segmentsOf('split', cuts));
    expect(layout).toBe('split');
    expect(segmentsOf(layout, back)).toEqual(segmentsOf('split', cuts));
  });
});

describe('segmentsFromCuts', () => {
  it('drops cuts too close to the start, to each other or to the end', () => {
    expect(segmentsFromCuts([0.2, 5, 5.3, 12, 29.8], 'split', 30)).toEqual([
      { start: 0, layout: 'split' },
      { start: 5, layout: 'split' },
      { start: 12, layout: 'split' },
    ]);
  });

  it('sorts its input and honours a custom gap', () => {
    expect(segmentsFromCuts([9, 3], 'fill', 30, 2).map((s) => s.start)).toEqual([0, 3, 9]);
  });
});

describe('activeSegment', () => {
  const segments = segmentsOf('split', cuts);

  it('picks the last segment starting at or before the time', () => {
    expect(activeSegmentIndex(segments, 0)).toBe(0);
    expect(activeSegmentIndex(segments, 9.999)).toBe(0);
    expect(activeSegmentIndex(segments, 10)).toBe(1);
    expect(activeSegmentIndex(segments, 999)).toBe(2);
    expect(activeSegment(segments, -5).layout).toBe('split');
    expect(activeSegment(segments, 15).layout).toBe('fill');
  });

  it('falls back to a single split segment when there is nothing', () => {
    expect(activeSegment([], 3)).toEqual({ start: 0, layout: 'split' });
  });
});

describe('addCut / removeCut / setSegmentLayout', () => {
  const segments = segmentsOf('split', cuts);

  it('splits the segment under the playhead, inheriting its layout', () => {
    expect(addCut(segments, 15, 30)).toEqual([
      { start: 0, layout: 'split' },
      { start: 10, layout: 'fill' },
      { start: 15, layout: 'fill' },
      { start: 20, layout: 'split' },
    ]);
  });

  it('does nothing near an existing boundary or the clip end', () => {
    expect(addCut(segments, 10.2, 30)).toEqual(segments);
    expect(addCut(segments, 9.8, 30)).toEqual(segments);
    expect(addCut(segments, 29.7, 30)).toEqual(segments);
  });

  it('merges a segment into the previous one, keeping that layout', () => {
    expect(removeCut(segments, 1)).toEqual([
      { start: 0, layout: 'split' },
      { start: 20, layout: 'split' },
    ]);
    expect(removeCut(segments, 0)).toEqual(segments);
    expect(removeCut(segments, 9)).toEqual(segments);
  });

  it('changes one segment only', () => {
    expect(setSegmentLayout(segments, 2, 'fill').map((s) => s.layout)).toEqual([
      'split',
      'fill',
      'fill',
    ]);
  });
});

describe('segmentRanges', () => {
  it('ends the last segment at the clip duration', () => {
    expect(segmentRanges(segmentsOf('split', cuts), 30).map((r) => [r.start, r.end])).toEqual([
      [0, 10],
      [10, 20],
      [20, 30],
    ]);
  });
});

describe('exportSegments', () => {
  const segments: Segment[] = segmentsOf('split', cuts);

  it('shifts to the output timeline and drops what the trim cuts away', () => {
    expect(exportSegments(segments, { start: 15, end: 25 }, 30)).toEqual([
      { start: 0, layout: 'fill' },
      { start: 5, layout: 'split' },
    ]);
  });

  it('keeps every segment without a trim', () => {
    expect(exportSegments(segments, null, 30)).toEqual(segments);
  });

  it('collapses to one segment when the trim sits inside a single segment', () => {
    expect(exportSegments(segments, { start: 11, end: 19 }, 30)).toEqual([
      { start: 0, layout: 'fill' },
    ]);
  });

  it('ignores a cut landing exactly on the trim end', () => {
    expect(exportSegments(segments, { start: 0, end: 10 }, 30)).toEqual([
      { start: 0, layout: 'split' },
    ]);
  });
});
