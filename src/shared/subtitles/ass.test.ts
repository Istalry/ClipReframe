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
  it('puts the box colour in OutlineColour with fixed padding for a background box', () => {
    const line = buildAssStyleLine({
      ...DEFAULT_SUBTITLE_STYLE,
      backgroundBox: true,
      backgroundColor: '#102030',
      outlineColor: '#ff0000',
      outlineWidth: 12,
    });
    const fields = line.replace('Style: ', '').split(',');
    // libass fills a BorderStyle 3 box with OutlineColour (not BackColour) padded by Outline.
    expect(fields.slice(5, 7)).toEqual(['&H33302010', '&H400000FF']);
    expect(fields.slice(15, 17)).toEqual(['3', '4']);
    expect(
      buildAssStyleLine({ ...DEFAULT_SUBTITLE_STYLE, backgroundBox: true }, 'Pill', 0),
    ).toMatch(/^Style: Pill,.*,&H00000000,&H40000000,/);
  });

  it('keeps the outline colour and width for an outlined style', () => {
    const line = buildAssStyleLine({
      ...DEFAULT_SUBTITLE_STYLE,
      backgroundBox: false,
      outlineColor: '#ff0000',
      outlineWidth: 12,
    });
    const fields = line.replace('Style: ', '').split(',');
    expect(fields[5]).toBe('&H000000FF');
    expect(fields.slice(15, 17)).toEqual(['1', '12']);
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
  const styles = (ass: string): string[] => ass.split('\n').filter((l) => l.startsWith('Style:'));

  it('emits one event per word interval covering the whole cue (colour mode)', () => {
    const lines = dialogues(
      buildAss([cue], { ...PLAIN, highlightMode: 'color', highlightColor: '#a970ff' }),
    );
    expect(lines).toEqual([
      'Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\1c&H00FF70A9&}un{\\1c&H00FFFFFF&} deux trois',
      'Dialogue: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,un {\\1c&H00FF70A9&}deux{\\1c&H00FFFFFF&} trois',
      'Dialogue: 0,0:00:03.00,0:00:04.00,Default,,0,0,0,,un deux {\\1c&H00FF70A9&}trois{\\1c&H00FFFFFF&}',
    ]);
  });

  it('recolours the outline in outline mode and restores it explicitly', () => {
    const lines = dialogues(buildAss([cue], { ...PLAIN, highlightMode: 'outline' }));
    expect(lines[1]).toContain('un {\\3c&H00FF70A9&}deux{\\3c&H00000000&} trois');
  });

  it('keeps the box padding on colour events of a background-box style', () => {
    const lines = dialogues(
      buildAss([cue], { ...PLAIN, highlightMode: 'color', backgroundBox: true }),
    );
    expect(lines[1]).toBe(
      'Dialogue: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,{\\xbord10}un {\\1c&H00FF70A9&}deux{\\1c&H00FFFFFF&} trois',
    );
  });

  it('draws an opaque pill box under the outlined text in box mode', () => {
    const ass = buildAss([cue], { ...PLAIN, highlightMode: 'box', fontSize: 64 });
    // The pill is a BorderStyle 3 box in the highlight colour with the same font metrics.
    expect(styles(ass)).toEqual([
      'Style: Default,Arial,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H40000000,-1,0,0,0,100,100,0,0,1,4,0,2,40,40,260,1',
      'Style: Pill,Arial,64,&H00FFFFFF,&H00FFFFFF,&H00FF70A9,&H40000000,-1,0,0,0,100,100,0,0,3,4,0,2,40,40,260,1',
    ]);
    const lines = dialogues(ass);
    expect(lines).toHaveLength(6);
    expect(lines[2]).toBe(
      'Dialogue: 0,0:00:02.00,0:00:03.00,Pill,,0,0,0,,{\\alpha&HFF&\\xbord12\\ybord0}un {\\alpha&H00&}deux{\\alpha&HFF&} trois',
    );
    expect(lines[3]).toBe('Dialogue: 1,0:00:02.00,0:00:03.00,Default,,0,0,0,,un deux trois');
  });

  it('draws the pill over the line box on a background-box base', () => {
    const ass = buildAss([cue], { ...PLAIN, highlightMode: 'box', backgroundBox: true });
    expect(
      styles(ass).map((l) =>
        l
          .split(',')
          .slice(0, 1)
          .concat(l.split(',')[5] ?? ''),
      ),
    ).toEqual([
      ['Style: Default', '&H33000000'],
      ['Style: Pill', '&H00FF70A9'],
    ]);
    const lines = dialogues(ass);
    expect(lines).toHaveLength(6);
    expect(lines[2]).toBe(
      'Dialogue: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,{\\xbord10}un deux trois',
    );
    expect(lines[3]).toBe(
      'Dialogue: 1,0:00:02.00,0:00:03.00,Pill,,0,0,0,,{\\alpha&HFF&\\xbord10}un {\\alpha&H00&}deux{\\alpha&HFF&} trois',
    );
  });

  it('emits no extra styles for the other modes', () => {
    for (const highlightMode of ['none', 'color', 'outline'] as const) {
      expect(styles(buildAss([cue], { ...PLAIN, highlightMode }))).toHaveLength(1);
    }
  });

  it('falls back to a plain padded event for outline mode on a box style', () => {
    const lines = dialogues(
      buildAss([cue], { ...PLAIN, highlightMode: 'outline', backgroundBox: true }),
    );
    expect(lines).toEqual([
      'Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,{\\xbord10}un deux trois',
    ]);
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
    expect(lines[1]).toContain(',AA {\\1c&H00FF70A9&}\\{BB\\}{\\1c&H00FFFFFF&}\\NCC');
  });
});
