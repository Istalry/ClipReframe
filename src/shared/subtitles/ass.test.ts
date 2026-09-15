import { DEFAULT_SUBTITLE_STYLE } from '../presets/schema';
import type { SubtitleCue, SubtitleStyle } from '../types';

import {
  buildAss,
  buildAssStyleLine,
  formatAssTime,
  hexToAssColor,
  wrapCueText,
  wrapWords,
} from './ass';

/** The 0.1.0 look: no per-word events. */
const PLAIN: SubtitleStyle = { ...DEFAULT_SUBTITLE_STYLE, highlightMode: 'none' };

const dialogues = (ass: string): string[] =>
  ass.split('\n').filter((l) => l.startsWith('Dialogue:'));

describe('hexToAssColor', () => {
  it('reverses byte order to BGR and prepends alpha', () => {
    expect(hexToAssColor('#ff8000')).toBe('&H000080FF');
    expect(hexToAssColor('#ffffff', 0x80)).toBe('&H80FFFFFF');
  });

  it('rejects invalid input', () => {
    expect(() => hexToAssColor('red')).toThrow();
  });
});

describe('formatAssTime', () => {
  it('formats with centiseconds', () => {
    expect(formatAssTime(0)).toBe('0:00:00.00');
    expect(formatAssTime(61.239)).toBe('0:01:01.23');
    expect(formatAssTime(3725.5)).toBe('1:02:05.50');
  });

  it('clamps negatives to zero', () => {
    expect(formatAssTime(-3)).toBe('0:00:00.00');
  });
});

describe('wrapCueText', () => {
  it('wraps on word boundaries', () => {
    expect(wrapCueText('the quick brown fox jumps', 10)).toBe('the quick\\Nbrown fox\\Njumps');
  });

  it('keeps a single overlong word on its own line', () => {
    expect(wrapCueText('supercalifragilistic word', 5)).toBe('supercalifragilistic\\Nword');
  });

  it('collapses whitespace', () => {
    expect(wrapCueText('  a   b  ', 40)).toBe('a b');
  });
});

describe('buildAssStyleLine', () => {
  it('uses BorderStyle 3 for a background box', () => {
    const line = buildAssStyleLine({ ...DEFAULT_SUBTITLE_STYLE, backgroundBox: true });
    const fields = line.replace('Style: ', '').split(',');
    expect(fields[15]).toBe('3');
  });

  it('encodes bold/italic as -1/0', () => {
    const line = buildAssStyleLine({ ...DEFAULT_SUBTITLE_STYLE, bold: true, italic: false });
    const fields = line.replace('Style: ', '').split(',');
    expect(fields[7]).toBe('-1');
    expect(fields[8]).toBe('0');
  });
});

describe('buildAss', () => {
  it('produces a valid document with sorted events', () => {
    const ass = buildAss(
      [
        { id: 'b', start: 5, end: 7, text: 'second' },
        { id: 'a', start: 1, end: 2.5, text: 'first' },
      ],
      PLAIN,
    );
    expect(ass).toContain('PlayResX: 1080');
    expect(ass).toContain('PlayResY: 1920');
    expect(dialogues(ass)).toHaveLength(2);
    expect(dialogues(ass)[0]).toBe('Dialogue: 0,0:00:01.00,0:00:02.50,Default,,0,0,0,,first');
  });

  it('drops empty and inverted cues, escapes braces, applies uppercase', () => {
    const ass = buildAss(
      [
        { id: '1', start: 1, end: 2, text: '{hi} there' },
        { id: '2', start: 3, end: 2, text: 'bad timing' },
        { id: '3', start: 4, end: 5, text: '   ' },
      ],
      { ...PLAIN, uppercase: true },
    );
    expect(dialogues(ass)).toHaveLength(1);
    expect(dialogues(ass)[0]).toContain('\\{HI\\} THERE');
  });
});

describe('wrapWords', () => {
  it('keeps words intact and respects the limit', () => {
    expect(wrapWords(['the', 'quick', 'brown', 'fox'], 10)).toEqual([
      ['the', 'quick'],
      ['brown', 'fox'],
    ]);
    expect(wrapWords([], 10)).toEqual([]);
  });
});

