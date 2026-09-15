import { DEFAULT_SUBTITLE_STYLE } from '../presets/schema';

import { buildAss, buildAssStyleLine, formatAssTime, hexToAssColor, wrapCueText } from './ass';

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
      DEFAULT_SUBTITLE_STYLE,
    );
    expect(ass).toContain('PlayResX: 1080');
    expect(ass).toContain('PlayResY: 1920');
    const dialogues = ass.split('\n').filter((l) => l.startsWith('Dialogue:'));
    expect(dialogues).toHaveLength(2);
    expect(dialogues[0]).toBe('Dialogue: 0,0:00:01.00,0:00:02.50,Default,,0,0,0,,first');
  });

  it('drops empty and inverted cues, escapes braces, applies uppercase', () => {
    const ass = buildAss(
      [
        { id: '1', start: 1, end: 2, text: '{hi} there' },
        { id: '2', start: 3, end: 2, text: 'bad timing' },
        { id: '3', start: 4, end: 5, text: '   ' },
      ],
      { ...DEFAULT_SUBTITLE_STYLE, uppercase: true },
    );
    const dialogues = ass.split('\n').filter((l) => l.startsWith('Dialogue:'));
    expect(dialogues).toHaveLength(1);
    expect(dialogues[0]).toContain('\\{HI\\} THERE');
  });
});
