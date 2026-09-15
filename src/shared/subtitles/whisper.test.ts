import { parseWhisperJson, parseWhisperProgressLine } from './whisper';

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

  it('throws on garbage', () => {
    expect(() => parseWhisperJson({ nope: true })).toThrow();
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
