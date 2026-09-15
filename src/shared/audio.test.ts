import { buildAudioMixFilter, defaultAudioSelection, formatTrackList } from './audio';
import type { VideoInfo } from './types';


const track = (index: number): VideoInfo['audioTracks'][number] => ({
  index,
  codec: 'aac',
  channels: 2,
  sampleRate: 48000,
  label: null,
});

const info = (n: number): VideoInfo => ({
  path: 'x.mp4',
  fileName: 'x.mp4',
  width: 1920,
  height: 1080,
  duration: 10,
  fps: 30,
  videoCodec: 'h264',
  audioTracks: Array.from({ length: n }, (_, i) => track(i)),
});

describe('defaultAudioSelection', () => {
  it('selects every track for both pipelines', () => {
    expect(defaultAudioSelection(info(3))).toEqual({
      transcribeTracks: [0, 1, 2],
      exportTracks: [0, 1, 2],
    });
  });

  it('is empty for a silent clip', () => {
    expect(defaultAudioSelection(info(0))).toEqual({ transcribeTracks: [], exportTracks: [] });
  });
});

describe('buildAudioMixFilter', () => {
  const opts = { silenceDuration: 4.5 };

  it('synthesises silence when nothing is selected', () => {
    expect(buildAudioMixFilter(0, [], 'a', opts)).toBe('anullsrc=r=48000:cl=stereo:d=4.500[a]');
    expect(buildAudioMixFilter(0, [], 'a', { ...opts, mono: true })).toBe(
      'anullsrc=r=16000:cl=mono:d=4.500[a]',
    );
  });

  it('formats a single track without mixing', () => {
    expect(buildAudioMixFilter(1, [2], 'aout', opts)).toBe(
      '[1:a:2]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[aout]',
    );
  });

  it('mixes several tracks with normalisation off and a limiter', () => {
    const fc = buildAudioMixFilter(0, [0, 2], 'amain', opts);
    expect(fc).toBe(
      '[0:a:0]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[amain_0];' +
        '[0:a:2]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[amain_1];' +
        '[amain_0][amain_1]amix=inputs=2:normalize=0,alimiter=limit=0.95[amain]',
    );
  });

  it('uses mono 16 kHz for the speech path', () => {
    const fc = buildAudioMixFilter(0, [0, 1], 'a', { ...opts, mono: true });
    expect(fc).toContain('sample_rates=16000:channel_layouts=mono');
    expect(fc).toContain('amix=inputs=2');
  });
});

describe('formatTrackList', () => {
  it('shows 1-based indices', () => {
    expect(formatTrackList([0, 2])).toBe('1+3');
    expect(formatTrackList([])).toBe('none');
  });
});
