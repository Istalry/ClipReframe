import type { SubtitleCue } from '../types';

import {
  cleanupCues,
  collapseRepeatedPhrases,
  isImplausible,
  isNonSpeech,
  normalizeTypography,
} from './cleanup';

const cue = (start: number, end: number, text: string, id = `${start}`): SubtitleCue => ({
  id,
  start,
  end,
  text,
});

describe('isNonSpeech', () => {
  it.each(['[Musique]', '(rires)', '*applaudissements*', '♪ ♪', '...', '', '   ', '[Music] ...'])(
    'flags %j',
    (text) => {
      expect(isNonSpeech(text)).toBe(true);
    },
  );

  it.each(['Bonjour', '[Musique] bonjour', 'ok...'])('keeps %j', (text) => {
    expect(isNonSpeech(text)).toBe(false);
  });
});

describe('collapseRepeatedPhrases', () => {
  it('collapses a single word repeated', () => {
    expect(collapseRepeatedPhrases('merci merci merci merci')).toBe('merci');
  });

  it('collapses a multi-word phrase repeated', () => {
    expect(collapseRepeatedPhrases("c'est parti c'est parti c'est parti allez")).toBe(
      "c'est parti allez",
    );
  });

  it('keeps short interjections twice', () => {
    expect(collapseRepeatedPhrases('ha ha ha ha ha ha')).toBe('ha ha');
  });

  it('leaves a phrase repeated only twice alone', () => {
    expect(collapseRepeatedPhrases('non non je veux pas')).toBe('non non je veux pas');
  });

  it('is case and accent insensitive', () => {
    expect(collapseRepeatedPhrases('Été été ÉTÉ')).toBe('Été');
  });
});

describe('normalizeTypography', () => {
  it('applies French spacing and collapses whitespace', () => {
    expect(normalizeTypography('  ça  va?ok !  bien,merci...')).toBe('ça va ? ok ! bien, merci…');
  });
});

describe('isImplausible', () => {
  it('flags too-long, too-short, inverted and too-fast cues', () => {
    expect(isImplausible(cue(0, 20, 'x'))).toBe(true);
    expect(isImplausible(cue(0, 0.05, 'x'))).toBe(true);
    expect(isImplausible(cue(5, 2, 'x'))).toBe(true);
    expect(isImplausible(cue(0, 1, 'a'.repeat(80)))).toBe(true);
  });

  it('keeps a normal cue', () => {
    expect(isImplausible(cue(0, 2.5, 'Bonjour à tous, bienvenue'))).toBe(false);
  });
});

describe('cleanupCues', () => {
  it('drops loops, markers and duplicates and reports the count', () => {
    const input = [
      cue(0, 1, '[Musique]'),
      cue(1, 3, 'Bonjour à tous'),
      cue(3, 5, 'bonjour à tous.'),
      cue(5, 7, 'On y va on y va on y va on y va'),
      cue(7, 8, 'Sous-titres réalisés par la communauté'),
      cue(8, 30, 'trop long'),
    ];
    const { cues, removedCount } = cleanupCues(input);
    expect(cues.map((c) => c.text)).toEqual([
      'Bonjour à tous',
      'On y va',
      'Sous-titres réalisés par la communauté',
    ]);
    expect(removedCount).toBe(3);
  });

  it('respects disabled options', () => {
    const input = [cue(1, 3, 'ok'), cue(3, 5, 'ok')];
    const { cues } = cleanupCues(input, {
      dropNonSpeech: false,
      collapseRepeats: false,
      dropConsecutiveDuplicates: false,
      dropImplausible: false,
      normalizeTypography: false,
    });
    expect(cues).toHaveLength(2);
  });

  it('preserves ids and timings of kept cues', () => {
    const { cues } = cleanupCues([cue(1.25, 3.5, '  Salut  ', 'abc')]);
    expect(cues).toEqual([{ id: 'abc', start: 1.25, end: 3.5, text: 'Salut' }]);
  });
});
