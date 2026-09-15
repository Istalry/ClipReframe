import { parseWhisperJson, parseWhisperProgressLine, tokensToWords } from './whisper';

describe('parseWhisperJson', () => {
  it('maps segments to cues in seconds and trims text', () => {
    const { cues, language } = parseWhisperJson({
      result: { language: 'fr' },
      transcription: [
        {
          timestamps: { from: '00:00:00,000', to: '00:00:02,500' },
          offsets: { from: 0, to: 2500 },
          text: ' Bonjour à tous ',
        },
        { offsets: { from: 2500, to: 4000 }, text: 'ça va ?' },
      ],
    });
    expect(language).toBe('fr');
    expect(cues).toEqual([
      { id: 'w0', start: 0, end: 2.5, text: 'Bonjour à tous' },
      { id: 'w1', start: 2.5, end: 4, text: 'ça va ?' },
    ]);
  });

  it('tolerates a missing result block', () => {
    expect(parseWhisperJson({ transcription: [] })).toEqual({ cues: [], language: null });
  });

  it('attaches word timings when tokens are present', () => {
    const { cues } = parseWhisperJson({
      transcription: [
        {
          offsets: { from: 0, to: 1500 },
          text: ' Hello everyone, hi',
          tokens: [
            { text: '[_BEG_]', offsets: { from: 0, to: 0 } },
            { text: ' Hello', offsets: { from: 150, to: 460 } },
            { text: ' every', offsets: { from: 460, to: 800 } },
            { text: 'one', offsets: { from: 800, to: 1030 } },
            { text: ',', offsets: { from: 1400, to: 1400 } },
            { text: ' hi' },
            { text: '[_TT_75]', offsets: { from: 1500, to: 1500 } },
          ],
        },
        { offsets: { from: 1500, to: 2000 }, text: 'no tokens', tokens: [] },
      ],
    });
    expect(cues[0]?.words).toEqual([
      { start: 0.15, end: 0.46, text: 'Hello' },
      { start: 0.46, end: 1.4, text: 'everyone,' },
    ]);
    expect(cues[1]).not.toHaveProperty('words');
  });

  it('throws on garbage', () => {
    expect(() => parseWhisperJson({ nope: true })).toThrow();
  });
});

describe('tokensToWords', () => {
  it('starts a word on a leading space and drops empty results', () => {
    expect(
      tokensToWords([
        { text: '?', offsets: { from: 0, to: 100 } },
        { text: ' ', offsets: { from: 100, to: 100 } },
        { text: ' ça', offsets: { from: 200, to: 300 } },
      ]),
    ).toEqual([
      { start: 0, end: 0.1, text: '?' },
      { start: 0.2, end: 0.3, text: 'ça' },
    ]);
    expect(tokensToWords([])).toEqual([]);
  });
});

describe('parseWhisperProgressLine', () => {
  it('extracts the percentage', () => {
    expect(parseWhisperProgressLine('whisper_print_progress_callback: progress =  42%')).toBe(0.42);
    expect(parseWhisperProgressLine('progress = 100%')).toBe(1);
  });

  it('returns null for other lines', () => {
    expect(
      parseWhisperProgressLine('whisper_init_from_file_with_params_no_state: loading model'),
    ).toBeNull();
  });
});
