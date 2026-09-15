import type { SubtitleCue } from '../types';

import { applyTrimToCues, clampTrim, isWholeClip, trimmedDuration } from './trim';

describe('clampTrim', () => {
  it('keeps the range inside the clip and at least half a second long', () => {
    expect(clampTrim({ start: -1, end: 50 }, 42)).toEqual({ start: 0, end: 42 });
    expect(clampTrim({ start: 10, end: 10.1 }, 42)).toEqual({ start: 9.6, end: 10.1 });
    expect(clampTrim({ start: 41.9, end: 42 }, 42)).toEqual({ start: 41.5, end: 42 });
    expect(clampTrim({ start: 0, end: 0.1 }, 42)).toEqual({ start: 0, end: 0.5 });
  });
});

describe('isWholeClip / trimmedDuration', () => {
  it('treats null and a full-range trim alike', () => {
    expect(isWholeClip(null, 42)).toBe(true);
    expect(isWholeClip({ start: 0, end: 42 }, 42)).toBe(true);
    expect(isWholeClip({ start: 1, end: 42 }, 42)).toBe(false);
    expect(trimmedDuration(42, null)).toBe(42);
    expect(trimmedDuration(42, { start: 10, end: 15.5 })).toBe(5.5);
  });
});

describe('applyTrimToCues', () => {
  const cues: SubtitleCue[] = [
    { id: 'a', start: 0, end: 2, text: 'before' },
    {
      id: 'b',
      start: 9,
      end: 12,
      text: 'crossing in',
      words: [
        { start: 9, end: 10, text: 'crossing' },
        { start: 11, end: 12, text: 'in' },
      ],
    },
    { id: 'c', start: 13, end: 14, text: 'inside' },
    { id: 'd', start: 19, end: 22, text: 'crossing out' },
    { id: 'e', start: 30, end: 31, text: 'after' },
  ];

  it('drops outside cues, cuts crossing ones and shifts everything to the trim start', () => {
    expect(applyTrimToCues(cues, { start: 10, end: 20 })).toEqual([
      {
        id: 'b',
        start: 0,
        end: 2,
        text: 'crossing in',
        words: [
          { start: -1, end: 0, text: 'crossing' },
          { start: 1, end: 2, text: 'in' },
        ],
      },
      { id: 'c', start: 3, end: 4, text: 'inside' },
      { id: 'd', start: 9, end: 10, text: 'crossing out' },
    ]);
  });

  it('returns a copy when there is no trim', () => {
    const out = applyTrimToCues(cues, null);
    expect(out).toEqual(cues);
    expect(out).not.toBe(cues);
  });
});