describe('buildAss with a word highlight', () => {
  const cue: SubtitleCue = {
    id: 'c',
    start: 1,
    end: 4,
    text: 'un deux trois',
    words: [
      { start: 1, end: 1.5, text: 'un' },
      { start: 2, end: 2.5, text: 'deux' },
      { start: 3, end: 3.5, text: 'trois' },
    ],
  };

  it('emits one event per word interval covering the whole cue (colour mode)', () => {
    const lines = dialogues(
      buildAss([cue], { ...PLAIN, highlightMode: 'color', highlightColor: '#a970ff' }),
    );
    expect(lines).toEqual([
      'Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\1c&H00FF70A9&}un{\\r} deux trois',
      'Dialogue: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,un {\\1c&H00FF70A9&}deux{\\r} trois',
      'Dialogue: 0,0:00:03.00,0:00:04.00,Default,,0,0,0,,un deux {\\1c&H00FF70A9&}trois{\\r}',
    ]);
  });

  it('recolours the outline in outline mode', () => {
    const lines = dialogues(buildAss([cue], { ...PLAIN, highlightMode: 'outline' }));
    expect(lines[1]).toContain('un {\\3c&H00FF70A9&}deux{\\r} trois');
  });

  it('draws a transparent pill layer under the text in box mode', () => {
    const lines = dialogues(buildAss([cue], { ...PLAIN, highlightMode: 'box', fontSize: 64 }));
    expect(lines).toHaveLength(6);
    expect(lines[2]).toBe(
      'Dialogue: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,{\\alpha&HFF&}un {\\alpha&H00&\\1c&H00FF70A9&\\3c&H00FF70A9&\\bord14\\shad0}deux{\\alpha&HFF&} trois',
    );
    expect(lines[3]).toBe('Dialogue: 1,0:00:02.00,0:00:03.00,Default,,0,0,0,,un deux trois');
  });

  it('layers box, pill and bare text with derived styles on a box base', () => {
    const ass = buildAss([cue], { ...PLAIN, highlightMode: 'box', backgroundBox: true });
    const styles = ass.split('\n').filter((l) => l.startsWith('Style:'));
    expect(styles.map((l) => l.split(',')[0])).toEqual([
      'Style: Default',
      'Style: Pill',
      'Style: Text',
    ]);
    // Pill: outline-based (BorderStyle 1); Text: no outline at all.
    expect(styles[1]?.split(',')[15]).toBe('1');
    expect(styles[2]?.split(',').slice(15, 18)).toEqual(['1', '0', '0']);

    const lines = dialogues(ass);
    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,un deux trois');
    expect(lines[1]).toContain(
      'Dialogue: 1,0:00:01.00,0:00:02.00,Pill,,0,0,0,,{\\alpha&HFF&}{\\alpha&H00&',
    );
    expect(lines[2]).toBe('Dialogue: 2,0:00:01.00,0:00:02.00,Text,,0,0,0,,un deux trois');
  });

  it('emits no extra styles for the other modes', () => {
    const ass = buildAss([cue], { ...PLAIN, highlightMode: 'box' });
    expect(ass.split('\n').filter((l) => l.startsWith('Style:'))).toHaveLength(1);
  });

  it('falls back to plain events for outline mode on a box style', () => {
    const lines = dialogues(
      buildAss([cue], { ...PLAIN, highlightMode: 'outline', backgroundBox: true }),
    );
    expect(lines).toEqual(['Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,un deux trois']);
  });

  it('wraps, uppercases and escapes per word', () => {
    const lines = dialogues(
      buildAss([{ id: 'x', start: 0, end: 2, text: 'aa {bb} cc' }], {
        ...PLAIN,
        highlightMode: 'color',
        uppercase: true,
        maxLineChars: 10,
      }),
    );
    expect(lines[1]).toContain(',AA {\\1c&H00FF70A9&}\\{BB\\}{\\r}\\NCC');
  });
});
