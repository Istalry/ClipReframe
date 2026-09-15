import { findActiveCue } from './cues';

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
