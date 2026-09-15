import type { SubtitleCue } from '../types';

import { findActiveCue, findActiveWordIndex, getCueWords, getWordIntervals } from './cues';

describe('findActiveCue', () => {
  const cues = [
    { id: 'a', start: 0, end: 2, text: 'a' },
    { id: 'b', start: 2, end: 4, text: 'b' },
  ];

  it('is inclusive at start and exclusive at end', () => {
    expect(findActiveCue(cues, 0)?.id).toBe('a');
    expect(findActiveCue(cues, 2)?.id).toBe('b');
    expect(findActiveCue(cues, 4)).toBeUndefined();
  });
});

const timed: SubtitleCue = {
  id: 'c',
  start: 10,
  end: 13,
  text: 'Salut tout le monde',
  words: [
    { start: 10.1, end: 10.4, text: 'Salut' },
    { start: 10.5, end: 10.8, text: 'tout' },
    { start: 10.8, end: 10.9, text: 'le' },
    { start: 11, end: 11.6, text: 'monde' },
  ],
};

describe('getCueWords', () => {
  it('adopts recognition timings when the words line up', () => {
    expect(getCueWords(timed)).toEqual(timed.words);
  });

  it('keeps timings after a typo fix that preserves the word count', () => {
    const words = getCueWords({ ...timed, text: 'Salut tous le monde' });
    expect(words.map((w) => w.text)).toEqual(['Salut', 'tous', 'le', 'monde']);
    expect(words[1]).toMatchObject({ start: 10.5, end: 10.8 });
  });

  it('attaches punctuation-only words to the previous word', () => {
    const words = getCueWords({ ...timed, text: 'Salut tout le monde ?' });
    expect(words).toHaveLength(5);
    expect(words[4]).toEqual({ start: 11, end: 11.6, text: '?' });
  });

  it('spreads the duration evenly when the word count changed or timings are missing', () => {
    expect(getCueWords({ ...timed, text: 'Salut le monde' })).toEqual([
      { start: 10, end: 11, text: 'Salut' },
      { start: 11, end: 12, text: 'le' },
      { start: 12, end: 13, text: 'monde' },
    ]);
    expect(getCueWords({ id: 'x', start: 0, end: 1, text: 'a b' })).toEqual([
      { start: 0, end: 0.5, text: 'a' },
      { start: 0.5, end: 1, text: 'b' },
    ]);
  });

  it('returns nothing for an empty cue', () => {
    expect(getCueWords({ id: 'x', start: 0, end: 1, text: '  ' })).toEqual([]);
  });
});

describe('getWordIntervals', () => {
  it('covers the cue contiguously from its start to its end', () => {
    expect(getWordIntervals(timed)).toEqual([
      { start: 10, end: 10.5, text: 'Salut' },
      { start: 10.5, end: 10.8, text: 'tout' },
      { start: 10.8, end: 11, text: 'le' },
      { start: 11, end: 13, text: 'monde' },
    ]);
  });

  it('clamps timings that leak outside the cue and keeps them monotonic', () => {
    const intervals = getWordIntervals({
      id: 'c',
      start: 5,
      end: 6,
      text: 'a b c',
      words: [
        { start: 4, end: 4.5, text: 'a' },
        { start: 5.8, end: 5.9, text: 'b' },
        { start: 5.2, end: 5.3, text: 'c' },
      ],
    });
    expect(intervals.map((i) => [i.start, i.end])).toEqual([
      [5, 5.8],
      [5.8, 5.8],
      [5.8, 6],
    ]);
  });
});

describe('findActiveWordIndex', () => {
  it('finds the interval containing the time, inclusive start / exclusive end', () => {
    expect(findActiveWordIndex(timed, 10)).toBe(0);
    expect(findActiveWordIndex(timed, 10.5)).toBe(1);
    expect(findActiveWordIndex(timed, 10.99)).toBe(2);
    expect(findActiveWordIndex(timed, 12.9)).toBe(3);
  });

  it('returns -1 outside the cue', () => {
    expect(findActiveWordIndex(timed, 9.9)).toBe(-1);
    expect(findActiveWordIndex(timed, 13)).toBe(-1);
    expect(findActiveWordIndex({ id: 'x', start: 0, end: 1, text: '' }, 0.5)).toBe(-1);
  });
});
